const express = require('express');
const { sql, poolPromise } = require('../../db');
const router = express.Router();

/**
 * @swagger
 * /api/admin/exams/create:
 *   post:
 *     summary: Create a new exam
 *     tags: [Exams]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - examName
 *               - totalMarks
 *               - durationMinutes
 *               - className
 *               - startTime
 *               - endTime
 *               - adminId
 *             properties:
 *               examName:
 *                 type: string
 *               totalMarks:
 *                 type: integer
 *               durationMinutes:
 *                 type: integer
 *               className:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               adminId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Exam created successfully
 *       500:
 *         description: Internal server error
 */
router.post('/create', async (req, res) => {
  try {
    const { examName, totalMarks, durationMinutes, className, startTime, endTime, adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({ message: "AdminId is required" });
    }

    const pool = await poolPromise;
    await pool.request()
      .input('examName', sql.NVarChar, examName)
      .input('totalMarks', sql.Int, totalMarks)
      .input('durationMinutes', sql.Int, durationMinutes)
      .input('className', sql.NVarChar, className)
      .input('startTime', sql.DateTime, startTime)
      .input('endTime', sql.DateTime, endTime)
      .input('adminId', sql.Int, adminId)
      .query(`INSERT INTO Exams (ExamName, TotalMarks, DurationMinutes, Class, StartTime, EndTime, AdminId) 
              VALUES (@examName, @totalMarks, @durationMinutes, @className, @startTime, @endTime, @adminId)`);

    res.json({ message: "Exam created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/exams/{id}:
 *   put:
 *     summary: Update an exam by ID
 *     tags: [Exams]
 *     parameters:
 *       - in: path
 *         name: id
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
 *               examName:
 *                 type: string
 *               totalMarks:
 *                 type: integer
 *               durationMinutes:
 *                 type: integer
 *               className:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Exam updated successfully
 *       500:
 *         description: Internal server error
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { examName, totalMarks, durationMinutes, className, startTime, endTime } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .input('examName', sql.NVarChar, examName)
      .input('totalMarks', sql.Int, totalMarks)
      .input('durationMinutes', sql.Int, durationMinutes)
      .input('className', sql.NVarChar, className)
      .input('startTime', sql.DateTime, startTime)
      .input('endTime', sql.DateTime, endTime)
      .query(`
        UPDATE Exams 
        SET ExamName = @examName, 
            TotalMarks = @totalMarks, 
            DurationMinutes = @durationMinutes, 
            Class = @className, 
            StartTime = @startTime, 
            EndTime = @endTime 
        WHERE ExamId = @id
      `);
    res.json({ message: "Exam updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/exams:
 *   get:
 *     summary: Get all exams
 *     tags: [Exams]
 *     responses:
 *       200:
 *         description: List of all exams
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Exams');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/exams/{id}:
 *   get:
 *     summary: Get exam by ID
 *     tags: [Exams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Exam ID
 *     responses:
 *       200:
 *         description: Exam details
 *       404:
 *         description: Exam not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Exams WHERE ExamId = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Exam not found" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/exams/{id}:
 *   delete:
 *     summary: Delete an exam by ID
 *     tags: [Exams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Exam ID
 *     responses:
 *       200:
 *         description: Exam deleted successfully
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    // 1️⃣ Delete questions related to this exam first
    await pool.request()
      .input('examId', sql.Int, id)
      .query('DELETE FROM Questions WHERE ExamId = @examId');

    // 2️⃣ Then delete the exam itself
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Exams WHERE ExamId = @id');

    res.json({ message: "Exam and its questions deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
