class AppError extends Error {
  constructor(errorCode, additionalMessage = null) {
    super(errorCode.message);
    this.errorCode = errorCode.code;
    this.httpStatus = errorCode.httpStatus;
    this.message = additionalMessage || errorCode.message;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
