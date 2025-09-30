const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('../../db');
require('dotenv').config();

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Students
 *   description: API for student operations
 */

/**
 * @swagger
 * /api/students/register:
 *   post:
 *     summary: Register a new student
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: 
 *               - name
 *               - email
 *               - password
 *               - studentClass
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               studentClass:
 *                 type: string
 *                 example: 10th
 *     responses:
 *       200:
 *         description: Student registered successfully
 *       500:
 *         description: Internal server error
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, studentClass } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const pool = await poolPromise;
    await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('studentClass', sql.NVarChar, studentClass)
      .input('password', sql.NVarChar, hashedPassword)
      .query('INSERT INTO Students (Name, Email, Class, Password) VALUES (@name, @email, @studentClass, @password)');

    res.json({ message: "Student registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/students/login:
 *   post:
 *     summary: Login student and return JWT token
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT * FROM Students WHERE Email = @email");

    if (result.recordset.length === 0) {
      return res.status(400).json({ error: "Student not found" });
    }

    const student = result.recordset[0];
    const isMatch = await bcrypt.compare(password, student.Password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { studentId: student.StudentId, studentClass: student.Class },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token, studentClass: student.Class });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/students/my-exams:
 *   get:
 *     summary: Get upcoming and completed exams for a student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns upcoming and completed exams
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/my-exams", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized access" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const studentId = decoded.studentId;
    const studentClass = decoded.studentClass;

    const pool = await poolPromise;
    const examsResult = await pool
      .request()
      .input("className", sql.NVarChar, studentClass)
      .query("SELECT * FROM Exams WHERE Class = @className");

    const exams = examsResult.recordset;

    const resultsQuery = await pool
      .request()
      .input("studentId", sql.Int, studentId)
      .query("SELECT ExamId FROM ExamResults WHERE StudentId = @studentId");

    const completedExams = resultsQuery.recordset.map((res) => res.ExamId);

    const upcomingExams = exams.filter((exam) => !completedExams.includes(exam.ExamId));
    const completedExamsList = exams.filter((exam) => completedExams.includes(exam.ExamId));

    res.json({ upcomingExams, completedExams: completedExamsList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/students/{id}:
 *   get:
 *     summary: Get student details by ID
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student data
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

// Export router once
module.exports = router;
