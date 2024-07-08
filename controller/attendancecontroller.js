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

// Fungsi untuk generate data kehadiran otomatis
const generateAttendanceData = async () => {
  try {
    const now = moment();
    const date = now.format('YYYY-MM-DD');
    const startOfDay = now.startOf('day').format('YYYY-MM-DD');

    // Ambil semua karyawan dari koleksi 'karyawan'
    const karyawanSnapshot = await db.collection('karyawan').where('isAdmin', '==', false).get();

    if (karyawanSnapshot.empty) {
      console.log('No karyawan records found');
      return;
    }

    // Iterasi setiap karyawan dan buat data kehadiran jika tidak ada
    const batch = db.batch();
    karyawanSnapshot.forEach(doc => {
      const karyawanId = doc.id;
      const attendanceRef = db.collection('attendance').doc(`${karyawanId}-${date}`);
      attendanceRef.get().then(attendanceDoc => {
        if (!attendanceDoc.exists) {
          batch.set(attendanceRef, {
            karyawanId: karyawanId,
            date: date,
            checkInTimes: {
              start: null,
              resume: null,
              end: null,
              break: null
            },
            timeDebt: 0,
            status: 'tidak hadir', // Status default
            fullname: doc.data().fullname
          });
        }
      });
    });

    await batch.commit();
    console.log('Attendance data generated successfully');
  } catch (error) {
    console.error('Error generating attendance data:', error);
  }
};

// Menjadwalkan tugas untuk dijalankan setiap hari pada pukul 00:01
cron.schedule('*/1 * * * *', generateAttendanceData, {
  scheduled: true,
  timezone: 'Asia/Jakarta' // Menggunakan zona waktu Jakarta (GMT+7)
});

console.log('Cron job scheduled to run daily at 00:01');

const checkIn = async (req, res) => {
  try {
    const { type } = req.body; // type can be 'start', 'resume', 'end', 'break'
    const karyawanId = req.karyawanId; // Ensure karyawanId is correctly extracted from the request
    const now = moment();

    if (!karyawanId) {
      return res.status(400).json({ message: 'Invalid karyawan ID' });
    }

    const karyawanDoc = await db.collection('karyawan').doc(karyawanId).get();
    if (!karyawanDoc.exists) {
      return res.status(404).json({ message: 'Karyawan not found' });
    }

    const karyawanData = karyawanDoc.data();
    const shift = karyawanData.shift.toLowerCase();

    const attendanceRef = db.collection('attendance').doc(`${karyawanId}-${now.format('YYYYMMDD')}`);
    const attendanceDoc = await attendanceRef.get();

    if (!attendanceDoc.exists) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    const attendanceData = attendanceDoc.data();

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
      if (!attendanceData.checkInTimes.start || !attendanceData.checkInTimes.break) {
        return res.status(400).json({ message: 'No start or break recorded' });
      }
      const lastBreakTime = moment(attendanceData.checkInTimes.break);
      const breakDuration = now.diff(lastBreakTime, 'minutes');
      if (breakDuration > 60) {
        attendanceData.timeDebt += breakDuration - 60;
      }
      attendanceData.checkInTimes.resume = now.format();
    } else if (type === 'end') {
      const startTime = moment(attendanceData.checkInTimes.start);
      const totalWorkedMinutes = now.diff(startTime, 'minutes');
      const requiredWorkMinutes = shift === 'pagi' ? 8 * 60 : 8 * 60;

      const workDebt = requiredWorkMinutes - totalWorkedMinutes;
      if (workDebt > 0) {
        attendanceData.timeDebt += workDebt;
      }

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

      shiftDetails.push({
        karyawanId: doc.id, // Add karyawanId
        fullname: karyawanData.fullname,
        shift: karyawanData.shift,
        jam_masuk: karyawanData.jam_masuk,
        jam_pulang: karyawanData.jam_pulang
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

    // Default shift times
    const shiftDefaults = {
      pagi: { jam_masuk: '09:00', jam_pulang: '17:00' },
      siang: { jam_masuk: '13:00', jam_pulang: '21:00' },
    };

    // Create an object to store the fields to update
    const updateData = { shift };

    // Only add jam_masuk and jam_pulang to updateData if they are provided, otherwise use defaults
    if (jam_masuk !== undefined) {
      updateData.jam_masuk = jam_masuk;
    } else {
      updateData.jam_masuk = shiftDefaults[shift].jam_masuk;
    }

    if (jam_pulang !== undefined) {
      updateData.jam_pulang = jam_pulang;
    } else {
      updateData.jam_pulang = shiftDefaults[shift].jam_pulang;
    }

    // Update shift details
    await karyawanRef.update(updateData);

    res.status(200).json({ message: 'Shift details updated successfully' });
  } catch (error) {
    console.error('Error updating shift details:', error);
    res.status(500).json({ message: 'Error updating shift details', error: error.message });
  }
};

  const updateMultipleShiftDetails = async (req, res) => {
    try {
      const { shifts } = req.body; // Expecting an array of shift updates
      if (!Array.isArray(shifts) || shifts.length === 0) {
        return res.status(400).json({ message: 'Invalid input: Expected an array of shift updates.' });
      }

      const batch = db.batch(); // Initialize a batch operation

      // Iterate through each shift update
      shifts.forEach(update => {
        const { karyawanId, shift, jam_masuk, jam_pulang } = update;

        const validShifts = ['pagi', 'siang'];
        if (!validShifts.includes(shift)) {
          throw new Error(`Invalid shift type for karyawanId ${karyawanId}`);
        }

        // Prepare default shift times
        const shiftDefaults = {
          pagi: { jam_masuk: '09:00', jam_pulang: '17:00' },
          siang: { jam_masuk: '13:00', jam_pulang: '21:00' },
        };

        // Create an object to store the fields to update
        const updateData = { shift };

        // Only add jam_masuk and jam_pulang to updateData if they are provided, otherwise use defaults
        updateData.jam_masuk = jam_masuk || shiftDefaults[shift].jam_masuk;
        updateData.jam_pulang = jam_pulang || shiftDefaults[shift].jam_pulang;

        // Prepare the update operation for the batch
        const karyawanRef = db.collection('karyawan').doc(karyawanId);
        batch.update(karyawanRef, updateData);
      });

      // Commit the batch operation
      await batch.commit();

      res.status(200).json({ message: 'Shift details updated successfully for all employees' });
    } catch (error) {
      console.error('Error updating multiple shift details:', error);
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

// Function to get kehadiran log for all karyawan
const getKehadiranLogForAllKaryawan = async (req, res) => {
  try {
    // First, get all karyawan documents excluding admins
    const karyawanSnapshot = await db.collection('karyawan').where('isAdmin', '==', false).get();

    if (karyawanSnapshot.empty) {
      return res.status(404).json({ message: 'No karyawan records found' });
    }

    // Extract karyawan IDs to filter kehadiran logs
    const karyawanIds = karyawanSnapshot.docs.map(doc => doc.id);

    // Get kehadiran logs for the filtered karyawan IDs
    const kehadiranSnapshot = await db.collection('kehadiran').where('karyawanId', 'in', karyawanIds).get();

    if (kehadiranSnapshot.empty) {
      return res.status(404).json({ message: 'No kehadiran logs found' });
    }

    // Group logs by karyawanId
    const groupedLogs = kehadiranSnapshot.docs.reduce((acc, doc) => {
      const log = doc.data();
      const { karyawanId, fullname, NIP, status } = log;

      if (!acc[karyawanId]) {
        acc[karyawanId] = {
          fullname,
          NIP,
          totalHadir: 0,
          totalIzin: 0,
          totalTidakHadir: 0
        };
      }

      if (status === 'hadir') {
        acc[karyawanId].totalHadir += 1;
      } else if (status === 'izin') {
        acc[karyawanId].totalIzin += 1;
      } else if (status === 'tidak hadir') {
        acc[karyawanId].totalTidakHadir += 1;
      }

      return acc;
    }, {});

    // Convert groupedLogs object to an array
    const response = Object.values(groupedLogs);

    res.status(200).json(response);
  } catch (error) {
    console.error('Error retrieving kehadiran log for all karyawan:', error);
    res.status(500).json({ message: 'Error retrieving kehadiran log for all karyawan', error: error.message });
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

// Function to get total number of employees and their attendance status for today
const getDailyAttendanceStats = async (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    
    // Fetch total number of employees
    const karyawanSnapshot = await db.collection('karyawan').where('isAdmin', '==', false).get();
    const totalEmployees = karyawanSnapshot.size;

    // Fetch today's attendance records
    const kehadiranSnapshot = await db.collection('kehadiran').where('date', '==', today).get();

    // Initialize counts
    let hadirCount = 0;
    let izinCount = 0;
    let tidakHadirCount = 0;

    // Count the number of each status type
    kehadiranSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'hadir') {
        hadirCount++;
      } else if (data.status === 'izin') {
        izinCount++;
      } else if (data.status === 'tidak hadir') {
        tidakHadirCount++;
      }
    });

    // Prepare the response
    const response = {
      totalEmployees,
      hadirCount,
      izinCount,
      tidakHadirCount
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching daily attendance stats:', error);
    res.status(500).json({ message: 'Error fetching daily attendance stats', error: error.message });
  }
};

module.exports = {
  checkIn,
  getAttendance,
  getKaryawanReport,
  getTodayAttendance,
  getShiftDetails,
  updateShiftDetails,
  updateMultipleShiftDetails,
  getKehadiranLogByKaryawanId,
  getKehadiranLogForAllKaryawan,
  getKehadiranBetweenDates,
  getKehadiranOnDate,
  changeKehadiranOnDate,
  getAllKehadiranOnDate,
  getAllKehadiranBetweenDates, // Add the new function to the module exports
  getRecentActivities,
  getDailyAttendanceStats
};