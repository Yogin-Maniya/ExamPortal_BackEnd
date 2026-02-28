const express = require('express');
const { sql, poolPromise } = require('../../db');
const router = express.Router();
const {verifyToken,studentOnly} = require("../middleware/authMiddleware");
/**
 * @swagger
 * /api/grievances/submit:
 *   post:
 *     summary: Submit a grievance from a student
 *     tags: [Grievances]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - issue
 *             properties:
 *               studentId:
 *                 type: integer
 *                 description: ID of the student submitting the grievance
 *               issue:
 *                 type: string
 *                 description: Grievance message
 *     responses:
 *       200:
 *         description: Grievance submitted successfully
 *       500:
 *         description: Internal server error
 */
router.post('/submit', verifyToken,studentOnly,async (req, res) => {
  try {
    const { studentId, issue } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('issue', sql.NVarChar, issue)
      .query(`INSERT INTO Grievances (StudentId, Issue) VALUES (@studentId, @issue)`);
    res.json({ message: "Grievance submitted successfully" });
  } catch (error) {
    throw error;
  }
});
module.exports = router;
