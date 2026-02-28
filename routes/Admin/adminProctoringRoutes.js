const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { sql, poolPromise } = require("../../db");

const router = express.Router();
const { verifyToken, teacherOnly } = require("../middleware/authMiddleware");
const PROCTORING_UPLOAD_DIR = path.join(__dirname, "../../uploads/proctoring");

const toIntArray = (value) => {
  if (!Array.isArray(value)) return [];

  const seen = new Set();

  return value
    .map((item) => parseInt(item, 10))
    .filter((num) => Number.isInteger(num) && num > 0 && !seen.has(num) && seen.add(num));
};

const cleanupFiles = async (paths = []) => {
  const files = paths
    .filter(Boolean)
    .map((file) => path.join(PROCTORING_UPLOAD_DIR, path.basename(file)));

  await Promise.allSettled(
    files.map(async (filePath) => {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error(`Failed to remove file ${filePath}:`, err.message);
        }
      }
    })
  );
};

/**
 * ==========================================
 * GET PROCTORING SUMMARY
 * ==========================================
 * Teacher sees all suspicious activities
 */
router.get("/summary", verifyToken, teacherOnly, async (req, res) => {

  try {

    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
          P.LogId,
          P.StudentId,
          S.Name AS StudentName,
          S.Email,

          P.ExamId,
          E.ExamName,

          P.EventType,
          P.ImagePath,
          P.VideoPath,
          P.CreatedAt

      FROM  ExamProctoringLogs P
      INNER JOIN Students S ON P.StudentId = S.StudentId
      INNER JOIN Exams E ON P.ExamId = E.ExamId
      ORDER BY P.CreatedAt DESC
    `);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});

/**
 * ==========================================
 * STUDENT CHEATING COUNT
 * ==========================================
 */
router.get("/counts", verifyToken, teacherOnly, async (req, res) => {

  try {

    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
          StudentId,
          COUNT(*) AS TotalEvents
      FROM ExamProctoringLogs
      GROUP BY StudentId
      ORDER BY TotalEvents DESC
    `);

    res.json(result.recordset);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }

});

/**
 * ==========================================
 * DELETE SINGLE PROCTORING LOG
 * ==========================================
 */
router.delete("/logs/:id", verifyToken, teacherOnly, async (req, res) => {

  const logId = parseInt(req.params.id, 10);

  if (!Number.isInteger(logId) || logId <= 0) {
    return res.status(400).json({ success: false, error: "Valid log id is required" });
  }

  let transaction;

  try {

    const pool = await poolPromise;

    transaction = new sql.Transaction(pool);

    await transaction.begin();

    const existing = await transaction.request()
      .input("logId", sql.Int, logId)
      .query(`
        SELECT LogId, ImagePath, VideoPath
        FROM ExamProctoringLogs
        WHERE LogId = @logId
      `);

    if (!existing.recordset.length) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: "Proctoring log not found" });
    }

    await transaction.request()
      .input("logId", sql.Int, logId)
      .query(`
        DELETE FROM ExamProctoringLogs
        WHERE LogId = @logId
      `);

    await transaction.commit();

    const { ImagePath, VideoPath } = existing.recordset[0];
    await cleanupFiles([ImagePath, VideoPath]);

    res.json({ success: true, message: "Proctoring log deleted successfully" });

  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    res.status(500).json({ success: false, error: error.message });
  }

});

/**
 * ==========================================
 * BULK DELETE PROCTORING LOGS
 * ==========================================
 */
router.delete("/logs", verifyToken, teacherOnly, async (req, res) => {

  const logIds = toIntArray(req.body?.logIds);

  if (!logIds.length) {
    return res.status(400).json({ success: false, error: "logIds[] is required" });
  }

  let transaction;

  try {

    const pool = await poolPromise;

    transaction = new sql.Transaction(pool);

    await transaction.begin();

    const request = transaction.request();
    const placeholders = logIds.map((id, i) => {
      const key = `logId${i}`;
      request.input(key, sql.Int, id);
      return `@${key}`;
    });

    const logsResult = await request.query(`
      SELECT LogId, ImagePath, VideoPath
      FROM ExamProctoringLogs
      WHERE LogId IN (${placeholders.join(",")})
    `);

    if (!logsResult.recordset.length) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: "No proctoring logs found for provided ids" });
    }

    const deleteRequest = transaction.request();

    placeholders.forEach((_, i) => {
      deleteRequest.input(`logId${i}`, sql.Int, logIds[i]);
    });

    await deleteRequest.query(`
      DELETE FROM ExamProctoringLogs
      WHERE LogId IN (${placeholders.join(",")})
    `);

    await transaction.commit();

    const filePaths = logsResult.recordset.flatMap((log) => [log.ImagePath, log.VideoPath]);
    await cleanupFiles(filePaths);

    res.json({
      success: true,
      deletedCount: logsResult.recordset.length,
      message: `${logsResult.recordset.length} proctoring logs deleted successfully`
    });

  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    res.status(500).json({ success: false, error: error.message });
  }

});

module.exports = router;
