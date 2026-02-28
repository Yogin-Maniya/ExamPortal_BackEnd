const express = require('express');
const { sql, poolPromise } = require('../../db');
const router = express.Router();
const { verifyToken, teacherOnly } = require("../middleware/authMiddleware");
/**
 * @swagger
 * /api/admin/feedback:
 *   get:
 *     summary: Get all feedback
 *     tags: [Feedback]
 *     responses:
 *       200:
 *         description: List of all feedback
 *       500:
 *         description: Internal server error
 */
router.get('/', verifyToken,teacherOnly, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Feedback');
    res.json(result.recordset);
  } catch (error) {
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/feedback/{id}:
 *   get:
 *     summary: Get feedback by ID
 *     tags: [Feedback]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Feedback ID
 *     responses:
 *       200:
 *         description: Feedback details
 *       404:
 *         description: Feedback not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', verifyToken,teacherOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Feedback WHERE FeedbackId = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    throw error;
  }
});

/**
 * @swagger
 * /api/admin/feedback/{id}:
 *   delete:
 *     summary: Delete feedback by ID
 *     tags: [Feedback]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Feedback ID
 *     responses:
 *       200:
 *         description: Feedback deleted successfully
 *       500:
 *         description: Internal server error
 */
router.delete('/:id',  verifyToken,teacherOnly,async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Feedback WHERE FeedbackId = @id');
    res.json({ message: "Feedback deleted successfully" });
  } catch (error) {
    throw error;
  }
});
module.exports = router;
