const { db } = require('../firebase');
const jwt = require('jsonwebtoken');
const moment = require('moment');

const addActivityLog = async (req, res) => {
  try {
    const { description } = req.body;

    // Decode the token to get the karyawanId (or username)
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const karyawanId = decodedToken.karyawanId;

    const now = moment().format('YYYYMMDDHHmmss');
    const activitylogid = `${karyawanId}-${now}`;
    const date = new Date();
    const status = 'pending'; // default status

    const activityLogData = {
      activitylogid,
      date,
      description,
      status
    };

    const activityLogRef = db.collection('karyawan').doc(karyawanId).collection('activity_logs').doc(activitylogid);
    await activityLogRef.set(activityLogData);

    res.status(201).json({ message: 'Activity log created successfully', activityLogData });
  } catch (error) {
    console.error('Error creating activity log:', error);
    res.status(500).json({ message: 'Error creating activity log', error: error.message });
  }
};

const getActivityLogs = async (req, res) => {
  try {
    const { karyawanId } = req.params;

    const snapshot = await db.collection('karyawan').doc(karyawanId).collection('activity_logs').get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No activity logs found for this karyawan' });
    }

    const logs = [];
    snapshot.forEach(doc => {
      logs.push(doc.data());
    });

    res.status(200).json(logs);
  } catch (error) {
    console.error('Error retrieving activity logs:', error);
    res.status(500).json({ message: 'Error retrieving activity logs', error: error.message });
  }
};

const editActivityLog = async (req, res) => {
  try {
    const { karyawanId, activitylogid } = req.params;
    const { description, status } = req.body;

    const activityLogRef = db.collection('karyawan').doc(karyawanId).collection('activity_logs').doc(activitylogid);
    const activityLogDoc = await activityLogRef.get();

    if (!activityLogDoc.exists) {
      return res.status(404).json({ message: 'Activity log not found' });
    }

    const updatedData = {
      ...(description && { description }),
      ...(status && { status })
    };

    await activityLogRef.update(updatedData);
    res.status(200).json({ message: 'Activity log updated successfully' });
  } catch (error) {
    console.error('Error editing activity log:', error);
    res.status(500).json({ message: 'Error editing activity log', error: error.message });
  }
};

const acceptActivityLog = async (req, res) => {
  try {
    const { karyawanId, activitylogid } = req.params;

    const activityLogRef = db.collection('karyawan').doc(karyawanId).collection('activity_logs').doc(activitylogid);
    const activityLogDoc = await activityLogRef.get();

    if (!activityLogDoc.exists) {
      return res.status(404).json({ message: 'Activity log not found' });
    }

    await activityLogRef.update({ status: 'accepted' });
    res.status(200).json({ message: 'Activity log accepted successfully' });
  } catch (error) {
    console.error('Error accepting activity log:', error);
    res.status(500).json({ message: 'Error accepting activity log', error: error.message });
  }
};

const rejectActivityLog = async (req, res) => {
  try {
    const { karyawanId, activitylogid } = req.params;

    const activityLogRef = db.collection('karyawan').doc(karyawanId).collection('activity_logs').doc(activitylogid);
    const activityLogDoc = await activityLogRef.get();

    if (!activityLogDoc.exists) {
      return res.status(404).json({ message: 'Activity log not found' });
    }

    await activityLogRef.update({ status: 'rejected' });
    res.status(200).json({ message: 'Activity log rejected successfully' });
  } catch (error) {
    console.error('Error rejecting activity log:', error);
    res.status(500).json({ message: 'Error rejecting activity log', error: error.message });
  }
};

const getActivityLogsByDate = async (req, res) => {
  try {
    const { date } = req.query;

    // Convert the date to a Date object and get the start and end of the day
    const start = moment(date).startOf('day').toDate();
    const end = moment(date).endOf('day').toDate();

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Query all activity logs within the date range
    const snapshot = await db.collectionGroup('activity_logs')
      .where('date', '>=', start)
      .where('date', '<=', end)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No activity logs found on the specified date' });
    }

    const logs = [];
    snapshot.forEach(doc => {
      logs.push(doc.data());
    });

    res.status(200).json(logs);
  } catch (error) {
    console.error('Error retrieving activity logs by date:', error);
    res.status(500).json({ message: 'Error retrieving activity logs by date', error: error.message });
  }
};

const getAllActivityLogs = async (req, res) => {
  try {
    const snapshot = await db.collectionGroup('activity_logs').get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No activity logs found' });
    }

    const logs = [];
    snapshot.forEach(doc => {
      logs.push(doc.data());
    });

    res.status(200).json(logs);
  } catch (error) {
    console.error('Error retrieving all activity logs:', error);
    res.status(500).json({ message: 'Error retrieving all activity logs', error: error.message });
  }
};

module.exports = {
  addActivityLog,
  getActivityLogs,
  editActivityLog,
  acceptActivityLog,
  rejectActivityLog,
  getActivityLogsByDate,
  getActivityLogs,
  getAllActivityLogs
};
