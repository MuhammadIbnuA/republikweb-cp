const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'Access denied, no token provided' });
  }

  const token = authHeader.split(' ')[1]; // Assuming the token is sent in the Authorization header as "Bearer <token>"
  if (!token) {
    return res.status(401).json({ message: 'Access denied, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, 'iwishiwasyourjoke');
    req.karyawanId = decoded.karyawanId;
    req.username = decoded.username; // Ensure username is also included if needed
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token' });
  }
};


const IsAdmin = (req, res, next) => {
  try {
      // Check for the authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
          return res.status(401).json({ message: 'Authorization header missing' });
      }

      // Split the header to get the token part
      const token = authHeader.split(' ')[1];
      
      if (!token) {
          return res.status(401).json({ message: 'Token missing' });
      }

      // Verify the token
      jwt.verify(token, 'iwishiwasyourjoke', (err, decoded) => {
          if (err) {
              return res.status(401).json({ message: 'Invalid token' });
          }

          // Check if the user is an admin
          if (!decoded.isAdmin) {
              return res.status(403).json({ message: 'Access denied. Admins only.' });
          }

          next();
      });
  } catch (error) {
      console.error('Error in IsAdmin middleware:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
};



module.exports = {
  authenticateToken,
  IsAdmin
}
