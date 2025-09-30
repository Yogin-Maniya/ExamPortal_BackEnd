const express = require('express');
const { sql, poolPromise } = require('../../db');
const router = express.Router();

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
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM ExamResults');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/result/{id}:
 *   get:
 *     summary: Get exam result by ID
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
 *         description: Returns exam result details
 *       404:
 *         description: Result not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM ExamResults WHERE ResultId = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Result not found" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/result/{id}:
 *   delete:
 *     summary: Delete an exam result
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
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM ExamResults WHERE ResultId = @id');
    res.json({ message: "Result deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
