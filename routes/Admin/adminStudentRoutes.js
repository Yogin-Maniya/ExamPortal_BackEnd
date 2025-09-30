const express = require('express');
const { sql, poolPromise } = require('../../db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const router = express.Router();

/**
 * @swagger
 * /api/admin/student/allstudent:
 *   get:
 *     summary: Get all students
 *     tags: [Student]
 *     responses:
 *       200:
 *         description: List of all students
 *       500:
 *         description: Internal server error
 */
router.get('/allstudent', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Students');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/student/{id}:
 *   get:
 *     summary: Get student by ID
 *     tags: [Student]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Returns student details
 *       404:
 *         description: Student not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Students WHERE StudentId = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
/**
 * @swagger
 * /api/admin/student/{id}:
 *   put:
 *     summary: Update student by ID
 *     tags: [Student]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               studentClass:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Student updated successfully
 *       404:
 *         description: Student not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, studentClass, password } = req.body;

    const pool = await poolPromise;

    // Check if student exists
    const check = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Students WHERE StudentId = @id');

    if (check.recordset.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Build query dynamically to only update provided fields
    let query = `UPDATE Students SET Name = @name, Email = @email, Class = @studentClass`;
    if (hashedPassword) {
      query += `, Password = @password`;
    }
    query += ` WHERE StudentId = @id`;

    const request = pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('studentClass', sql.NVarChar, studentClass);

    if (hashedPassword) {
      request.input('password', sql.NVarChar, hashedPassword);
    }

    await request.query(query);

    res.json({ message: "Student updated successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;
