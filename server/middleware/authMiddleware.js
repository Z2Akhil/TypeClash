const admin = require('../config/firebaseAdmin');

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided, authorization denied.' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Adds user info (uid, email) to the request object
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid.' });
  }
};

module.exports = authMiddleware;