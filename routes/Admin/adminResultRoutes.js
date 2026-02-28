const express = require('express');
const { sql, poolPromise } = require('../../db');
const { verifyToken, teacherOnly } = require("../middleware/authMiddleware");
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Result
 *   description: Admin Result Management APIs
 */


/**
 * @swagger
 * /api/admin/result:
 *   get:
 *     summary: Get all exam results
 *     tags: [Result]
 *     responses:
 *       200:
 *         description: List of all exam results
 *       500:
 *         description: Internal server error
 */
router.get('/', verifyToken,teacherOnly, async (req, res) => {

  try {

    const pool = await poolPromise;

    const result = await pool.request()
      .query('SELECT * FROM ExamResults ORDER BY ResultId DESC');

    res.json(result.recordset);

  }
  catch (error) {

    throw error;

  }

});


/**
 * @swagger
 * /api/admin/result/details:
 *   get:
 *     summary: Get detailed exam submissions with optional filters
 *     tags: [Result]
 *     parameters:
 *       - in: query
 *         name: studentId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filter by Student ID
 *       - in: query
 *         name: examId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filter by Exam ID
 *     responses:
 *       200:
 *         description: Detailed submission list
 *       500:
 *         description: Internal server error
 */
router.get('/details', verifyToken,teacherOnly, async (req, res) => {

  try {

    const { studentId, examId } = req.query;

    const pool = await poolPromise;

    let query = `
      SELECT
        S.StudentId,
        S.Name AS StudentName,
        S.Email,

        E.ExamId,
        E.ExamName,
        E.TotalMarks,

        ER.ResultId,
        ER.Score AS TotalScore,
        ER.SubmittedAt,

        Q.QuestionId,
        Q.QuestionText,

        ES.SelectedOption,
        ES.CorrectOption,
        ES.IsCorrect,
        ES.MarksAwarded

      FROM ExamSubmissions ES

      INNER JOIN Students S
        ON ES.StudentId = S.StudentId

      INNER JOIN Exams E
        ON ES.ExamId = E.ExamId

      INNER JOIN Questions Q
        ON ES.QuestionId = Q.QuestionId

      LEFT JOIN ExamResults ER
        ON ER.StudentId = ES.StudentId
        AND ER.ExamId = ES.ExamId

      WHERE 1=1
    `;

    const request = pool.request();

    if (studentId && !isNaN(studentId)) {

      query += " AND ES.StudentId = @studentId";

      request.input("studentId", sql.Int, parseInt(studentId));

    }

    if (examId && !isNaN(examId)) {

      query += " AND ES.ExamId = @examId";

      request.input("examId", sql.Int, parseInt(examId));

    }

    query += `
      ORDER BY
        S.StudentId,
        E.ExamId,
        Q.QuestionId
    `;

    const result = await request.query(query);

    res.json(result.recordset);

  }
  catch (error) {

    throw error;

  }

});


/**
 * @swagger
 * /api/admin/result/{id}:
 *   get:
 *     summary: Get exam result by Result ID
 *     tags: [Result]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Result ID
 *     responses:
 *       200:
 *         description: Exam result found
 *       400:
 *         description: Invalid Result ID
 *       404:
 *         description: Result not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id',  verifyToken,teacherOnly,async (req, res) => {

  try {

    const id = parseInt(req.params.id);

    if (isNaN(id))
      return res.status(400).json({ error: "Invalid ResultId" });

    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT *
        FROM ExamResults
        WHERE ResultId = @id
      `);

    if (result.recordset.length === 0)
      return res.status(404).json({ message: "Result not found" });

    res.json(result.recordset[0]);

  }
  catch (error) {

    throw error;

  }

});


/**
 * @swagger
 * /api/admin/result/{id}:
 *   delete:
 *     summary: Delete exam result by Result ID
 *     tags: [Result]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Result ID
 *     responses:
 *       200:
 *         description: Result deleted successfully
 *       400:
 *         description: Invalid Result ID
 *       500:
 *         description: Internal server error
 */
router.delete('/:id',  verifyToken,teacherOnly,async (req, res) => {

  try {

    const id = parseInt(req.params.id);

    if (isNaN(id))
      return res.status(400).json({ error: "Invalid ResultId" });

    const pool = await poolPromise;

    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        DELETE FROM ExamResults
        WHERE ResultId = @id
      `);

    res.json({ message: "Result deleted successfully" });

  }
  catch (error) {

    throw error;

  }

});

module.exports = router;
