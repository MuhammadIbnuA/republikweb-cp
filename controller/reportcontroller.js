const { db } = require('../firebase');

// Function to get attendance report for a specific day
const getDayReport = async (req, res) => {
  try {
    const { date } = req.params;
    const { fullname } = req.query; // Ambil fullname dari query params
    
    const snapshot = await db.collection('attendance')
      .where('date', '==', date)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No attendance records found for this date' });
    }

    let report = [];
    snapshot.forEach(doc => {
      report.push(doc.data());
    });

    if (fullname) {
      // Filter hasil untuk mencocokkan substring fullname
      report = report.filter(record => 
        record.fullname && record.fullname.toLowerCase().includes(fullname.toLowerCase())
      );
    }

    if (report.length === 0) {
      return res.status(404).json({ message: 'No attendance records match the search criteria' });
    }

    res.status(200).json(report);
  } catch (error) {
    console.error('Error retrieving day report:', error);
    res.status(500).json({ message: 'Error retrieving day report', error: error.message });
  }
};

module.exports = {
  getDayReport
};