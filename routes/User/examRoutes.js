const express = require('express');
const { sql, poolPromise } = require('../../db');
const router = express.Router();

/**
 * @swagger
 * /api/exam/AllExams:
 *   get:
 *     summary: Get all exams
 *     tags: [Exams]
 *     responses:
 *       200:
 *         description: List of all exams
 *       500:
 *         description: Internal server error
 */
router.get('/AllExams', async (req, res) => {
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
 * /api/exam/class/{className}:
 *   get:
 *     summary: Get exams by class name
 *     tags: [Exams]
 *     parameters:
 *       - in: path
 *         name: className
 *         required: true
 *         schema:
 *           type: string
 *         description: Class name to filter exams
 *     responses:
 *       200:
 *         description: List of exams for the class
 *       404:
 *         description: No exams found for the class
 *       500:
 *         description: Internal server error
 */
router.get("/class/:className", async (req, res) => {
  try {
    const { className } = req.params;
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("className", sql.NVarChar, className)
      .query("SELECT * FROM Exams WHERE Class = @className");

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "No exams found for this class" });
    }

    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/exam/classes:
 *   get:
 *     summary: Get all unique classes with exams
 *     tags: [Exams]
 *     responses:
 *       200:
 *         description: List of all classes
 *       404:
 *         description: No classes found
 *       500:
 *         description: Internal server error
 */
router.get("/classes", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query("SELECT DISTINCT Class FROM Exams");

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "No classes found" });
    }

    res.json(result.recordset.map((row) => row.Class));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/exam/{id}:
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

module.exports = router;
