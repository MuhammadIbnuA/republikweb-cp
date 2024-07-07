const { db, bucket } = require('../firebase');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const path = require('path'); 

const logActivity = async (karyawanId, activityType) => {
  try {
    const activityRef = db.collection('activities').doc();
    await activityRef.set({
      karyawan_id: karyawanId,
      activity_type: activityType,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

async function createKaryawan(req, res) {
  try {
    const karyawanId = uuidv4();
    const karyawanRef = db.collection('karyawan').doc(karyawanId);

    const defaultPhotoName = 'person-svgrepo-com.png'; 
    const defaultPhotoPath = path.join(__dirname, defaultPhotoName);

    try {
      await bucket.file(defaultPhotoName).getMetadata();
    } catch (error) {
      await bucket.upload(defaultPhotoPath, {
        destination: defaultPhotoName,
      });
    }

    let profilePhotoUrl = `https://storage.googleapis.com/${bucket.name}/${defaultPhotoName}`; 

    if (req.files && req.files['profile_photo']) {
      const profilePhotoFile = req.files['profile_photo'][0];
      const profilePhotoFileName = `profilepicture_${karyawanId}_${Date.now()}`;
      const profilePhotoFileRef = bucket.file(profilePhotoFileName);

      await new Promise((resolve, reject) => {
        profilePhotoFileRef.createWriteStream({ metadata: { contentType: profilePhotoFile.mimetype } })
          .on('error', reject)
          .on('finish', () => {
            profilePhotoUrl = `https://storage.googleapis.com/${bucket.name}/${profilePhotoFileName}`;
            resolve(); 
          })
          .end(profilePhotoFile.buffer);
      });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const karyawanData = {
      karyawan_id: karyawanId,
      fullname: req.body.fullname,
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      profile_photo_url: profilePhotoUrl,
      NIP: req.body.NIP,
      resetpasswordtoken: '',
      phoneNumber: req.body.phoneNumber,
      division: req.body.division,
      shift: req.body.shift || 'pagi',
      tanggal_lahir: req.body.tanggal_lahir,
      isAdmin: false, 
      pendidikan_terakhir: req.body.pendidikan_terakhir,
      tempat_lahir: req.body.tempat_lahir,
      tanggal_masuk: req.body.tanggal_masuk,
      tanggal_keluar: req.body.tanggal_keluar,
      OS: req.body.OS,
      Browser: req.body.Browser,
      lokasi_kantor: req.body.lokasi_kantor,
      barcode_url: ''
    };

    if (req.files && req.files['barcode']) {
      const barcodeFile = req.files['barcode'][0];
      const barcodeFileName = `barcode_${karyawanId}_${Date.now()}`;
      const barcodeFileRef = bucket.file(barcodeFileName);

      await new Promise((resolve, reject) => {
        barcodeFileRef.createWriteStream({ metadata: { contentType: barcodeFile.mimetype } })
          .on('error', reject)
          .on('finish', () => {
            karyawanData.barcode_url = `https://storage.googleapis.com/${bucket.name}/${barcodeFileName}`;
            resolve();
          })
          .end(barcodeFile.buffer);
      });
    }

    await karyawanRef.set(karyawanData);
    res.status(201).json(karyawanData);

    await logActivity(karyawanId, 'checkin start');

  } catch (error) {
    res.status(500).json({ message: 'Error creating karyawan', error: error.message });
  }
}

const updateKaryawan = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const allowedFields = [
      'fullname', 'username', 'email', 'profile_photo_url', 'NIP', 
      'phoneNumber', 'division', 'shift', 'tanggal_lahir', 'pendidikan_terakhir',
      'tempat_lahir', 'tanggal_masuk', 'tanggal_keluar', 'OS', 'Browser',
      'lokasi_kantor', 'barcode_url'
    ];

    const filteredData = {};
    for (const key in updatedData) {
      if (allowedFields.includes(key)) {
        filteredData[key] = updatedData[key] === '' ? null : updatedData[key];
      }
    }

    const karyawanRef = db.collection('karyawan').doc(id);
    await karyawanRef.update(filteredData);

    await logActivity(id, 'update');

    res.status(200).json({ message: 'Karyawan updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating karyawan', error: error.message });
  }
};

const getBarcodeUrlById = async (req, res) => {
  try {
    const { id } = req.params;
    const karyawanRef = db.collection('karyawan').doc(id);
    const doc = await karyawanRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Karyawan not found' });
    }

    const karyawanData = doc.data();
    if (!karyawanData.barcode_url) {
      return res.status(404).json({ message: 'Barcode URL not found' });
    }

    res.status(200).json({ barcode_url: karyawanData.barcode_url });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching barcode URL', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const karyawanRef = db.collection('karyawan').where('email', '==', email);
    const snapshot = await karyawanRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'Karyawan not found' });
    }

    const karyawan = snapshot.docs[0].data();
    const match = await bcrypt.compare(password, karyawan.password);

    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: karyawan.karyawan_id, isAdmin: karyawan.isAdmin }, 'secret_key', { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Error during login', error: error.message });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const karyawanRef = db.collection('karyawan').where('email', '==', email);
    const snapshot = await karyawanRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'Karyawan not found' });
    }

    const karyawan = snapshot.docs[0].data();
    const token = crypto.randomBytes(20).toString('hex');
    await karyawanRef.doc(karyawan.karyawan_id).update({ resetpasswordtoken: token });

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'your-email@gmail.com',
        pass: 'your-email-password'
      }
    });

    const mailOptions = {
      to: email,
      from: 'passwordreset@yourapp.com',
      subject: 'Password Reset Request',
      text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser, to complete the process:\n\nhttp://${req.headers.host}/reset/${token}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ message: 'Error requesting password reset', error: error.message });
  }
};

const validateOtp = async (req, res) => {
  try {
    const { token } = req.params;
    const karyawanRef = db.collection('karyawan').where('resetpasswordtoken', '==', token);
    const snapshot = await karyawanRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'Invalid or expired token' });
    }

    res.status(200).json({ message: 'Token is valid' });
  } catch (error) {
    res.status(500).json({ message: 'Error validating token', error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const karyawanRef = db.collection('karyawan').where('resetpasswordtoken', '==', token);
    const snapshot = await karyawanRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'Invalid or expired token' });
    }

    const karyawan = snapshot.docs[0].data();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await karyawanRef.doc(karyawan.karyawan_id).update({ password: hashedPassword, resetpasswordtoken: '' });

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

const getKaryawanById = async (req, res) => {
  try {
    const { id } = req.params;
    const karyawanRef = db.collection('karyawan').doc(id);
    const doc = await karyawanRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Karyawan not found' });
    }

    res.status(200).json(doc.data());
  } catch (error) {
    res.status(500).json({ message: 'Error fetching karyawan', error: error.message });
  }
};

const getRecentActivities = async (req, res) => {
  try {
    // Ambil referensi ke koleksi aktivitas
    const activitiesRef = db.collection('activities').orderBy('timestamp', 'desc');
    const snapshot = await activitiesRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No activities found' });
    }

    // Proses setiap dokumen aktivitas
    const activities = snapshot.docs.map(doc => {
      const activity = doc.data();
      const now = new Date();
      const elapsedMinutes = Math.floor((now - activity.timestamp.toDate()) / 1000 / 60);
      const elapsedText = `${elapsedMinutes} minute${elapsedMinutes > 1 ? 's' : ''} ago`;
      return {
        ...activity,
        elapsed_time: elapsedText
      };
    });

    res.status(200).json(activities);
  } catch (error) {
    console.error('Error retrieving recent activities:', error);
    res.status(500).json({ message: 'Error retrieving recent activities', error: error.message });
  }
};

module.exports = {
  createKaryawan,
  updateKaryawan,
  getBarcodeUrlById,
  login,
  requestPasswordReset,
  validateOtp,
  resetPassword,
  getKaryawanById,
  getRecentActivities
};
