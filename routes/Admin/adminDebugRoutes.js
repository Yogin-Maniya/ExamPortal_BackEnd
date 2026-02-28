const express = require("express");
const { sql, poolPromise } = require("../../db");
const { verifyToken, teacherOnly } = require("../middleware/authMiddleware");

const router = express.Router();

const requireDevKey = (req, res, next) => {
  const serverKey = process.env.DEV_ERROR_DASHBOARD_KEY;
  const requestKey = req.headers["x-dev-key"] || req.query.key;

  // Keep endpoint effectively hidden when key is not configured.
  if (!serverKey) {
    return res.status(404).json({ error: "Not found" });
  }

  if (!requestKey || requestKey !== serverKey) {
    return res.status(403).json({ error: "Forbidden" });
  }

  next();
};

router.get("/error-logs", verifyToken, teacherOnly, requireDevKey, async (req, res) => {
  const requestedLimit = parseInt(req.query.limit, 10);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 100;

  const pool = await poolPromise;
  const hasCreatedAtResult = await pool.request().query(`
    SELECT CASE
      WHEN COL_LENGTH('ErrorLogs', 'CreatedAt') IS NULL THEN 0
      ELSE 1
    END AS HasCreatedAt
  `);

  const hasCreatedAt = hasCreatedAtResult.recordset[0]?.HasCreatedAt === 1;

  const logsQuery = hasCreatedAt
    ? `
      SELECT TOP (@limit)
        Message,
        StackTrace,
        Route,
        Method,
        UserId,
        UserType,
        StatusCode,
        CreatedAt
      FROM ErrorLogs
      ORDER BY CreatedAt DESC
    `
    : `
      SELECT TOP (@limit)
        Message,
        StackTrace,
        Route,
        Method,
        UserId,
        UserType,
        StatusCode
      FROM ErrorLogs
      ORDER BY (SELECT NULL)
    `;

  const logsResult = await pool.request()
    .input("limit", sql.Int, limit)
    .query(logsQuery);

  res.json({
    success: true,
    count: logsResult.recordset.length,
    data: logsResult.recordset
  });
});

module.exports = router;
