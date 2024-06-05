const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization').split(' ')[1]; // Assuming the token is sent in the Authorization header as "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Access denied, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, 'iwishiwasyourjoke');
    req.karyawanId = decoded.karyawanId;
    req.username = decoded.username; // Decode and set username from the token payload
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

module.exports = authenticateToken;
