const express = require('express');
const { sql, poolPromise } = require('../../db');
const router = express.Router();

/**
 * @swagger
 * /api/feedback/submit:
 *   post:
 *     summary: Submit feedback from a student
 *     tags: [Feedback]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - message
 *             properties:
 *               studentId:
 *                 type: integer
 *                 description: ID of the student
 *               message:
 *                 type: string
 *                 description: Feedback message
 *     responses:
 *       200:
 *         description: Feedback submitted successfully
 *       500:
 *         description: Internal server error
 */
router.post('/submit', async (req, res) => {
  try {
    const { studentId, message } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('message', sql.NVarChar, message)
      .query(`INSERT INTO Feedback (StudentId, Message) VALUES (@studentId, @message)`);
    res.json({ message: "Feedback submitted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/feedback/AllFeedback/{studentId}:
 *   get:
 *     summary: Get all feedbacks for a specific student
 *     tags: [Feedback]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the student to filter feedbacks
 *     responses:
 *       200:
 *         description: List of feedbacks for the student
 *       500:
 *         description: Internal server error
 */
router.get('/AllFeedback/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params; // get id from URL
    const pool = await poolPromise;

    // parameterized query to avoid SQL injection
    const result = await pool
      .request()
      .input('studentId', studentId)
      .query('SELECT * FROM Feedback WHERE StudentId = @studentId');

    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
