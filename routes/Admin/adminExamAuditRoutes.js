const express = require('express');
const { sql, poolPromise } = require('../../db');

const router = express.Router();
const { verifyToken, teacherOnly } = require("../middleware/authMiddleware");

const toIntArray = (value) => {
  if (!Array.isArray(value)) return [];

  const seen = new Set();

  return value
    .map((item) => parseInt(item, 10))
    .filter((num) => Number.isInteger(num) && num > 0 && !seen.has(num) && seen.add(num));
};
/**
 * @swagger
 * /api/admin/exam-audit/audit-summary:
 *   get:
 *     summary: Get exam audit summary (NO question details)
 *     tags: [Admin Audit]
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: examId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Audit summary list
 */

router.get('/audit-summary', verifyToken,teacherOnly, async (req, res) => {

  try {

    const { studentId, examId } = req.query;

    const pool = await poolPromise;

    const request = pool.request();

    let query = `
    SELECT
        ER.ResultId,

        S.StudentId,
        S.Name AS StudentName,
        S.Email,

        E.ExamId,
        E.ExamName,
        E.TotalMarks,

        ER.Score,
        ER.SubmittedAt,

        ER.WarningCount,
        ER.WarningReasons,

        ER.SubmissionType,
        ER.SubmissionSource,
        ER.IsAutoSubmitted,

        ER.IPAddress,
        ER.DeviceInfo,
        ER.BrowserInfo,

        ER.ExamStartTime,
        ER.ExamEndTime

    FROM ExamResults ER

    INNER JOIN Students S ON ER.StudentId = S.StudentId
    INNER JOIN Exams E ON ER.ExamId = E.ExamId

    WHERE 1=1
    `;

    if (studentId) {
      query += ` AND ER.StudentId = @studentId`;
      request.input("studentId", sql.Int, studentId);
    }

    if (examId) {
      query += ` AND ER.ExamId = @examId`;
      request.input("examId", sql.Int, examId);
    }

    query += ` ORDER BY ER.ResultId DESC`;

    const result = await request.query(query);

    res.json({
      success: true,
      count: result.recordset.length,
      data: result.recordset
    });

  }
  catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});
/**
 * @swagger
 * /api/admin/exam-audit/audit-detail:
 *   get:
 *     summary: Get exam audit detail (WITH questions and answers)
 *     tags: [Admin Audit]
 *     parameters:
 *       - in: query
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Audit summary list
 */

router.get('/audit-detail', verifyToken,teacherOnly, async (req, res) => {

  try {

    const { studentId, examId } = req.query;

    if (!studentId || !examId)
      return res.status(400).json({
        success: false,
        error: "studentId and examId required"
      });

    const pool = await poolPromise;

    const result = await pool.request()
      .input("studentId", sql.Int, studentId)
      .input("examId", sql.Int, examId)
      .query(`

        SELECT
            ER.ResultId,
            S.StudentId,
            S.Name AS StudentName,
            S.Email,
            E.ExamId,
            E.ExamName,
            E.TotalMarks,
            ER.Score,
            ER.SubmittedAt,
            ER.WarningCount,
            ER.WarningReasons,
            ER.SubmissionType,
            ER.SubmissionSource,
            ER.IsAutoSubmitted,
            ER.IPAddress,
            ER.DeviceInfo,
            ER.BrowserInfo,
            ER.ExamStartTime,
            ER.ExamEndTime
        FROM ExamResults ER
        INNER JOIN Students S ON ER.StudentId = S.StudentId
        INNER JOIN Exams E ON ER.ExamId = E.ExamId
        WHERE ER.StudentId = @studentId
        AND ER.ExamId = @examId;


        SELECT
            Q.QuestionId,
            Q.QuestionText,
            ES.SelectedOption,
            ES.CorrectOption,
            ES.IsCorrect,
            ES.MarksAwarded
        FROM ExamSubmissions ES
        INNER JOIN Questions Q ON ES.QuestionId = Q.QuestionId
        WHERE ES.StudentId = @studentId
        AND ES.ExamId = @examId
        ORDER BY Q.QuestionId;

      `);

    res.json({
      success: true,
      examDetail: result.recordsets[0],
      questionDetail: result.recordsets[1]
    });

  }
  catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});

/**
 * ==========================================
 * DELETE SINGLE AUDIT LOG (RESULT + SUBMISSIONS)
 * ==========================================
 */
router.delete('/logs/:id', verifyToken, teacherOnly, async (req, res) => {

  const resultId = parseInt(req.params.id, 10);

  if (!Number.isInteger(resultId) || resultId <= 0) {
    return res.status(400).json({ success: false, error: "Valid result id is required" });
  }

  let transaction;

  try {

    const pool = await poolPromise;

    transaction = new sql.Transaction(pool);

    await transaction.begin();

    const resultDetail = await transaction.request()
      .input("resultId", sql.Int, resultId)
      .query(`
        SELECT ResultId, StudentId, ExamId
        FROM ExamResults
        WHERE ResultId = @resultId
      `);

    if (!resultDetail.recordset.length) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: "Audit log not found" });
    }

    const { StudentId, ExamId } = resultDetail.recordset[0];

    await transaction.request()
      .input("studentId", sql.Int, StudentId)
      .input("examId", sql.Int, ExamId)
      .query(`
        DELETE FROM ExamSubmissions
        WHERE StudentId = @studentId AND ExamId = @examId
      `);

    await transaction.request()
      .input("resultId", sql.Int, resultId)
      .query(`
        DELETE FROM ExamResults
        WHERE ResultId = @resultId
      `);

    await transaction.commit();

    res.json({ success: true, message: "Audit log deleted successfully" });

  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    res.status(500).json({ success: false, error: error.message });
  }

});

/**
 * ==========================================
 * BULK DELETE AUDIT LOGS (RESULTS + SUBMISSIONS)
 * ==========================================
 */
router.delete('/logs', verifyToken, teacherOnly, async (req, res) => {

  const resultIds = toIntArray(req.body?.resultIds);

  if (!resultIds.length) {
    return res.status(400).json({ success: false, error: "resultIds[] is required" });
  }

  let transaction;

  try {

    const pool = await poolPromise;

    transaction = new sql.Transaction(pool);

    await transaction.begin();

    const selectRequest = transaction.request();
    const placeholders = resultIds.map((id, i) => {
      const key = `resultId${i}`;
      selectRequest.input(key, sql.Int, id);
      return `@${key}`;
    });

    const existingRows = await selectRequest.query(`
      SELECT ResultId, StudentId, ExamId
      FROM ExamResults
      WHERE ResultId IN (${placeholders.join(",")})
    `);

    if (!existingRows.recordset.length) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: "No audit logs found for provided ids" });
    }

    const deleteSubmissionsRequest = transaction.request();

    placeholders.forEach((_, i) => {
      deleteSubmissionsRequest.input(`resultId${i}`, sql.Int, resultIds[i]);
    });

    await deleteSubmissionsRequest.query(`
      DELETE ES
      FROM ExamSubmissions ES
      INNER JOIN ExamResults ER
        ON ER.StudentId = ES.StudentId
        AND ER.ExamId = ES.ExamId
      WHERE ER.ResultId IN (${placeholders.join(",")})
    `);

    const deleteResultsRequest = transaction.request();

    placeholders.forEach((_, i) => {
      deleteResultsRequest.input(`resultId${i}`, sql.Int, resultIds[i]);
    });

    await deleteResultsRequest.query(`
      DELETE FROM ExamResults
      WHERE ResultId IN (${placeholders.join(",")})
    `);

    await transaction.commit();

    res.json({
      success: true,
      deletedCount: existingRows.recordset.length,
      message: `${existingRows.recordset.length} audit logs deleted successfully`
    });

  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    res.status(500).json({ success: false, error: error.message });
  }

});
module.exports = router;
