const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require("dotenv");
const app = express();
const multer = require('multer')
const storage = multer.memoryStorage();
const upload = multer({ storage });
const cors = require('cors');
const karyawanController = require('./controller/karyawancontroller');
const attendanceController = require('./controller/attendancecontroller');
const reportcontroller = require('./controller/reportcontroller');
const projectcontroller = require('./controller/projectcontroller');
const activityLogController = require('./controller/activitylogcontroller');
const {
  getSumDebtTimeByKaryawanId,
  getReportOfDebtTimeByDate,
  getDetailDebtTimeOnDate,
  getAllReportDebtTimeOfKaryawan,
  getWorkTimeExcludingBreaksController,
  getAllWorkTimeByDateController,
  getWorkTimeHistoryByKaryawanIdController
} = require('./controller/debttimecontroller');
const {authenticateToken, IsAdmin} = require('./middleware/authmiddleware');
const router = express.Router()


// Middleware
app.use(express.json());
app.use(cors({
  origin: '*', // Updated origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  allowedHeaders: ['Content-Type', 'Authorization'] 
}));
app.use(bodyParser.json());
app.use('/v1', router);
dotenv.config();

// endpoint
app.post('/karyawan/register', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'barcode', maxCount: 1 }
]), karyawanController.createKaryawan); // tested
app.get('/karyawan', karyawanController.getAllKaryawan); // tested
app.get('/karyawan/:id', karyawanController.getKaryawanById); // tested
app.get('/karyawan/division/:division', karyawanController.getKaryawanByDivision); // tested
app.put('/karyawan/:id', authenticateToken, IsAdmin, karyawanController.updateKaryawan); // Only admins can update
app.get('/karyawan/:id/barcode', authenticateToken, karyawanController.getBarcodeUrlById);
app.post('/karyawan/request-password-reset', karyawanController.requestPasswordReset); // tested deploy
app.post('/karyawan/validasi-otp', karyawanController.validateOtp);
app.post('/karyawan/reset-password', karyawanController.resetPassword); // tested deploy
app.post('/karyawan/login', karyawanController.login); // tested

// attendance
app.put('/attendance/checkin', authenticateToken, attendanceController.checkIn); // tested
app.get('/attendance/:karyawanId/:date', authenticateToken, attendanceController.getAttendance); // tested
app.get('/report/karyawan/:karyawanId', authenticateToken, attendanceController.getKaryawanReport); // tested
app.get('/attendance-today/:karyawanId', authenticateToken, attendanceController.getTodayAttendance) 
app.get('/report/date/:date', authenticateToken, reportcontroller.getDayReport); // tested
app.get('/shift-details', authenticateToken, attendanceController.getShiftDetails);
app.put('/shift-details/:karyawanId', authenticateToken, attendanceController.updateShiftDetails);
app.put('/shift-details/update/update-multiple', authenticateToken, attendanceController.updateMultipleShiftDetails);  
app.get('/kehadiran/:karyawanId', authenticateToken, attendanceController.getKehadiranLogByKaryawanId);
app.get('/kehadiran/karyawan/all', authenticateToken, attendanceController.getKehadiranLogForAllKaryawan);
app.get('/kehadiran/:karyawanId/:startDate/:endDate', authenticateToken, attendanceController.getKehadiranBetweenDates);
app.get('/kehadiran/:karyawanId/:date', authenticateToken, attendanceController.getKehadiranOnDate);
app.put('/kehadiran/change', authenticateToken, IsAdmin, attendanceController.changeKehadiranOnDate);
// New routes
app.get('/kehadiran/today', authenticateToken, attendanceController.getAllKehadiranOnDate);
app.get('/kehadiran/:startDate/:endDate', authenticateToken, attendanceController.getAllKehadiranBetweenDates);
app.get('/recent-activities', authenticateToken, attendanceController.getRecentActivities);
app.get('/daily-attendance', authenticateToken, attendanceController.getDailyAttendanceStats);
  
// project 
app.post('/projects',  IsAdmin,projectcontroller.addProject); // Only admin can add projects // tested
app.get('/projects', projectcontroller.getAllProjects); // tested
app.get('/projects/:projectId', projectcontroller.getProjectById); // tested
app.get('/projects/karyawan/:karyawanId', projectcontroller.getProjectsByKaryawanId); // tested
app.get('/projects/:projectId/members', projectcontroller.getMembersOfProject); // tested
app.get('/active-projects', projectcontroller.getActiveProjects); // tested
app.post('/projects/addKaryawan', projectcontroller.addKaryawanToProject); // Only admin can add karyawan to projects // tested
app.put('/projects/editDate', projectcontroller.editProjectDate); // Only admin can edit project dates // tested

// activity log
app.post('/activitylog',authenticateToken, activityLogController.addActivityLog); // tested
app.get('/activitylog/:karyawanId', authenticateToken, activityLogController.getActivityLogs); // tested
app.get('/activitylog/:date', authenticateToken, activityLogController.getActivityLogsByDate);
app.put('/activitylog/:karyawanId/:activitylogid', authenticateToken, activityLogController.editActivityLog); // tested
app.post('/activitylog/:karyawanId/:activitylogid/accept',IsAdmin, authenticateToken, activityLogController.acceptActivityLog);// tested
app.post('/activitylog/:karyawanId/:activitylogid/reject',IsAdmin, authenticateToken, activityLogController.rejectActivityLog);// tested 
app.get('/all-logs', activityLogController.getAllActivityLogs);

// debt time logger
app.get('/debttime/total/:karyawanId', getSumDebtTimeByKaryawanId); // tested
app.get('/debttime/report/:date', getReportOfDebtTimeByDate); // tested
app.get('/debttime/detail/:karyawanId/:date', getDetailDebtTimeOnDate); // tested
app.get('/debttime/all/:karyawanId', getAllReportDebtTimeOfKaryawan); // tested

// worktime counter
app.get('/worktime/:karyawanId/:date', getWorkTimeExcludingBreaksController); // New route
app.get('/worktimedate/:date', getAllWorkTimeByDateController); // New route
app.get('/worktimehistory/:karyawanId', getWorkTimeHistoryByKaryawanIdController); // New route



const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
