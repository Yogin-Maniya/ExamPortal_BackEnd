const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { sql, poolPromise } = require("../../db");
const { verifyToken, studentOnly } = require("../middleware/authMiddleware");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../uploads/proctoring");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// ============================
// SAVE PROCTORING EVENT
// ============================
router.post(
  "/upload",
  verifyToken,
  studentOnly,
  upload.fields([
    { name: "image" },
    { name: "video" }
  ]),
  async (req, res) => {

    try {

      const studentId = req.user?.studentId;
      const examId = parseInt(req.body.examId, 10);
      const eventType = req.body.eventType || "Unknown";

      if (!studentId || !examId) {
        return res.status(400).json({ error: "studentId or examId missing" });
      }

      const imagePath = req.files?.image?.[0]?.filename || null;
      const videoPath = req.files?.video?.[0]?.filename || null;

      const pool = await poolPromise;

      await pool.request()
        .input("studentId", sql.Int, studentId)
        .input("examId", sql.Int, examId)
        .input("eventType", sql.VarChar(100), eventType)
        .input("imagePath", sql.NVarChar(500), imagePath)
        .input("videoPath", sql.NVarChar(500), videoPath)
        .query(`
          INSERT INTO ExamProctoringLogs
          (StudentId, ExamId, EventType, ImagePath, VideoPath)
          VALUES
          (@studentId,@examId,@eventType,@imagePath,@videoPath)
        `);

      res.json({ message: "Proctoring log saved" });

    } catch (err) {

      res.status(500).json({
        error: err.message
      });

    }

  }
);

module.exports = router;
