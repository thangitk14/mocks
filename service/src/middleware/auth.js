const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../utils/errorCodes');

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(ERROR_CODES.TOKEN_MISSING);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Get user from database
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND);
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(error); // Will be handled by errorHandler middleware
    }
  }
};

module.exports = authenticate;
