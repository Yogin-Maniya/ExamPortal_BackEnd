const express = require('express');
const { sql, poolPromise } = require('../../db');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const router = express.Router();
const { verifyToken, teacherOnly } = require("../middleware/authMiddleware");

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
router.get('/allstudent',  verifyToken,teacherOnly,async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Students');
    res.json(result.recordset);
  } catch (error) {
    throw error;
  }
});

router.get("/profile-edit-requests",  verifyToken,teacherOnly,async (req, res) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .query(`
      SELECT r.*, s.Name AS CurrentName, s.Email AS CurrentEmail, s.Class AS CurrentClass
      FROM StudentProfileEditRequests r
      INNER JOIN Students s ON r.StudentId = s.StudentId
      WHERE r.Status = 'Pending'
      ORDER BY r.RequestedAt DESC
    `);

  res.json(result.recordset);

});

router.post("/approve-profile-edit/:requestId", verifyToken,teacherOnly, async (req, res) => {

  const { requestId } = req.params;

  const pool = await poolPromise;

  const transaction = new sql.Transaction(await pool);

  try {

    await transaction.begin();

    const requestResult = await transaction.request()
      .input("requestId", sql.Int, requestId)
      .query(`
        SELECT * FROM StudentProfileEditRequests
        WHERE RequestId = @requestId
      `);

    if (requestResult.recordset.length === 0)
      throw new Error("Request not found");

    const reqData = requestResult.recordset[0];

    await transaction.request()
      .input("studentId", sql.Int, reqData.StudentId)
      .input("name", sql.NVarChar, reqData.NewName)
      .input("email", sql.NVarChar, reqData.NewEmail)
      .input("studentClass", sql.NVarChar, reqData.NewClass)
      .query(`
        UPDATE Students
        SET
          Name = @name,
          Email = @email,
          Class = @studentClass
        WHERE StudentId = @studentId
      `);

    await transaction.request()
      .input("requestId", sql.Int, requestId)
      .query(`
        UPDATE StudentProfileEditRequests
        SET
          Status = 'Approved',
          ApprovedAt = GETDATE()
        WHERE RequestId = @requestId
      `);

    await transaction.commit();

    res.json({ message: "Profile update approved and applied" });

  }
  catch (error)
  {
    await transaction.rollback();
    throw error;
  }

});

router.post("/reject-profile-edit/:requestId",  verifyToken,teacherOnly,async (req, res) => {

  const { requestId } = req.params;

  const pool = await poolPromise;

  await pool.request()
    .input("requestId", sql.Int, requestId)
    .query(`
      UPDATE StudentProfileEditRequests
      SET Status = 'Rejected'
      WHERE RequestId = @requestId
    `);

  res.json({ message: "Request rejected" });

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
router.get('/:id', verifyToken,teacherOnly, async (req, res) => {
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
    throw error;
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
router.put('/:id',  verifyToken,teacherOnly,async (req, res) => {
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
    throw error;
  }
});

router.delete("/:id", verifyToken, teacherOnly, async (req, res) => {

  const { id } = req.params;

  try {

    const pool = await poolPromise;

    await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM Students WHERE StudentId = @id");

    res.json({ message: "Student deleted" });

  }
  catch (error)
  {
    throw error;
  }

});
module.exports = router;
