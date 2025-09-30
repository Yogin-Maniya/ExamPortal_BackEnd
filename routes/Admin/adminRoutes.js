const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('../../db');
require('dotenv').config();

const router = express.Router();

// ========================================================
// Teacher Authentication Middleware
// ========================================================
const teacherAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = { adminId: decoded.adminId };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// ========================================================
// Teacher-Specific Routes
// ========================================================

/**
 * @swagger
 * /api/admin/admins/dashboard:
 *   get:
 *     summary: Get recent exams created by the teacher
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of exams with submission stats
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard', teacherAuth, async (req, res) => {
  try {
    const adminId = req.admin.adminId;
    const pool = await poolPromise;

    const examQuery = `
      SELECT ExamId, ExamName, Class, TotalMarks, CreatedAt
      FROM Exams
      WHERE AdminId = @adminId
      ORDER BY CreatedAt DESC
    `;
    const examResult = await pool.request()
      .input('adminId', sql.Int, adminId)
      .query(examQuery);
    const exams = examResult.recordset;

    for (let exam of exams) {
      const submissionQuery = `
        SELECT COUNT(*) AS SubmissionCount
        FROM ExamResults
        WHERE ExamId = @examId
      `;
      const submissionResult = await pool.request()
        .input('examId', sql.Int, exam.ExamId)
        .query(submissionQuery);
      exam.submissionCount = submissionResult.recordset[0].SubmissionCount;

      const studentCountQuery = `
        SELECT COUNT(*) AS TotalStudents
        FROM Students
        WHERE Class = @class
      `;
      const studentCountResult = await pool.request()
        .input('class', sql.NVarChar, exam.Class)
        .query(studentCountQuery);
      exam.totalStudents = studentCountResult.recordset[0].TotalStudents;

      exam.remaining = exam.totalStudents - exam.submissionCount;
    }

    res.json({ exams });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/admins/exam-results/{examId}:
 *   get:
 *     summary: Get detailed results for a specific exam
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Exam ID
 *     responses:
 *       200:
 *         description: Detailed exam results
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to view this exam
 *       500:
 *         description: Internal server error
 */
router.get('/exam-results/:examId', teacherAuth, async (req, res) => {
  try {
    const adminId = req.admin.adminId;
    const examId = req.params.examId;
    const pool = await poolPromise;

    const examQuery = `SELECT * FROM Exams WHERE ExamId = @examId AND AdminId = @adminId`;
    const examResult = await pool.request()
      .input('examId', sql.Int, examId)
      .input('adminId', sql.Int, adminId)
      .query(examQuery);
    if (examResult.recordset.length === 0) {
      return res.status(403).json({ error: "You are not authorized to view results for this exam." });
    }

    const resultsQuery = `
      SELECT er.Score, er.SubmittedAt, s.Name AS StudentName
      FROM ExamResults er
      JOIN Students s ON er.StudentId = s.StudentId
      WHERE er.ExamId = @examId
    `;
    const resultsResult = await pool.request()
      .input('examId', sql.Int, examId)
      .query(resultsQuery);
    res.json({ examResults: resultsResult.recordset });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================================
// Generic Admin Routes
// ========================================================

/**
 * @swagger
 * /api/admin/admins/allAdmin:
 *   get:
 *     summary: Get all admins
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of admins
 *       500:
 *         description: Internal server error
 */
router.get('/allAdmin', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Admins');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/admins/{id}:
 *   get:
 *     summary: Get admin by ID
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Admin ID
 *     responses:
 *       200:
 *         description: Admin details
 *       404:
 *         description: Admin not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Admins WHERE AdminId = @id');
    if (result.recordset.length === 0) return res.status(404).json({ message: "Admin not found" });
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/admins/register:
 *   post:
 *     summary: Register a new admin
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - username
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Admin registered successfully
 *       500:
 *         description: Internal server error
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const pool = await poolPromise;
    await pool.request()
      .input('username', sql.NVarChar, username)
      .input('password', sql.NVarChar, hashedPassword)
      .input('email', sql.NVarChar, email)
      .query('INSERT INTO Admins (Username, Password, Email) VALUES (@username, @password, @email)');
    res.json({ message: "Admin registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/admins/login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Returns JWT token
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query("SELECT * FROM Admins WHERE Email = @email");
    if (result.recordset.length === 0) return res.status(400).json({ error: "Admin not found" });
    const admin = result.recordset[0];
    const isMatch = await bcrypt.compare(password, admin.Password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });
    const token = jwt.sign({ adminId: admin.AdminId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/admins/update/{id}:
 *   put:
 *     summary: Update admin details
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Admin ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin updated successfully
 *       500:
 *         description: Internal server error
 */
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password } = req.body;
    const pool = await poolPromise;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.request()
        .input('id', sql.Int, id)
        .input('username', sql.NVarChar, username)
        .input('email', sql.NVarChar, email)
        .input('password', sql.NVarChar, hashedPassword)
        .query('UPDATE Admins SET Username=@username, Email=@email, Password=@password WHERE AdminId=@id');
    } else {
      await pool.request()
        .input('id', sql.Int, id)
        .input('username', sql.NVarChar, username)
        .input('email', sql.NVarChar, email)
        .query('UPDATE Admins SET Username=@username, Email=@email WHERE AdminId=@id');
    }
    res.json({ message: "Admin updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/admins/{id}:
 *   delete:
 *     summary: Delete an admin
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Admin ID
 *     responses:
 *       200:
 *         description: Admin deleted successfully
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Admins WHERE AdminId=@id');
    res.json({ message: "Admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
