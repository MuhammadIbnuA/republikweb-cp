const { db, bucket } = require('../firebase');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const createKaryawan = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const karyawanId = uuidv4(); // Generate UUID for karyawanId

        // Set the document path
        const karyawanRef = db.collection('karyawan').doc(karyawanId); // Set document path using karyawanId

        // Upload image to Firebase Storage
        const imageFileName = `profilepicture_${karyawanId}_${Date.now()}`;
        const file = bucket.file(imageFileName);
        const stream = file.createWriteStream({
            metadata: {
                contentType: req.file.mimetype
            }
        });

        stream.on('error', (error) => {
            console.error('Error uploading image to Firebase:', error);
            return res.status(500).json({ message: 'Error uploading image to Firebase' });
        });

        stream.on('finish', async () => {
            const profilePhotoUrl = `https://storage.googleapis.com/${bucket.name}/${imageFileName}`;

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
                address: req.body.address,
                division: req.body.division,
                shift: req.body.shift, // should be 'pagi' or 'siang'
                tanggal_lahir: req.body.tanggal_lahir,
                isAdmin: false // Add isAdmin field with default value false
            };

            await karyawanRef.set(karyawanData);

            res.status(201).json(karyawanData);
        });

        stream.end(req.file.buffer);
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
  
      const token = jwt.sign({ karyawanId: user.karyawan_id, username: user.username }, 'iwishiwasyourjoke', { expiresIn: '1h' });
  
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
      user.id = doc.id; // Store document ID to update later
    });

    const otp = crypto.randomBytes(3).toString('hex');
    user.resetpasswordtoken = await bcrypt.hash(otp, 10);

    await db.collection('karyawan').doc(user.id).update({ resetpasswordtoken: user.resetpasswordtoken });

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
      text: `Your OTP for password reset is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const snapshot = await db.collection('karyawan').where('email', '==', email).get();
    if (snapshot.empty) {
      return res.status(400).json({ error: 'User with this email does not exist' });
    }

    let user;
    snapshot.forEach(doc => {
      user = doc.data();
      user.id = doc.id; // Store document ID to update later
    });

    const isOtpValid = await bcrypt.compare(otp, user.resetpasswordtoken);
    if (!isOtpValid) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetpasswordtoken = '';

    await db.collection('karyawan').doc(user.id).update({
      password: user.password,
      resetpasswordtoken: '',
    });

    res.json({ message: 'Password has been reset' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getKaryawanById = async (req, res) => {
  try {
    const karyawanId = parseInt(req.params.id);
    const karyawanRef = db.collection('karyawan').where('karyawan_id', '==', karyawanId);
    const snapshot = await karyawanRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'Karyawan not found' });
    }

    let karyawanData = null;
    snapshot.forEach(doc => {
      karyawanData = doc.data();
    });

    res.status(200).json(karyawanData);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving karyawan', error: error.message });
  }
};

module.exports = {
  createKaryawan,
  login,
  requestPasswordReset,
  resetPassword,
  getKaryawanById
};
