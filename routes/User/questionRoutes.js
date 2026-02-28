const express = require('express');
const { sql, poolPromise } = require('../../db');
const router = express.Router();
const {verifyToken,studentOnly} = require("../middleware/authMiddleware");
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
router.get('/:examId',verifyToken,studentOnly, async (req, res) => {
  try {
    const { examId } = req.params;
    const pool = await poolPromise;
     const result = await pool.request()
      .input('examId', sql.Int, examId)
      .query(`
        SELECT
          QuestionId,
          ExamId,
          QuestionText,
          OptionA,
          OptionB,
          OptionC,
          OptionD,
          OptionE
        FROM Questions
        WHERE ExamId = @examId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "No questions found for this exam" });
    }

    res.json(result.recordset);
  } catch (error) {
    throw error;
  }
});
module.exports = router;
