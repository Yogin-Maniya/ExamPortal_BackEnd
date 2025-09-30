const express = require('express');
const { sql, poolPromise } = require('../../db');
const router = express.Router();

/**
 * @swagger
 * /api/results/submit:
 *   post:
 *     summary: Submit exam result for a student
 *     tags: [Results]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - examId
 *               - score
 *             properties:
 *               studentId:
 *                 type: integer
 *                 description: ID of the student
 *               examId:
 *                 type: integer
 *                 description: ID of the exam
 *               score:
 *                 type: integer
 *                 description: Score obtained by the student
 *     responses:
 *       200:
 *         description: Result recorded successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/submit', async (req, res) => {
  try {
    const { studentId, examId, score } = req.body;

    if (!studentId || !examId || score === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const pool = await poolPromise;
    await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('examId', sql.Int, examId)
      .input('score', sql.Int, score)
      .query(`INSERT INTO ExamResults (StudentId, ExamId, Score) VALUES (@studentId, @examId, @score)`);

    res.json({ message: "Result recorded successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/results/{studentId}:
 *   get:
 *     summary: Get exam results for a specific student
 *     tags: [Results]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the student
 *     responses:
 *       200:
 *         description: List of exam results with exam name, total marks, and pass/fail status
 *       500:
 *         description: Internal server error
 */
router.get('/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('studentId', sql.Int, studentId)
      .query(`
        SELECT 
          ER.ResultId, 
          ER.StudentId, 
          ER.ExamId, 
          E.ExamName, 
          E.TotalMarks, 
          ER.Score, 
          ER.SubmittedAt,
          CASE 
            WHEN ER.Score >= (E.TotalMarks * 0.4) THEN 'Pass'
            ELSE 'Fail'
          END AS PassFailStatus
        FROM ExamResults ER
        JOIN Exams E ON ER.ExamId = E.ExamId
        WHERE ER.StudentId = @studentId
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching exam results:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
