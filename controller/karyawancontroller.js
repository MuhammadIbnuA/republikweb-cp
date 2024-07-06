const { db, bucket } = require('../firebase');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const path = require('path'); 

async function createKaryawan(req, res) {
  try {
    const karyawanId = uuidv4();
    const karyawanRef = db.collection('karyawan').doc(karyawanId);

    // Ensure the default photo is in Firebase Storage
    const defaultPhotoName = 'person-svgrepo-com.png'; 
    const defaultPhotoPath = path.join(__dirname, defaultPhotoName);

    try {
      await bucket.file(defaultPhotoName).getMetadata();
    } catch (error) {
      // If the default image is not found, upload it
      await bucket.upload(defaultPhotoPath, {
        destination: defaultPhotoName,
      });
    }

    let profilePhotoUrl = `https://storage.googleapis.com/${bucket.name}/${defaultPhotoName}`; 

    if (req.files && req.files['profile_photo']) {
      // Upload custom profile photo to Firebase Storage (if provided)
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

    // Save karyawan data (including the determined profilePhotoUrl)
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
      shift: req.body.shift || 'pagi', // default pagi
      tanggal_lahir: req.body.tanggal_lahir,
      isAdmin: false, 
      pendidikan_terakhir: req.body.pendidikan_terakhir,
      tempat_lahir: req.body.tempat_lahir,
      tanggal_masuk: req.body.tanggal_masuk,
      tanggal_keluar: req.body.tanggal_keluar,
      OS: req.body.OS,
      Browser: req.body.Browser,
      lokasi_kantor: req.body.lokasi_kantor,
      barcode_url: '' // Placeholder for the barcode image URL
    };

    // Upload barcode image to Firebase Storage if provided
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

    // Save the karyawan data (after all uploads are complete)
    await karyawanRef.set(karyawanData);
    res.status(201).json(karyawanData);

  } catch (error) {
    res.status(500).json({ message: 'Error creating karyawan', error: error.message });
  }
};



const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const snapshot = await db.collection('karyawan').where('username', '==', username).get();
    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    let user;
    snapshot.forEach(doc => {
      user = doc.data();
    });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      {
        karyawanId: user.karyawan_id,
        username: user.username,
        isAdmin: user.isAdmin,
        NIP: user.NIP,
        fullname: user.fullname,
      },
      'iwishiwasyourjoke',
      { expiresIn: '1h' }
    );

    res.cookie('token', token, { maxAge: 3600000, httpOnly: true });
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

  
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const snapshot = await db.collection('karyawan').where('email', '==', email).get();
    if (snapshot.empty) {
      return res.status(400).json({ error: 'User with this email does not exist' });
    }

    let user;
    snapshot.forEach(doc => {
      user = doc.data();
      user.id = doc.id; // Simpan ID dokumen untuk pembaruan nanti
    });

    const otp = crypto.randomBytes(3).toString('hex'); // OTP dalam bentuk mentah
    const otpHash = await bcrypt.hash(otp, 10); // Hash OTP sebelum menyimpannya
    const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 menit dari sekarang

    await db.collection('karyawan').doc(user.id).update({
      resetpasswordtoken: otpHash,
      otpExpiry: otpExpiry,
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: user.email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. It will expire in 5 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const validateOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    // Cari pengguna berdasarkan OTP
    const snapshot = await db.collection('karyawan').where('resetpasswordtoken', '!=', '').get();
    if (snapshot.empty) {
      return res.status(400).json({ error: 'No users with a reset OTP found' });
    }

    let user;
    snapshot.forEach(doc => {
      user = doc.data();
      user.id = doc.id; // Simpan ID dokumen untuk pembaruan nanti
    });

    // Periksa apakah OTP masih berlaku
    if (!user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Verifikasi OTP
    const isOtpValid = await bcrypt.compare(otp, user.resetpasswordtoken);
    if (!isOtpValid) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Jika OTP valid, beri tahu pengguna
    res.json({ message: 'OTP is valid', userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    // Cari pengguna berdasarkan ID pengguna
    const snapshot = await db.collection('karyawan').doc(userId).get();
    if (!snapshot.exists) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = snapshot.data();

    // Periksa apakah OTP sudah kadaluarsa
    if (!user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Hash kata sandi baru dan pembaruan data pengguna
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.collection('karyawan').doc(userId).update({
      password: hashedPassword,
      resetpasswordtoken: '',
      otpExpiry: null,
    });

    res.json({ message: 'Password has been reset' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getKaryawanById = async (req, res) => {
  try {
      // Get the karyawanId from the request parameters
      const karyawanId = req.params.id;

      // Reference to the karyawan collection with the specific karyawan_id
      const karyawanRef = db.collection('karyawan').where('karyawan_id', '==', karyawanId);

      // Execute the query and get the snapshot
      const snapshot = await karyawanRef.get();

      // Check if the snapshot is empty
      if (snapshot.empty) {
          return res.status(404).json({ message: 'Karyawan not found' });
      }

      // Initialize karyawanData as an empty array
      let karyawanData = [];

      // Loop through the snapshot and collect the data
      snapshot.forEach(doc => {
          karyawanData.push(doc.data());
      });

      // If only one karyawan is expected, return the first item
      if (karyawanData.length === 1) {
          return res.status(200).json(karyawanData[0]);
      }

      // Otherwise, return all found karyawans
      res.status(200).json(karyawanData);
  } catch (error) {
      // Handle any errors that occur during the process
      res.status(500).json({ message: 'Error retrieving karyawan', error: error.message });
  }
};

  

module.exports = {
  createKaryawan,
  login,
  requestPasswordReset,
  validateOtp,
  resetPassword,
  getKaryawanById
};
