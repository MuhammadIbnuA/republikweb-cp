const { db } = require('../firebase');
const moment = require('moment');

// Model functions
const getTimeDebtByKaryawanId = async (karyawanId) => {
    const snapshot = await db.collection('attendance')
        .where('karyawanId', '==', karyawanId)
        .get();

    let totalDebtTime = 0;
    snapshot.forEach(doc => {
        totalDebtTime += doc.data().timeDebt;
    });

    return totalDebtTime;
};

const getTimeDebtReportByDate = async (date) => {
    console.log(`Fetching time debt report for date: ${date}`);
    const snapshot = await db.collection('attendance')
        .where('date', '==', date)
        .get();

    const report = [];
    snapshot.forEach(doc => {
        console.log(`Document found: ${doc.id}`);
        report.push({
            karyawanId: doc.data().karyawanId,
            timeDebt: doc.data().timeDebt,
            date: doc.data().date,
        });
    });

    return report;
};


const getTimeDebtDetailByDate = async (karyawanId, date) => {
    const docRef = db.collection('attendance').doc(`${karyawanId}-${date}`);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new Error('Attendance record not found');
    }

    return doc.data();
};

const getAllTimeDebtReportsByKaryawan = async (karyawanId) => {
    const snapshot = await db.collection('attendance')
        .where('karyawanId', '==', karyawanId)
        .orderBy('date', 'asc')
        .get();

    const report = [];
    snapshot.forEach(doc => {
        report.push(doc.data());
    });

    return report;
};

// Controller functions
const getSumDebtTimeByKaryawanId = async (req, res) => {
    try {
        const { karyawanId } = req.params;
        const totalDebtTime = await getTimeDebtByKaryawanId(karyawanId);
        res.status(200).json({ karyawanId, totalDebtTime });
    } catch (error) {
        console.error('Error getting total debt time:', error);
        res.status(500).json({ message: 'Error getting total debt time', error: error.message });
    }
};

const getReportOfDebtTimeByDate = async (req, res) => {
    try {
        const { date } = req.params;
        console.log(`Requested date: ${date}`);
        const report = await getTimeDebtReportByDate(date);
        console.log(`Report fetched: ${JSON.stringify(report)}`);
        res.status(200).json(report);
    } catch (error) {
        console.error('Error getting debt time report by date:', error);
        res.status(500).json({ message: 'Error getting debt time report by date', error: error.message });
    }
};


const getDetailDebtTimeOnDate = async (req, res) => {
    try {
        const { karyawanId, date } = req.params;
        const detail = await getTimeDebtDetailByDate(karyawanId, date);
        res.status(200).json(detail);
    } catch (error) {
        console.error('Error getting debt time detail on date:', error);
        res.status(500).json({ message: 'Error getting debt time detail on date', error: error.message });
    }
};

const getAllReportDebtTimeOfKaryawan = async (req, res) => {
    try {
        const { karyawanId } = req.params;
        const report = await getAllTimeDebtReportsByKaryawan(karyawanId);
        res.status(200).json(report);
    } catch (error) {
        console.error('Error getting all debt time reports of karyawan:', error);
        res.status(500).json({ message: 'Error getting all debt time reports of karyawan', error: error.message });
    }
};

module.exports = {
    getSumDebtTimeByKaryawanId,
    getReportOfDebtTimeByDate,
    getDetailDebtTimeOnDate,
    getAllReportDebtTimeOfKaryawan,
};
