
const express = require('express');
const path = require("path");
const { swaggerUi, specs } = require("./swagger");

const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const errorHandler = require("./routes/middleware/errorMiddleware");

// Central async wrapper so rejected promises in route handlers flow to error middleware.
const wrapHandler = (handler) => {
  if (typeof handler !== "function") return handler;
  if (handler.length === 4) return handler; // Keep error middleware signature untouched.

  return function wrappedHandler(req, res, next) {
    try {
      const maybePromise = handler(req, res, next);
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
};

const wrapArg = (arg) => {
  if (Array.isArray(arg)) return arg.map(wrapArg);
  return wrapHandler(arg);
};

const originalRouterFactory = express.Router;
express.Router = (...routerArgs) => {
  const router = originalRouterFactory(...routerArgs);
  ["use", "all", "get", "post", "put", "patch", "delete"].forEach((method) => {
    const originalMethod = router[method].bind(router);
    router[method] = (...args) => originalMethod(...args.map(wrapArg));
  });
  return router;
};
// Import Admin Routes
const adminRoutes = require('./routes/Admin/adminRoutes');
const adminExamRoutes = require('./routes/Admin/adminExamRoutes');
const adminStudentRoutes = require('./routes/Admin/adminStudentRoutes');
const adminFeedbackRoutes = require('./routes/Admin/adminFeedbackRoutes');
const adminGrievanceRoutes = require('./routes/Admin/adminGrievanceRoutes');
const adminQuestionRoutes = require('./routes/Admin/adminQuestionRoutes');
const adminResultRoutes = require('./routes/Admin/adminResultRoutes');
const adminExamAuditRoutes = require('./routes/Admin/adminExamAuditRoutes');
const adminProctoringRoutes = require('./routes/Admin/adminProctoringRoutes');
const adminDebugRoutes = require('./routes/Admin/adminDebugRoutes');
// Import User Routes 
const studentRoutes = require('./routes/User/studentRoutes');
const examRoutes = require('./routes/User/examRoutes');
const feedbackRoutes = require('./routes/User/feedbackRoutes');
const grievanceRoutes = require('./routes/User/grievanceRoutes');
const questionRoutes = require('./routes/User/questionRoutes');
const resultRoutes = require('./routes/User/resultRoutes');
const proctoringRoutes = require('./routes/User/proctoringRoutes');
const app = express();

// ✅ Fix CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL, // Allow only your frontend
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization"
}));

// ✅ Enable JSON Parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Swagger UI route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Admin Routes
app.use('/api/admin/admins', adminRoutes);
app.use('/api/admin/exams', adminExamRoutes);
app.use('/api/admin/feedback', adminFeedbackRoutes);
app.use('/api/admin/student', adminStudentRoutes);
app.use('/api/admin/grievance',adminGrievanceRoutes);
app.use('/api/admin/question',adminQuestionRoutes);
app.use('/api/admin/result',adminResultRoutes);
app.use('/api/admin/exam-audit', adminExamAuditRoutes);
app.use('/api/admin/proctoring', adminProctoringRoutes);
app.use('/api/admin/debug', adminDebugRoutes);
// User Routes 
app.use('/api/students', studentRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/proctoring', proctoringRoutes);

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

app.use(errorHandler);

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});


// Server Listening
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the old process or set a different PORT in .env.`);
    process.exit(1);
  }

  console.error("Server startup error:", err);
  process.exit(1);
});
