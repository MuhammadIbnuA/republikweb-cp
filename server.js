const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require("dotenv");
const router = express.Router();
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
const debttimecontroller = require('./controller/debttimecontroller');
const {authenticateToken, IsAdmin} = require('./middleware/authmiddleware');


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
router.post('/karyawan/register', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'barcode', maxCount: 1 }
]), karyawanController.createKaryawan, cors()); // tested
router.get('/karyawan/:id', karyawanController.getKaryawanById); // tested
router.post('/karyawan/request-password-reset', karyawanController.requestPasswordReset); // tested deploy
router.post('/karyawan/reset-password', karyawanController.resetPassword); // tested deploy
router.post('/karyawan/login', karyawanController.login); // tested

// attendance
router.post('/attendance/checkin', authenticateToken, attendanceController.checkIn); // tested
router.get('/attendance/:karyawanId/:date', authenticateToken, attendanceController.getAttendance); // tested
router.get('/report/karyawan/:karyawanId', authenticateToken, attendanceController.getKaryawanReport); // tested
router.get('/report/date/:date', authenticateToken, reportcontroller.getDayReport); // tested
  
// project 
router.post('/projects',  IsAdmin,projectcontroller.addProject); // Only admin can add projects // tested
router.get('/projects', projectcontroller.getAllProjects); // tested
router.get('/projects/:projectId', projectcontroller.getProjectById); // tested
router.get('/projects/karyawan/:karyawanId', projectcontroller.getProjectsByKaryawanId); // tested
router.get('/projects/:projectId/members', projectcontroller.getMembersOfProject); // tested
router.get('/active-projects', projectcontroller.getActiveProjects); // tested
router.post('/projects/addKaryawan', projectcontroller.addKaryawanToProject); // Only admin can add karyawan to projects // tested
router.put('/projects/editDate', projectcontroller.editProjectDate); // Only admin can edit project dates // tested

// activity log
router.post('/activitylog',authenticateToken, activityLogController.addActivityLog); // tested
router.get('/activitylog/:karyawanId', authenticateToken, activityLogController.getActivityLogs); // tested
router.put('/activitylog/:karyawanId/:activitylogid', authenticateToken, activityLogController.editActivityLog); // tested
router.post('/activitylog/:karyawanId/:activitylogid/accept',IsAdmin, authenticateToken, activityLogController.acceptActivityLog);// tested
router.post('/activitylog/:karyawanId/:activitylogid/reject',IsAdmin, authenticateToken, activityLogController.rejectActivityLog);// tested 

// debt time logger
router.get('/debttime/total/:karyawanId', debttimecontroller.getSumDebtTimeByKaryawanId); // tested
router.get('/debttime/report/:date', debttimecontroller.getReportOfDebtTimeByDate); // tested
router.get('/debttime/detail/:karyawanId/:date', debttimecontroller.getDetailDebtTimeOnDate); // tested
router.get('/debttime/all/:karyawanId', debttimecontroller.getAllReportDebtTimeOfKaryawan); // tested



const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
