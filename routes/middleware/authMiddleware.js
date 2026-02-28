const jwt = require("jsonwebtoken");
require("dotenv").config();


// ==============================
// Verify Token (COMMON)
// ==============================
const verifyToken = (req, res, next) => {

  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // store full payload

    next();

  } catch (error) {

    return res.status(401).json({ error: "Invalid token" });

  }
};


// ==============================
// ROLE CHECK (STUDENT)
// ==============================
const studentOnly = (req, res, next) => {

  if (!req.user.studentId)
    return res.status(403).json({ error: "Student access only" });

  next();
};


// ==============================
// ROLE CHECK (TEACHER / ADMIN)
// ==============================
const teacherOnly = (req, res, next) => {

  if (!req.user.adminId)
    return res.status(403).json({ error: "Teacher access only" });

  next();
};

module.exports = {
  verifyToken,
  studentOnly,
  teacherOnly
};
