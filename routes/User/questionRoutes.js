const express = require('express');
const { sql, poolPromise } = require('../../db');
const router = express.Router();
const { decryptId } = require("../utils/encryption");
/**
 * @swagger
 * /api/questions/{examId}:
 *   get:
 *     summary: Get all questions for a specific exam
 *     tags: [Questions]
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the exam
 *     responses:
 *       200:
 *         description: List of questions for the exam
 *       404:
 *         description: No questions found
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
  try {
    const { examId: encryptedId } = req.query;
      if (!encryptedId) return res.status(400).json({ message: "Exam ID required" });

       let examId = parseInt(encryptedId, 10); // fallback numeric
    if (isNaN(examId)) {
      try {
        examId = parseInt(decryptId(decodeURIComponent(encryptedId)), 10);
      } catch (err) {
        return res.status(400).json({ message: "Invalid exam ID" });
      }
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('examId', sql.Int, examId)
      .query('SELECT * FROM Questions WHERE ExamId = @examId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "No questions found for this exam" });
    }

    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
