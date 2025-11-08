const ERROR_CODES = require('../utils/errorCodes');

const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', err);

  // Default error response
  let statusCode = err.httpStatus || 500;
  let errorCode = err.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR.code;
  let message = err.message || ERROR_CODES.INTERNAL_SERVER_ERROR.message;

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = ERROR_CODES.TOKEN_INVALID.httpStatus;
    errorCode = ERROR_CODES.TOKEN_INVALID.code;
    message = ERROR_CODES.TOKEN_INVALID.message;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = ERROR_CODES.TOKEN_EXPIRED.httpStatus;
    errorCode = ERROR_CODES.TOKEN_EXPIRED.code;
    message = ERROR_CODES.TOKEN_EXPIRED.message;
  }

  // Handle validation errors from express-validator
  if (err.array && typeof err.array === 'function') {
    statusCode = ERROR_CODES.VALIDATION_ERROR.httpStatus;
    errorCode = ERROR_CODES.VALIDATION_ERROR.code;
    message = err.array().map(e => e.msg).join(', ');
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

module.exports = errorHandler;
