const express = require('express');
const { sql, poolPromise } = require('../../db');
const router = express.Router();

/**
 * @swagger
 * /api/admin/grievance:
 *   get:
 *     summary: Get all grievances
 *     tags: [Grievance]
 *     responses:
 *       200:
 *         description: List of all grievances
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Grievances');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/grievance/{id}:
 *   get:
 *     summary: Get a grievance by ID
 *     tags: [Grievance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Grievance ID
 *     responses:
 *       200:
 *         description: Grievance details
 *       404:
 *         description: Grievance not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Grievances WHERE GrievanceId = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Grievance not found" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/grievance/{id}:
 *   delete:
 *     summary: Delete a grievance by ID
 *     tags: [Grievance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Grievance ID
 *     responses:
 *       200:
 *         description: Grievance deleted successfully
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Grievances WHERE GrievanceId = @id');
    res.json({ message: "Grievance deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
