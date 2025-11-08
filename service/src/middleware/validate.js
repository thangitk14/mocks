const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../utils/errorCodes');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, errorMessages);
  }
  next();
};

module.exports = validate;
