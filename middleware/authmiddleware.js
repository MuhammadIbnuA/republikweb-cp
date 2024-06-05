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
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  jwt.verify(token, 'iwishiwasyourjoke', (err, decoded) => {
      if (err) {
          return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }

      if (!decoded.isAdmin) {
          return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }

      req.user = decoded; // Optionally attach the decoded token to the request object
      next();
  });
};



module.exports = {
  authenticateToken,
  IsAdmin
}
