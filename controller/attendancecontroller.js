const { db } = require('../firebase');
const moment = require('moment');

const checkIn = async (req, res) => {
  try {
      const { type } = req.body; // type can be 'start', 'resume', 'end'
      const karyawanId = req.karyawanId; // Ensure karyawanId is correctly extracted from the request
      const now = moment();

      // Check if karyawanId is defined
      if (!karyawanId) {
          return res.status(400).json({ message: 'Invalid karyawan ID' });
      }

      const karyawanDoc = await db.collection('karyawan').doc(karyawanId).get();
      if (!karyawanDoc.exists) {
          return res.status(404).json({ message: 'Karyawan not found' });
      }

      const shift = karyawanDoc.data().shift.toLowerCase(); // Ensure the shift name is in lowercase

      const attendanceRef = db.collection('attendance').doc(`${karyawanId}-${now.format('YYYYMMDD')}`);
      const attendanceDoc = await attendanceRef.get();

      if (!attendanceDoc.exists) {
          await attendanceRef.set({
              karyawanId: karyawanId,
              date: now.format('YYYY-MM-DD'),
              checkInTimes: {
                  start: null,
                  resume: null,
                  end: null,
                  break: null
              },
              timeDebt: 0
          });
      }

      const attendanceData = (await attendanceRef.get()).data();

      // Adjust check-in times based on shift
      let startTime, endTime, breakStart, breakEnd;
      if (shift === 'pagi') {
          startTime = moment(now.format('YYYY-MM-DD') + ' 09:00:00');
          endTime = moment(now.format('YYYY-MM-DD') + ' 17:00:00');
          breakStart = moment(now.format('YYYY-MM-DD') + ' 13:00:00');
          breakEnd = moment(now.format('YYYY-MM-DD') + ' 14:00:00');
      } else if (shift === 'siang') {
          startTime = moment(now.format('YYYY-MM-DD') + ' 13:00:00');
          endTime = moment(now.format('YYYY-MM-DD') + ' 21:00:00');
          breakStart = moment(now.format('YYYY-MM-DD') + ' 17:00:00');
          breakEnd = moment(now.format('YYYY-MM-DD') + ' 18:00:00');
      } else {
          return res.status(400).json({ message: 'Invalid shift' });
      }

      // Handling check-in types
      if (type === 'start') {
          let timeDebt = 0;
          if (now.isAfter(startTime)) {
              timeDebt = now.diff(startTime, 'minutes');
          }
          attendanceData.checkInTimes.start = now.format();
          attendanceData.timeDebt += timeDebt;
      } else if (type === 'resume') {
          if (!attendanceData.checkInTimes.start) {
              return res.status(400).json({ message: 'No start recorded' });
          }
          if (!attendanceData.checkInTimes.break) {
              return res.status(400).json({ message: 'No break recorded' });
          }
          const lastBreakTime = moment(attendanceData.checkInTimes.break);
          const breakDuration = now.diff(lastBreakTime, 'minutes');
          if (breakDuration > 60) {
              attendanceData.timeDebt += breakDuration - 60;
          }
          attendanceData.checkInTimes.resume = now.format();
      } else if (type === 'end') {
          if (now.isAfter(endTime)) {
              return res.status(400).json({ message: 'End time already passed' });
          }
          const shiftEndTime = endTime.clone().subtract(attendanceData.timeDebt, 'minutes');
          if (now.isBefore(shiftEndTime)) {
              return res.status(400).json({ message: 'End time before shift end' });
          }
          attendanceData.checkInTimes.end = now.format();
          attendanceData.timeDebt = Math.max(0, attendanceData.timeDebt - now.diff(endTime, 'minutes'));
      } else if (type === 'break') {
          attendanceData.checkInTimes.break = now.format();
      } else {
          return res.status(400).json({ message: 'Invalid check-in type' });
      }

      await attendanceRef.update(attendanceData);
      res.status(200).json(attendanceData);
  } catch (error) {
      console.error('Error checking in:', error);
      res.status(500).json({ message: 'Error checking in', error: error.message });
  }
};


// Function to get attendance by karyawan and date
const getAttendance = async (req, res) => {
  try {
    const { karyawanId, date } = req.params;
    const attendanceRef = db.collection('attendance').doc(`${karyawanId}-${date}`);
    const attendanceDoc = await attendanceRef.get();

    if (!attendanceDoc.exists) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    res.status(200).json(attendanceDoc.data());
  } catch (error) {
    console.error('Error retrieving attendance:', error);
    res.status(500).json({ message: 'Error retrieving attendance', error: error.message });
  }
};

// Function to get attendance report for a karyawan
const getKaryawanReport = async (req, res) => {
  try {
    const { karyawanId } = req.params;
    const snapshot = await db.collection('attendance')
      .where('karyawanId', '==', karyawanId)
      .orderBy('date', 'asc')
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No attendance records found on get report per karyawan' });
    }

    const report = [];
    snapshot.forEach(doc => {
      report.push(doc.data());
    });

    res.status(200).json(report);
  } catch (error) {
    console.error('Error retrieving karyawan report:', error);
    res.status(500).json({ message: 'Error retrieving karyawan report', error: error.message });
  }
};

module.exports = {
  checkIn,
  getAttendance,
  getKaryawanReport
};
