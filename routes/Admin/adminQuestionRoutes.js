const express = require('express');
const { sql, poolPromise } = require('../../db');
const router = express.Router();
const { verifyToken, teacherOnly } = require("../middleware/authMiddleware");
/**
 * @swagger
 * /api/admin/question/{examId}/questions:
 *   post:
 *     summary: Add multiple questions to an exam
 *     tags: [Question]
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Exam ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionText:
 *                       type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                     correctOption:
 *                       type: integer
 *                       description: 0-based index of the correct option
 *     responses:
 *       200:
 *         description: Questions added successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */
router.post('/:examId/questions',  verifyToken,teacherOnly,async (req, res) => {
  try {
    const { examId } = req.params;
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "Questions array is required." });
    }

    const pool = await poolPromise;
    const letters = ['A', 'B', 'C', 'D', 'E'];

    for (const q of questions) {
      const optionA = q.options[0];
      const optionB = q.options[1];
      const optionC = q.options[2];
      const optionD = q.options[3];
      const optionE = q.options.length > 4 ? q.options[4] : null;
      let correctOption = letters[q.correctOption] || 'A';

      await pool.request()
        .input('examId', sql.Int, examId)
        .input('questionText', sql.NVarChar, q.questionText)
        .input('optionA', sql.NVarChar, optionA)
        .input('optionB', sql.NVarChar, optionB)
        .input('optionC', sql.NVarChar, optionC)
        .input('optionD', sql.NVarChar, optionD)
        .input('optionE', sql.NVarChar, optionE)
        .input('correctOption', sql.NVarChar, correctOption)
        .query(`
          INSERT INTO Questions (ExamId, QuestionText, OptionA, OptionB, OptionC, OptionD, OptionE, CorrectOption) 
          VALUES (@examId, @questionText, @optionA, @optionB, @optionC, @optionD, @optionE, @correctOption)
        `);
    }
    res.json({ message: "Questions added successfully" });
  } catch (error) {
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/question/{examId}:
 *   get:
 *     summary: Get all questions for a specific exam
 *     tags: [Question]
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Exam ID
 *     responses:
 *       200:
 *         description: List of questions
 *       500:
 *         description: Internal server error
 */
router.get('/:examId', verifyToken,teacherOnly, async (req, res) => {
  try {
    const { examId } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('examId', sql.Int, examId)
      .query('SELECT * FROM Questions WHERE ExamId = @examId');
    res.json(result.recordset);
  } catch (error) {
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/question/{id}:
 *   delete:
 *     summary: Delete a question by Question ID
 *     tags: [Question]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Question deleted successfully
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', verifyToken,teacherOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Questions WHERE QuestionId = @id');
    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/question/{examId}/questions/{questionId}:
 *   get:
 *     summary: Get a specific question by ExamId and QuestionId
 *     tags: [Question]
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Question details
 *       404:
 *         description: Question not found
 *       500:
 *         description: Internal server error
 */
router.get('/:examId/questions/:questionId', verifyToken,teacherOnly, async (req, res) => {
  try {
    const { examId, questionId } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('examId', sql.Int, examId)
      .input('questionId', sql.Int, questionId)
      .query('SELECT * FROM Questions WHERE ExamId = @examId AND QuestionId = @questionId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/question/{examId}/question/{questionId}:
 *   put:
 *     summary: Update a question
 *     tags: [Question]
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               questionText:
 *                 type: string
 *               optionA:
 *                 type: string
 *               optionB:
 *                 type: string
 *               optionC:
 *                 type: string
 *               optionD:
 *                 type: string
 *               optionE:
 *                 type: string
 *               correctOption:
 *                 type: string
 *                 description: "'A' to 'E'"
 *     responses:
 *       200:
 *         description: Question updated successfully
 *       500:
 *         description: Internal server error
 */

router.put('/:examId/question/:questionId',  verifyToken,teacherOnly,async (req, res) => {
  try {
    const { examId, questionId } = req.params;
    const { questionText, optionA, optionB, optionC, optionD, optionE, correctOption } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('examId', sql.Int, examId)
      .input('questionId', sql.Int, questionId)
      .input('questionText', sql.NVarChar, questionText)
      .input('optionA', sql.NVarChar, optionA)
      .input('optionB', sql.NVarChar, optionB)
      .input('optionC', sql.NVarChar, optionC)
      .input('optionD', sql.NVarChar, optionD)
      .input('optionE', sql.NVarChar, optionE)
      .input('correctOption', sql.NVarChar, correctOption)
      .query(`
        UPDATE Questions 
        SET QuestionText = @questionText, 
            OptionA = @optionA, 
            OptionB = @optionB, 
            OptionC = @optionC, 
            OptionD = @optionD, 
            OptionE = @optionE, 
            CorrectOption = @correctOption 
        WHERE ExamId = @examId AND QuestionId = @questionId
      `);
    res.json({ message: "Question updated successfully" });
  } catch (error) {
    throw error;
  }
});
module.exports = router;
