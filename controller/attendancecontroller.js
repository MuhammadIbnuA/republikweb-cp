const { db } = require('../firebase');
const moment = require('moment');

// const checkIn = async (req, res) => {
//   try {
//     const { type } = req.body; // type can be 'start', 'resume', 'end', 'break'
//     const karyawanId = req.karyawanId; // Ensure karyawanId is correctly extracted from the request
//     const now = moment();

//     // Check if karyawanId is defined
//     if (!karyawanId) {
//       return res.status(400).json({ message: 'Invalid karyawan ID' });
//     }

//     const karyawanDoc = await db.collection('karyawan').doc(karyawanId).get();
//     if (!karyawanDoc.exists) {
//       return res.status(404).json({ message: 'Karyawan not found' });
//     }

//     const karyawanData = karyawanDoc.data();
//     const shift = karyawanData.shift.toLowerCase(); // Ensure the shift name is in lowercase

//     const attendanceRef = db.collection('attendance').doc(`${karyawanId}-${now.format('YYYYMMDD')}`);
//     const attendanceDoc = await attendanceRef.get();

//     if (!attendanceDoc.exists) {
//       await attendanceRef.set({
//         karyawanId: karyawanId,
//         date: now.format('YYYY-MM-DD'),
//         checkInTimes: {
//           start: null,
//           resume: null,
//           end: null,
//           break: null
//         },
//         timeDebt: 0,
//         fullname: karyawanData.fullname // Add fullname to initial attendance data
//       });
//     }

//     const attendanceData = (await attendanceRef.get()).data();

//     // Adjust check-in times based on shift
//     let startTime, endTime, breakStart, breakEnd;
//     if (shift === 'pagi') {
//       startTime = moment(now.format('YYYY-MM-DD') + ' 09:00:00');
//       endTime = moment(now.format('YYYY-MM-DD') + ' 17:00:00');
//       breakStart = moment(now.format('YYYY-MM-DD') + ' 13:00:00');
//       breakEnd = moment(now.format('YYYY-MM-DD') + ' 14:00:00');
//     } else if (shift === 'siang') {
//       startTime = moment(now.format('YYYY-MM-DD') + ' 13:00:00');
//       endTime = moment(now.format('YYYY-MM-DD') + ' 21:00:00');
//       breakStart = moment(now.format('YYYY-MM-DD') + ' 17:00:00');
//       breakEnd = moment(now.format('YYYY-MM-DD') + ' 18:00:00');
//     } else {
//       return res.status(400).json({ message: 'Invalid shift' });
//     }

//     // Handling check-in types
//     if (type === 'start') {
//       let timeDebt = 0;
//       if (now.isAfter(startTime)) {
//         timeDebt = now.diff(startTime, 'minutes');
//       }
//       attendanceData.checkInTimes.start = now.format();
//       attendanceData.timeDebt += timeDebt;
//     } else if (type === 'resume') {
//       if (!attendanceData.checkInTimes.start) {
//         return res.status(400).json({ message: 'No start recorded' });
//       }
//       if (!attendanceData.checkInTimes.break) {
//         return res.status(400).json({ message: 'No break recorded' });
//       }
//       const lastBreakTime = moment(attendanceData.checkInTimes.break);
//       const breakDuration = now.diff(lastBreakTime, 'minutes');
//       if (breakDuration > 60) {
//         attendanceData.timeDebt += breakDuration - 60;
//       }
//       attendanceData.checkInTimes.resume = now.format();
//     } else if (type === 'end') {
//       attendanceData.checkInTimes.end = now.format();
//     } else if (type === 'break') {
//       attendanceData.checkInTimes.break = now.format();
//     } else {
//       return res.status(400).json({ message: 'Invalid check-in type' });
//     }

//     await attendanceRef.update(attendanceData);
//     res.status(200).json(attendanceData);
//   } catch (error) {
//     console.error('Error checking in:', error);
//     res.status(500).json({ message: 'Error checking in', error: error.message });
//   }
// };

// Function to get attendance by karyawan and date

const checkIn = async (req, res) => {
  try {
    const { type } = req.body; // type can be 'start', 'resume', 'end', 'break'
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

    const karyawanData = karyawanDoc.data();
    const shift = karyawanData.shift.toLowerCase(); // Ensure the shift name is in lowercase

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
        timeDebt: 0,
        fullname: karyawanData.fullname // Add fullname to initial attendance data
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
      attendanceData.checkInTimes.end = now.format();
    } else if (type === 'break') {
      attendanceData.checkInTimes.break = now.format();
    } else {
      return res.status(400).json({ message: 'Invalid check-in type' });
    }

    await attendanceRef.update(attendanceData);

    // Update kehadiran status automatically
    const kehadiranRef = db.collection('kehadiran').doc(`${karyawanId}-${now.format('YYYYMMDD')}`);
    let status = 'tidak hadir';
    if (type === 'start') {
      status = 'hadir';
    }

    await kehadiranRef.set({
      karyawanId: karyawanId,
      date: now.format('YYYY-MM-DD'),
      status: status,
      fullname: karyawanData.fullname,
      NIP: karyawanData.NIP
    }, { merge: true });

    res.status(200).json(attendanceData);
  } catch (error) {
    console.error('Error checking in:', error);
    res.status(500).json({ message: 'Error checking in', error: error.message });
  }
};


const getAttendance = async (req, res) => {
  try {
    const { karyawanId, date } = req.params;
    const karyawanDoc = await db.collection('karyawan').doc(karyawanId).get();
    if (!karyawanDoc.exists) {
      return res.status(404).json({ message: 'Karyawan not found' });
    }
    const karyawanData = karyawanDoc.data();
    const attendanceRef = db.collection('attendance').doc(`${karyawanId}-${date}`);
    const attendanceDoc = await attendanceRef.get();

    if (!attendanceDoc.exists) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    const attendanceData = attendanceDoc.data();
    attendanceData.fullname = karyawanData.fullname; // Add fullname to attendance data

    res.status(200).json(attendanceData);
  } catch (error) {
    console.error('Error retrieving attendance:', error);
    res.status(500).json({ message: 'Error retrieving attendance', error: error.message });
  }
};

// Function to get attendance report for a karyawan
const getKaryawanReport = async (req, res) => {
  try {
    const { karyawanId } = req.params;
    const karyawanDoc = await db.collection('karyawan').doc(karyawanId).get();
    if (!karyawanDoc.exists) {
      return res.status(404).json({ message: 'Karyawan not found' });
    }
    const karyawanData = karyawanDoc.data();
    const snapshot = await db.collection('attendance')
      .where('karyawanId', '==', karyawanId)
      .orderBy('date', 'asc')
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No attendance records found' });
    }

    const report = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      data.fullname = karyawanData.fullname; // Add fullname to each record in the report
      report.push(data);
    });

    res.status(200).json(report);
  } catch (error) {
    console.error('Error retrieving karyawan report:', error);
    res.status(500).json({ message: 'Error retrieving karyawan report', error: error.message });
  }
};

// New function to get today's attendance for a karyawan
const getTodayAttendance = async (req, res) => {
  try {
    const karyawanId = req.karyawanId;
    const now = moment().format('YYYYMMDD');
    const karyawanDoc = await db.collection('karyawan').doc(karyawanId).get();
    if (!karyawanDoc.exists) {
      return res.status(404).json({ message: 'Karyawan not found' });
    }
    const karyawanData = karyawanDoc.data();
    const attendanceRef = db.collection('attendance').doc(`${karyawanId}-${now}`);
    const attendanceDoc = await attendanceRef.get();

    if (!attendanceDoc.exists) {
      return res.status(404).json({ message: 'Attendance record not found for today' });
    }

    const attendanceData = attendanceDoc.data();
    attendanceData.fullname = karyawanData.fullname; // Add fullname to today's attendance data

    res.status(200).json(attendanceData);
  } catch (error) {
    console.error('Error retrieving today\'s attendance:', error);
    res.status(500).json({ message: 'Error retrieving today\'s attendance', error: error.message });
  }
};

const getShiftDetails = async (req, res) => {
  try {
    const karyawanCollection = db.collection('karyawan');
    
    // Fetch all karyawan documents
    const snapshot = await karyawanCollection.get();
    if (snapshot.empty) {
      return res.status(404).json({ message: 'No karyawan records found' });
    }

    const shiftDetails = [];
    snapshot.forEach(doc => {
      const karyawanData = doc.data();

      // Skip karyawan with isAdmin = true
      if (karyawanData.isAdmin) {
        return;
      }

      const shift = karyawanData.shift.toLowerCase(); // Ensure the shift name is in lowercase
      
      let startTime, endTime;
      if (shift === 'pagi') {
        startTime = '09:00';
        endTime = '17:00';
      } else if (shift === 'siang') {
        startTime = '13:00';
        endTime = '21:00';
      } else {
        startTime = 'Unknown';
        endTime = 'Unknown';
      }

      shiftDetails.push({
        fullname: karyawanData.fullname,
        shift: karyawanData.shift,
        jam_masuk: startTime,
        jam_pulang: endTime
      });
    });

    res.status(200).json(shiftDetails);
  } catch (error) {
    console.error('Error retrieving shift details:', error);
    res.status(500).json({ message: 'Error retrieving shift details', error: error.message });
  }
};

const updateShiftDetails = async (req, res) => {
  try {
    const { karyawanId } = req.params;
    const { shift, jam_masuk, jam_pulang } = req.body;

    const validShifts = ['pagi', 'siang'];
    if (!validShifts.includes(shift)) {
      return res.status(400).json({ message: 'Invalid shift' });
    }

    // Fetch karyawan document
    const karyawanRef = db.collection('karyawan').doc(karyawanId);
    const karyawanDoc = await karyawanRef.get();
    if (!karyawanDoc.exists) {
      return res.status(404).json({ message: 'Karyawan not found' });
    }

    // Update shift details
    await karyawanRef.update({
      shift: shift,
      jam_masuk: jam_masuk,
      jam_pulang: jam_pulang
    });

    res.status(200).json({ message: 'Shift details updated successfully' });
  } catch (error) {
    console.error('Error updating shift details:', error);
    res.status(500).json({ message: 'Error updating shift details', error: error.message });
  }
};


// Function to get kehadiran log by karyawan ID
const getKehadiranLogByKaryawanId = async (req, res) => {
  try {
    const { karyawanId } = req.params;
    const snapshot = await db.collection('kehadiran').where('karyawanId', '==', karyawanId).get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No kehadiran logs found' });
    }

    const logs = [];
    snapshot.forEach(doc => logs.push(doc.data()));

    const totalHadir = logs.filter(log => log.status === 'hadir').length;
    const totalIzin = logs.filter(log => log.status === 'izin').length;
    const totalTidakHadir = logs.filter(log => log.status === 'tidak hadir').length;

    const response = {
      fullname: logs[0].fullname,
      NIP: logs[0].NIP,
      totalKehadiran: totalHadir,
      totalIzin: totalIzin,
      totalKetidakhadiran: totalTidakHadir
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error retrieving kehadiran log by karyawan ID:', error);
    res.status(500).json({ message: 'Error retrieving kehadiran log by karyawan ID', error: error.message });
  }
};

// Function to get kehadiran between dates
const getKehadiranBetweenDates = async (req, res) => {
  try {
    const { karyawanId, startDate, endDate } = req.params;
    const snapshot = await db.collection('kehadiran')
      .where('karyawanId', '==', karyawanId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No kehadiran logs found for the given date range' });
    }

    const logs = [];
    snapshot.forEach(doc => logs.push(doc.data()));

    const totalHadir = logs.filter(log => log.status === 'hadir').length;
    const totalIzin = logs.filter(log => log.status === 'izin').length;
    const totalTidakHadir = logs.filter(log => log.status === 'tidak hadir').length;

    const response = {
      fullname: logs[0].fullname,
      NIP: logs[0].NIP,
      totalKehadiran: totalHadir,
      totalIzin: totalIzin,
      totalKetidakhadiran: totalTidakHadir
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error retrieving kehadiran logs between dates:', error);
    res.status(500).json({ message: 'Error retrieving kehadiran logs between dates', error: error.message });
  }
};

// Function to get kehadiran on a specific date
const getKehadiranOnDate = async (req, res) => {
  try {
    const { karyawanId, date } = req.params;
    const logDoc = await db.collection('kehadiran').doc(`${karyawanId}-${date}`).get();

    if (!logDoc.exists) {
      return res.status(404).json({ message: 'Kehadiran log not found for the given date' });
    }

    const logData = logDoc.data();
    const response = {
      fullname: logData.fullname,
      NIP: logData.NIP,
      status: logData.status
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error retrieving kehadiran log on date:', error);
    res.status(500).json({ message: 'Error retrieving kehadiran log on date', error: error.message });
  }
};

// Admin function to change kehadiran status on a specific date
const changeKehadiranOnDate = async (req, res) => {
  try {
    const { karyawanId, date, status } = req.body;
    const validStatuses = ['hadir', 'tidak hadir', 'izin'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const logRef = db.collection('kehadiran').doc(`${karyawanId}-${date}`);
    const logDoc = await logRef.get();

    if (!logDoc.exists) {
      return res.status(404).json({ message: 'Kehadiran log not found for the given date' });
    }

    await logRef.update({ status: status });

    res.status(200).json({ message: 'Kehadiran status updated successfully' });
  } catch (error) {
    console.error('Error changing kehadiran status on date:', error);
    res.status(500).json({ message: 'Error changing kehadiran status on date', error: error.message });
  }
};

const getAllKehadiranOnDate = async (req, res) => {
  try {
    const date = moment().format('YYYYMMDD');
    const snapshot = await db.collection('kehadiran').where('date', '==', date).get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No kehadiran logs found for today' });
    }

    const logs = [];
    snapshot.forEach(doc => logs.push(doc.data()));

    res.status(200).json(logs);
  } catch (error) {
    console.error('Error retrieving kehadiran logs for today:', error);
    res.status(500).json({ message: 'Error retrieving kehadiran logs for today', error: error.message });
  }
};

const getAllKehadiranBetweenDates = async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    const snapshot = await db.collection('kehadiran')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No kehadiran logs found for the given date range' });
    }

    const logs = [];
    snapshot.forEach(doc => logs.push(doc.data()));

    res.status(200).json(logs);
  } catch (error) {
    console.error('Error retrieving kehadiran logs between dates:', error);
    res.status(500).json({ message: 'Error retrieving kehadiran logs between dates', error: error.message });
  }
};

const getRecentActivities = async (req, res) => {
  try {
    const now = moment();
    const startOfDay = now.clone().startOf('day').format('YYYY-MM-DD');

    // Fetch all attendance records from today
    const snapshot = await db.collection('attendance')
      .where('date', '==', startOfDay)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No attendance records found for today' });
    }

    const activities = [];
    const karyawanIdSet = new Set();

    // Collect all karyawanIds for later querying
    snapshot.forEach(doc => {
      const data = doc.data();
      const checkInTimes = data.checkInTimes;

      if (checkInTimes) {
        karyawanIdSet.add(data.karyawanId);
      }
    });

    // Fetch karyawan fullnames based on karyawanIds
    const karyawanDocs = await Promise.all(Array.from(karyawanIdSet).map(id => db.collection('karyawan').doc(id).get()));
    const karyawanMap = new Map();
    karyawanDocs.forEach(doc => {
      if (doc.exists) {
        const karyawanData = doc.data();
        karyawanMap.set(karyawanData.karyawan_id, karyawanData.fullname);
      }
    });

    // Prepare activities with fullnames and check-in times
    snapshot.forEach(doc => {
      const data = doc.data();
      const karyawanId = data.karyawanId;
      const fullname = karyawanMap.get(karyawanId) || 'Unknown';

      const checkInTimes = data.checkInTimes;

      // Add activities to array with timestamps
      if (checkInTimes) {
        if (checkInTimes.start) {
          activities.push({ type: 'Masuk', activity: `${fullname} Masuk`, time: moment(checkInTimes.start).unix() });
        }
        if (checkInTimes.resume) {
          activities.push({ type: 'Kembali', activity: `${fullname} Kembali`, time: moment(checkInTimes.resume).unix() });
        }
        if (checkInTimes.end) {
          activities.push({ type: 'Pulang', activity: `${fullname} Pulang`, time: moment(checkInTimes.end).unix() });
        }
        if (checkInTimes.break) {
          activities.push({ type: 'Istirahat', activity: `${fullname} Istirahat`, time: moment(checkInTimes.break).unix() });
        }
      }
    });

    // Sort activities by the most recent check-in time (descending)
    activities.sort((a, b) => b.time - a.time);

    // Format the output
    const formattedActivities = activities.map(activity => ({
      type: activity.type,
      activity: `${activity.activity} ${moment.unix(activity.time).fromNow()}`
    }));

    res.status(200).json(formattedActivities);
  } catch (error) {
    console.error('Error retrieving recent activities:', error);
    res.status(500).json({ message: 'Error retrieving recent activities', error: error.message });
  }
};

module.exports = {
  checkIn,
  getAttendance,
  getKaryawanReport,
  getTodayAttendance,
  getShiftDetails,
  updateShiftDetails,
  getKehadiranLogByKaryawanId,
  getKehadiranBetweenDates,
  getKehadiranOnDate,
  changeKehadiranOnDate,
  getAllKehadiranOnDate,
  getAllKehadiranBetweenDates, // Add the new function to the module exports
  getRecentActivities
};