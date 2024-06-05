const { db } = require('../firebase');
const moment = require('moment');

// Function to check in or out
const checkIn = async (req, res) => {
    try {
      const { type } = req.body; // type can be 'start', 'break', 'resume', 'end'
      const karyawanId = req.karyawanId; // Ensure karyawanId is correctly extracted from the request
      const now = moment();
  
      // Check if karyawanId is defined
      if (!karyawanId) {
        return res.status(400).json({ message: 'Invalid karyawan ID' });
      }
  
      // Check if it's a working day (Monday to Friday)
      const isWorkingDay = now.isoWeekday() >= 1 && now.isoWeekday() <= 5;
      if (!isWorkingDay) {
        // Deduct time debt if presence/checkin on Saturday or Sunday
        const attendanceRef = db.collection('attendance').doc(`${karyawanId}-${now.format('YYYYMMDD')}`);
        const attendanceDoc = await attendanceRef.get();
        if (attendanceDoc.exists) {
          const attendanceData = attendanceDoc.data();
          attendanceData.timeDebt -= 60; // Deduct 60 minutes (1 hour) from time debt
          await attendanceRef.update({ timeDebt: attendanceData.timeDebt });
          return res.status(200).json({ message: 'Presence on non-working day deducted from time debt' });
        }
      }
  
      // Retrieve karyawan data from the database
      const karyawanRef = db.collection('karyawan').doc(karyawanId);
      const karyawanDoc = await karyawanRef.get();
      if (!karyawanDoc.exists) {
        return res.status(404).json({ message: 'Karyawan not found' });
      }
      const karyawanData = karyawanDoc.data();
  
      const startTime = moment(now.format('YYYY-MM-DD') + ' ' + karyawanData.startWorkTime);
      const breakTime = moment(now.format('YYYY-MM-DD') + ' ' + karyawanData.breakTime);
      const endTime = moment(now.format('YYYY-MM-DD') + ' ' + karyawanData.endWorkTime);
  
      // Define check-in times based on the type
      let checkInTime;
      if (type === 'start') {
        checkInTime = startTime;
      } else if (type === 'break') {
        checkInTime = breakTime;
      } else if (type === 'resume') {
        checkInTime = breakTime.add(1, 'hour'); // Resume after 1 hour break
      } else if (type === 'end') {
        checkInTime = endTime;
      } else {
        return res.status(400).json({ message: 'Invalid action type' });
      }
  
      // Check if the current time is within the valid check-in window
      if (now.isBefore(checkInTime)) {
        return res.status(400).json({ message: `It's not yet time for ${type}` });
      }
  
      // Proceed with check-in
      const attendanceRef = db.collection('attendance').doc(`${karyawanId}-${now.format('YYYYMMDD')}`);
      const attendanceDoc = await attendanceRef.get();
  
      if (!attendanceDoc.exists) {
        await attendanceRef.set({
          karyawanId: karyawanId,
          date: now.format('YYYY-MM-DD'),
          checkInTimes: {
            start: null,
            break: null,
            resume: null,
            end: null
          },
          timeDebt: 0
        });
      }
  
      const attendanceData = (await attendanceRef.get()).data();
  
      // Update check-in time based on the type
      attendanceData.checkInTimes[type] = now.format();
  
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
      return res.status(404).json({ message: 'No attendance records found' });
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

// Function to get attendance report for a specific day
const getDayReport = async (req, res) => {
  try {
    const { date } = req.params;
    const snapshot = await db.collection('attendance')
      .where('date', '==', date)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No attendance records found for this date' });
    }

    const report = [];
    snapshot.forEach(doc => {
      report.push(doc.data());
    });

    res.status(200).json(report);
  } catch (error) {
    console.error('Error retrieving day report:', error);
    res.status(500).json({ message: 'Error retrieving day report', error: error.message });
  }
};

module.exports = {
  checkIn,
  getAttendance,
  getKaryawanReport,
  getDayReport
};
