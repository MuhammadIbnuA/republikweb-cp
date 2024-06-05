const { db } = require('../firebase');

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
    getDayReport
  }