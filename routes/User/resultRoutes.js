const express = require('express');
const { sql, poolPromise } = require('../../db');
const router = express.Router();
const {verifyToken,studentOnly} = require("../middleware/authMiddleware");
/**
 * @swagger
 * /api/results/submit:
 *   post:
 *     summary: Submit exam result for a student
 *     tags: [Results]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - examId
 *               - score
 *             properties:
 *               studentId:
 *                 type: integer
 *                 description: ID of the student
 *               examId:
 *                 type: integer
 *                 description: ID of the exam
 *               score:
 *                 type: integer
 *                 description: Score obtained by the student
 *     responses:
 *       200:
 *         description: Result recorded successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/submit',verifyToken,studentOnly, async (req, res) => {
  try {
    const { studentId, examId, score } = req.body;

    if (!studentId || !examId || score === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const pool = await poolPromise;
    await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('examId', sql.Int, examId)
      .input('score', sql.Int, score)
      .query(`INSERT INTO ExamResults (StudentId, ExamId, Score) VALUES (@studentId, @examId, @score)`);

    res.json({ message: "Result recorded successfully" });
  } catch (error) {
    throw error;
  }
});

/**
 * @swagger
 * /api/results/{studentId}:
 *   get:
 *     summary: Get exam results for a specific student
 *     tags: [Results]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the student
 *     responses:
 *       200:
 *         description: List of exam results with exam name, total marks, and pass/fail status
 *       500:
 *         description: Internal server error
 */
router.get('/:studentId', verifyToken,studentOnly,async (req, res) => {
  try {
    const { studentId } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('studentId', sql.Int, studentId)
      .query(`
        SELECT 
          ER.ResultId, 
          ER.StudentId, 
          ER.ExamId, 
          E.ExamName, 
          E.TotalMarks, 
          ER.Score, 
          ER.SubmittedAt,
          CASE 
            WHEN ER.Score >= (E.TotalMarks * 0.4) THEN 'Pass'
            ELSE 'Fail'
          END AS PassFailStatus
        FROM ExamResults ER
        JOIN Exams E ON ER.ExamId = E.ExamId
        WHERE ER.StudentId = @studentId
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching exam results:", error);
    throw error;
  }
});

/**
 * @swagger
 * /api/results/submit-full:
 *   post:
 *     summary: Submit full exam answers
 */
router.post("/submit-full",verifyToken,studentOnly, async (req, res) => {

  try {

    const { studentId, examId, answers , warningCount ,warningReasons,submissionType,submissionSource,isAutoSubmitted , warning,deviceInfo, browserInfo, examStartTime, examEndTime} = req.body;
    const clientIP =
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip;
const noFaceCount =
  warningReasons?.includes("NoFace") ? 1 : 0;

const multiFaceCount =
  warningReasons?.includes("MultiFace") ? 1 : 0;

// use warningCount coming from frontend
const totalWarnings = warningCount || 0;

let riskScore =
  (noFaceCount * 20) +
  (multiFaceCount * 25) +
  (totalWarnings * 10) +
  (isAutoSubmitted ? 30 : 0);

if (riskScore > 100)
  riskScore = 100;

    if (!studentId || !examId || !answers)
      return res.status(400).json({ error: "Missing data" });

    const pool = await poolPromise;

    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
    const existing = await transaction.request()
          .input("studentId", sql.Int, studentId).input("examId", sql.Int, examId)
          .query(`SELECT 1 FROM ExamResults WHERE StudentId = @studentId AND ExamId = @examId`);

    if (existing.recordset.length > 0)
        throw new Error("Exam already submitted");

      // Get exam total marks
      const examResult = await transaction.request()
        .input("examId", sql.Int, examId)
        .query(`
          SELECT TotalMarks
          FROM Exams
          WHERE ExamId = @examId
        `);

      const totalMarks = examResult.recordset[0].TotalMarks;

      // Get question count
      const countResult = await transaction.request()
        .input("examId", sql.Int, examId)
        .query(`
          SELECT COUNT(*) as TotalQuestions
          FROM Questions
          WHERE ExamId = @examId
        `);

      const totalQuestions = countResult.recordset[0].TotalQuestions;

      const marksPerQuestion = totalMarks / totalQuestions;

      let totalScore = 0;

      for (const answer of answers) {

        const q = await transaction.request()
          .input("questionId", sql.Int, answer.questionId)
          .query(`
            SELECT CorrectOption
            FROM Questions
            WHERE QuestionId = @questionId
          `);

        const correctOption = q.recordset[0].CorrectOption;

        let selectedOption = answer.selectedOption;

        if (!selectedOption)
            selectedOption = null;


        const isCorrect = selectedOption === correctOption;

        const marksAwarded = isCorrect ? marksPerQuestion : 0;

        totalScore += marksAwarded;

        await transaction.request()
          .input("studentId", sql.Int, studentId)
          .input("examId", sql.Int, examId)
          .input("questionId", sql.Int, answer.questionId)
          .input("selectedOption", sql.VarChar(1), selectedOption)
          .input("correctOption", sql.VarChar(1), correctOption)
          .input("isCorrect", sql.Bit, isCorrect)
          .input("marksAwarded", sql.Decimal(10,2), marksAwarded)
          
          .query(`
            INSERT INTO ExamSubmissions
            (StudentId, ExamId, QuestionId, SelectedOption, CorrectOption, IsCorrect,MarksAwarded)
            VALUES
            (@studentId, @examId, @questionId, @selectedOption, @correctOption, @isCorrect,@marksAwarded)
          `);

      }

      await transaction.request()
        .input("studentId", sql.Int, studentId)
        .input("examId", sql.Int, examId)
        .input("score", sql.Decimal(10,2), totalScore)
          .input("warningCount", sql.Int, warningCount || 0)
.input("warning", sql.NVarChar(sql.MAX), warningReasons || null)
    .input("warningReasons", sql.NVarChar(sql.MAX), warningReasons || null)

    .input("submissionType", sql.VarChar(50), submissionType || "Manual")

    .input("submissionSource", sql.VarChar(50), submissionSource || "User")

    .input("isAutoSubmitted", sql.Bit, isAutoSubmitted || false)       .input("ipAddress", sql.VarChar(50), clientIP)

.input("deviceInfo", sql.NVarChar(500), req.body.deviceInfo)

.input("browserInfo", sql.NVarChar(500), req.body.browserInfo)

.input("examStartTime", sql.DateTime, req.body.examStartTime)
   
.input("examEndTime", sql.DateTime, req.body.examEndTime)
.input("riskScore", sql.Int, riskScore)

        .query(`
          INSERT INTO ExamResults
          (StudentId, ExamId, Score, SubmittedAt, warningCount, warningReasons, submissionType, submissionSource, isAutoSubmitted, ipAddress, deviceInfo, browserInfo, examEndTime, riskScore)
          VALUES
          (@studentId, @examId, @score, GETDATE(), @warningCount, @warningReasons, @submissionType, @submissionSource, @isAutoSubmitted,@ipAddress,@deviceInfo,@browserInfo,@examEndTime,@riskScore)
        `);

      await transaction.commit();

      res.json({
        message: "Exam submitted successfully",
        score: totalScore
      });

    }
    catch (err) {

      await transaction.rollback();

      throw err;

    }

  }
  catch (error) {

    throw error;

  }

});
module.exports = router;
