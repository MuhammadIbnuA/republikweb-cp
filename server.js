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
const authenticateToken = require('./middleware/authmiddleware');


// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use('/v1', router);
dotenv.config();





// endpoint
router.post('/karyawan/register', upload.single('profile_photo'), karyawanController.createKaryawan);
router.get('/karyawan/:id', karyawanController.getKaryawanById);
router.post('/karyawan/request-password-reset', karyawanController.requestPasswordReset);
router.post('/karyawan/reset-password', karyawanController.resetPassword);
router.post('/karyawan/login', karyawanController.login);

// attendance
router.post('/attendance/checkin', authenticateToken, attendanceController.checkIn);
router.get('/attendance/:karyawanId/:date', authenticateToken, attendanceController.getAttendance);
router.get('/attendance/karyawan/:karyawanId', authenticateToken, attendanceController.getKaryawanReport);
router.get('/attendance/day/:date', authenticateToken, attendanceController.getDayReport);




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
