const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/response');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Authorization token required', '', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return error(res, 'Invalid or expired token', '', 401);
  }

  // Attach user data to request
  req.user = decoded;
  next();
}

module.exports = authMiddleware;
