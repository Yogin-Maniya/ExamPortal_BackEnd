const express = require('express');
const { swaggerUi, specs } = require("./swagger");

const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// Import Admin Routes
const adminRoutes = require('./routes/Admin/adminRoutes');
const adminExamRoutes = require('./routes/Admin/adminExamRoutes');
const adminStudentRoutes = require('./routes/Admin/adminStudentRoutes');
const adminFeedbackRoutes = require('./routes/Admin/adminFeedbackRoutes');
const adminGrievanceRoutes = require('./routes/Admin/adminGrievanceRoutes');
const adminQuestionRoutes = require('./routes/Admin/adminQuestionRoutes');
const adminResultRoutes = require('./routes/Admin/adminResultRoutes');

// Import User Routes 
const studentRoutes = require('./routes/User/studentRoutes');
const examRoutes = require('./routes/User/examRoutes');
const feedbackRoutes = require('./routes/User/feedbackRoutes');
const grievanceRoutes = require('./routes/User/grievanceRoutes');
const questionRoutes = require('./routes/User/questionRoutes');
const resultRoutes = require('./routes/User/resultRoutes');

const app = express();

// ✅ Fix CORS Configuration
app.use(cors({
  origin: "http://localhost:3000", // Allow only your frontend
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization"
}));

// ✅ Enable JSON Parsing
app.use(bodyParser.json());

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

// User Routes 
app.use('/api/students', studentRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/results', resultRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});


// Server Listening
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
});
