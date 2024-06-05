const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require("dotenv");
const router = express.Router();
const app = express();
const multer = require('multer')
const storage = multer.memoryStorage();
const upload = multer({ storage });
const karyawanController = require('./controller/karyawancontroller');
const attendanceController = require('./controller/attendancecontroller');
const reportcontroller = require('./controller/reportcontroller');
const activitylogcontroller = require('./controller/activitylogcontroller');
const projectcontroller = require('./controller/projectcontroller');
const activityLogController = require('./controller/activitylogcontroller');
const {authenticateToken, IsAdmin} = require('./middleware/authmiddleware');


// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use('/v1', router);
dotenv.config();

// endpoint
router.post('/karyawan/register', upload.single('profile_photo'), karyawanController.createKaryawan); // tested
router.get('/karyawan/:id', karyawanController.getKaryawanById); // tested
router.post('/karyawan/request-password-reset', karyawanController.requestPasswordReset); // tested
router.post('/karyawan/reset-password', karyawanController.resetPassword); // tested
router.post('/karyawan/login', karyawanController.login); // tested

// attendance
router.post('/attendance/checkin', authenticateToken, attendanceController.checkIn); // tested
router.get('/attendance/:karyawanId/:date', authenticateToken, attendanceController.getAttendance); // tested
router.get('/report/karyawan/:karyawanId', authenticateToken, attendanceController.getKaryawanReport); // tested
router.get('/report/date/:date', authenticateToken, reportcontroller.getDayReport); // tested

// activity log

router.patch('/karyawan/:karyawanId/activity_logs/:activitylogid/reject', authenticateToken, activitylogcontroller.rejectActivityLog);  
router.patch('/karyawan/:karyawanId/activity_logs/:activitylogid/accept', authenticateToken, activitylogcontroller.acceptActivityLog); 
router.put('/karyawan/:karyawanId/activity_logs/:activitylogid', authenticateToken, activitylogcontroller.editActivityLog);
router.get('/karyawan/:karyawanId/activity_logs', authenticateToken, activitylogcontroller.getActivityLogs);
router.post('/karyawan/:karyawanId/activity_logs', authenticateToken, activitylogcontroller.addActivityLog);
  
// project 

router.post('/projects',  projectcontroller.addProject); // Only admin can add projects // tested
router.get('/projects', projectcontroller.getAllProjects); // tested
router.get('/projects/:projectId', projectcontroller.getProjectById); // tested
router.get('/projects/karyawan/:karyawanId', projectcontroller.getProjectsByKaryawanId); // tested
router.get('/projects/:projectId/members', projectcontroller.getMembersOfProject); // tested
router.get('/active-projects', projectcontroller.getActiveProjects); // tested
router.post('/projects/addKaryawan', projectcontroller.addKaryawanToProject); // Only admin can add karyawan to projects // tested
router.put('/projects/editDate', projectcontroller.editProjectDate); // Only admin can edit project dates // tested

// activity log

// Routes for activity logs
router.post('/activitylog', authenticateToken, activityLogController.addActivityLog); // tested
router.get('/activitylog/:karyawanId', authenticateToken, activityLogController.getActivityLogs); // tested
router.put('/activitylog/:karyawanId/:activitylogid', authenticateToken, activityLogController.editActivityLog); // tested
router.post('/activitylog/:karyawanId/:activitylogid/accept', authenticateToken, activityLogController.acceptActivityLog);// tested
router.post('/activitylog/:karyawanId/:activitylogid/reject', authenticateToken, activityLogController.rejectActivityLog);





const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
