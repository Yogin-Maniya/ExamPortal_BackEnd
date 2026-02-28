-- ================================================
-- EXAM PORTAL DATABASE SCHEMA
-- ================================================
-- Run this script to recreate your database structure
-- This script DROPS all existing tables first, then creates them fresh

-- ================================================
-- DROP ALL EXISTING TABLES (in correct order)
-- ================================================

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ExamProctoringLogs')
    DROP TABLE ExamProctoringLogs;

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ExamSubmissions')
    DROP TABLE ExamSubmissions;

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'StudentProfileEditRequests')
    DROP TABLE StudentProfileEditRequests;

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Grievances')
    DROP TABLE Grievances;

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Feedback')
    DROP TABLE Feedback;

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ExamResults')
    DROP TABLE ExamResults;

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Questions')
    DROP TABLE Questions;

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Exams')
    DROP TABLE Exams;

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ErrorLogs')
    DROP TABLE ErrorLogs;

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Students')
    DROP TABLE Students;

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Admins')
    DROP TABLE Admins;

PRINT 'All existing tables dropped successfully!';

-- ================================================
-- CREATE ALL TABLES (Fresh Start)
-- ================================================

-- ================================================
-- 1. ADMINS TABLE
-- ================================================
CREATE TABLE Admins (
    AdminId INT PRIMARY KEY IDENTITY(1,1),
    Username NVARCHAR(255) NOT NULL UNIQUE,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    Password NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- ================================================
-- 2. STUDENTS TABLE
-- ================================================
CREATE TABLE Students (
    StudentId INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(255) NOT NULL,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    Class NVARCHAR(50) NOT NULL,
    Password NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- ================================================
-- 3. EXAMS TABLE
-- ================================================
CREATE TABLE Exams (
    ExamId INT PRIMARY KEY IDENTITY(1,1),
    ExamName NVARCHAR(MAX) NOT NULL,
    TotalMarks INT NOT NULL,
    DurationMinutes INT NOT NULL,
    Class NVARCHAR(50) NOT NULL,
    StartTime DATETIME NOT NULL,
    EndTime DATETIME NOT NULL,
    AdminId INT NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (AdminId) REFERENCES Admins(AdminId) ON DELETE CASCADE
);

-- ================================================
-- 4. QUESTIONS TABLE
-- ================================================
CREATE TABLE Questions (
    QuestionId INT PRIMARY KEY IDENTITY(1,1),
    ExamId INT NOT NULL,
    QuestionText NVARCHAR(MAX) NOT NULL,
    OptionA NVARCHAR(MAX) NOT NULL,
    OptionB NVARCHAR(MAX) NOT NULL,
    OptionC NVARCHAR(MAX) NOT NULL,
    OptionD NVARCHAR(MAX) NOT NULL,
    OptionE NVARCHAR(MAX) NULL,
    CorrectOption NVARCHAR(1) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ExamId) REFERENCES Exams(ExamId) ON DELETE CASCADE
);

-- ================================================
-- 5. EXAM RESULTS TABLE
-- ================================================
CREATE TABLE ExamResults (
    ResultId INT PRIMARY KEY IDENTITY(1,1),
    StudentId INT NOT NULL,
    ExamId INT NOT NULL,
    Score DECIMAL(10,2) NOT NULL,
    SubmittedAt DATETIME DEFAULT GETDATE(),
    WarningCount INT NULL,
    WarningReasons NVARCHAR(MAX) NULL,
    SubmissionType VARCHAR(50) NULL,
    SubmissionSource VARCHAR(50) NULL,
    IsAutoSubmitted BIT NULL,
    IPAddress VARCHAR(50) NULL,
    DeviceInfo NVARCHAR(500) NULL,
    BrowserInfo NVARCHAR(500) NULL,
    ExamStartTime DATETIME NULL,
    ExamEndTime DATETIME NULL,
    RiskScore INT NULL DEFAULT 0,
    FOREIGN KEY (StudentId) REFERENCES Students(StudentId) ON DELETE CASCADE,
    FOREIGN KEY (ExamId) REFERENCES Exams(ExamId) ON DELETE CASCADE
);

-- ================================================
-- 6. EXAM SUBMISSIONS TABLE
-- ================================================
CREATE TABLE ExamSubmissions (
    SubmissionId INT PRIMARY KEY IDENTITY(1,1),
    StudentId INT NOT NULL,
    ExamId INT NOT NULL,
    QuestionId INT NOT NULL,
    SelectedOption VARCHAR(1) NULL,
    CorrectOption VARCHAR(1) NOT NULL,
    IsCorrect BIT NOT NULL,
    MarksAwarded DECIMAL(10,2) NOT NULL DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (StudentId) REFERENCES Students(StudentId) ON DELETE CASCADE,
    FOREIGN KEY (ExamId) REFERENCES Exams(ExamId) ON DELETE CASCADE,
    FOREIGN KEY (QuestionId) REFERENCES Questions(QuestionId) ON DELETE CASCADE
);

-- ================================================
-- 7. FEEDBACK TABLE
-- ================================================
CREATE TABLE Feedback (
    FeedbackId INT PRIMARY KEY IDENTITY(1,1),
    StudentId INT NOT NULL,
    Message NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (StudentId) REFERENCES Students(StudentId) ON DELETE CASCADE
);

-- ================================================
-- 8. GRIEVANCES TABLE
-- ================================================
CREATE TABLE Grievances (
    GrievanceId INT PRIMARY KEY IDENTITY(1,1),
    StudentId INT NOT NULL,
    Issue NVARCHAR(MAX) NOT NULL,
    Status NVARCHAR(50) DEFAULT 'Pending',
    CreatedAt DATETIME DEFAULT GETDATE(),
    ResolvedAt DATETIME NULL,
    FOREIGN KEY (StudentId) REFERENCES Students(StudentId) ON DELETE CASCADE
);

-- ================================================
-- 9. STUDENT PROFILE EDIT REQUESTS TABLE
-- ================================================
CREATE TABLE StudentProfileEditRequests (
    RequestId INT PRIMARY KEY IDENTITY(1,1),
    StudentId INT NOT NULL,
    NewName NVARCHAR(255) NOT NULL,
    NewEmail NVARCHAR(255) NOT NULL,
    NewClass NVARCHAR(50) NOT NULL,
    Status NVARCHAR(50) DEFAULT 'Pending',
    RequestedAt DATETIME DEFAULT GETDATE(),
    ApprovedAt DATETIME NULL,
    FOREIGN KEY (StudentId) REFERENCES Students(StudentId) ON DELETE CASCADE
);

-- ================================================
-- 10. EXAM PROCTORING LOGS TABLE
-- ================================================
CREATE TABLE ExamProctoringLogs (
    LogId INT PRIMARY KEY IDENTITY(1,1),
    StudentId INT NOT NULL,
    ExamId INT NOT NULL,
    EventType VARCHAR(100) NOT NULL,
    ImagePath NVARCHAR(500) NULL,
    VideoPath NVARCHAR(500) NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (StudentId) REFERENCES Students(StudentId) ON DELETE CASCADE,
    FOREIGN KEY (ExamId) REFERENCES Exams(ExamId) ON DELETE CASCADE
);

-- ================================================
-- 11. ERROR LOGS TABLE (Optional for debugging)
-- ================================================
CREATE TABLE ErrorLogs (
    ErrorId INT PRIMARY KEY IDENTITY(1,1),
    Message NVARCHAR(MAX) NOT NULL,
    StackTrace NVARCHAR(MAX) NULL,
    Route NVARCHAR(255) NULL,
    Method NVARCHAR(50) NULL,
    UserId INT NULL,
    UserType NVARCHAR(50) NULL,
    StatusCode INT NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- ================================================
-- INDEXES (Optional but recommended for performance)
-- ================================================

-- Exams indexes
CREATE INDEX idx_exams_adminid ON Exams(AdminId);
CREATE INDEX idx_exams_class ON Exams(Class);
CREATE INDEX idx_exams_starttime ON Exams(StartTime);

-- Questions indexes
CREATE INDEX idx_questions_examid ON Questions(ExamId);

-- ExamResults indexes
CREATE INDEX idx_results_studentid ON ExamResults(StudentId);
CREATE INDEX idx_results_examid ON ExamResults(ExamId);
CREATE INDEX idx_results_submittedat ON ExamResults(SubmittedAt);

-- ExamSubmissions indexes
CREATE INDEX idx_submissions_studentid ON ExamSubmissions(StudentId);
CREATE INDEX idx_submissions_examid ON ExamSubmissions(ExamId);
CREATE INDEX idx_submissions_questionid ON ExamSubmissions(QuestionId);

-- Feedback indexes
CREATE INDEX idx_feedback_studentid ON Feedback(StudentId);

-- Grievances indexes
CREATE INDEX idx_grievances_studentid ON Grievances(StudentId);
CREATE INDEX idx_grievances_status ON Grievances(Status);

-- StudentProfileEditRequests indexes
CREATE INDEX idx_editrequest_studentid ON StudentProfileEditRequests(StudentId);
CREATE INDEX idx_editrequest_status ON StudentProfileEditRequests(Status);

-- ExamProctoringLogs indexes
CREATE INDEX idx_proctoringlogs_studentid ON ExamProctoringLogs(StudentId);
CREATE INDEX idx_proctoringlogs_examid ON ExamProctoringLogs(ExamId);
CREATE INDEX idx_proctoringlogs_createdat ON ExamProctoringLogs(CreatedAt);

-- Students indexes
CREATE INDEX idx_students_email ON Students(Email);
CREATE INDEX idx_students_class ON Students(Class);

-- ================================================
-- Sample Data (Optional)
-- ================================================
-- Uncomment below if you want to insert sample data

/*
-- Insert sample admin
INSERT INTO Admins (Username, Email, Password) 
VALUES ('teacher1', 'teacher@example.com', 'hashed_password_here');

-- Insert sample students
INSERT INTO Students (Name, Email, Class, Password) 
VALUES 
('Student One', 'student1@example.com', '10th', 'hashed_password'),
('Student Two', 'student2@example.com', '10th', 'hashed_password'),
('Student Three', 'student3@example.com', '11th', 'hashed_password');

-- Insert sample exam
INSERT INTO Exams (ExamName, TotalMarks, DurationMinutes, Class, StartTime, EndTime, AdminId)
VALUES ('Mathematics Final', 100, 120, '10th', '2025-03-01 10:00:00', '2025-03-01 12:00:00', 1);

-- Insert sample questions
INSERT INTO Questions (ExamId, QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption)
VALUES 
(1, 'What is 2+2?', '3', '4', '5', '6', 'B'),
(1, 'What is the capital of France?', 'London', 'Berlin', 'Paris', 'Madrid', 'C');
*/

-- ================================================
-- END OF SCHEMA
-- ================================================
