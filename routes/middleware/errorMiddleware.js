const { sql, poolPromise } = require("../../db");

const mapSqlError = (err) => {
  const sqlNumber = err?.number || err?.originalError?.info?.number;

  if (sqlNumber === 2627 || sqlNumber === 2601) {
    const message = (err?.message || "").toLowerCase();

    if (message.includes("uq_students_email")) {
      return {
        statusCode: 409,
        message: "Email is already registered."
      };
    }

    return {
      statusCode: 409,
      message: "Duplicate value already exists."
    };
  }

  if (sqlNumber === 547) {
    return {
      statusCode: 409,
      message: "This record is referenced by other data and cannot be modified."
    };
  }

  if (sqlNumber === 515) {
    return {
      statusCode: 400,
      message: "Required field value is missing."
    };
  }

  return null;
};

const errorHandler = async (err, req, res, next) => {

  console.error("GLOBAL ERROR:", err);

  const sqlMapped = mapSqlError(err);
  const responseStatus = sqlMapped?.statusCode || err.statusCode || 500;
  const responseMessage = sqlMapped?.message || err.message || "Internal Server Error";

  const userId = req.user?.studentId || req.user?.adminId || null;
  const userType = req.user?.studentId ? "Student" : req.user?.adminId ? "Teacher" : "Guest";

  try {

    const pool = await poolPromise;

    await pool.request()
      .input("message", sql.NVarChar, responseMessage || "Unknown error")
      .input("stack", sql.NVarChar, err.stack || "")
      .input("route", sql.NVarChar, req.originalUrl)
      .input("method", sql.NVarChar, req.method)
      .input("userId", sql.Int, userId)
      .input("userType", sql.NVarChar, userType)
      .input("statusCode", sql.Int, responseStatus)
      .query(`
        INSERT INTO ErrorLogs
        (Message, StackTrace, Route, Method, UserId, UserType, StatusCode)
        VALUES
        (@message,@stack,@route,@method,@userId,@userType,@statusCode)
      `);

  } catch (dbErr) {

    console.error("Error logging failed:", dbErr.message);

  }

  res.status(responseStatus).json({
    success: false,
    error: responseMessage
  });

};

module.exports = errorHandler;
