const ERROR_CODES = {
  // General Errors (1000-1999)
  INTERNAL_SERVER_ERROR: {
    code: 1000,
    message: 'Internal server error',
    httpStatus: 500
  },
  VALIDATION_ERROR: {
    code: 1001,
    message: 'Validation error',
    httpStatus: 400
  },
  NOT_FOUND: {
    code: 1002,
    message: 'Resource not found',
    httpStatus: 404
  },

  // Authentication Errors (2000-2999)
  INVALID_CREDENTIALS: {
    code: 2000,
    message: 'Invalid username or password',
    httpStatus: 401
  },
  UNAUTHORIZED: {
    code: 2001,
    message: 'Unauthorized access',
    httpStatus: 401
  },
  TOKEN_MISSING: {
    code: 2002,
    message: 'Authentication token is missing',
    httpStatus: 401
  },
  TOKEN_INVALID: {
    code: 2003,
    message: 'Invalid authentication token',
    httpStatus: 401
  },
  TOKEN_EXPIRED: {
    code: 2004,
    message: 'Authentication token has expired',
    httpStatus: 401
  },

  // Authorization Errors (3000-3999)
  FORBIDDEN: {
    code: 3000,
    message: 'You do not have permission to access this resource',
    httpStatus: 403
  },
  INSUFFICIENT_PERMISSIONS: {
    code: 3001,
    message: 'Insufficient permissions for this action',
    httpStatus: 403
  },

  // User Errors (4000-4999)
  USER_NOT_FOUND: {
    code: 4000,
    message: 'User not found',
    httpStatus: 404
  },
  USER_ALREADY_EXISTS: {
    code: 4001,
    message: 'User with this username already exists',
    httpStatus: 409
  },
  USER_CREATION_FAILED: {
    code: 4002,
    message: 'Failed to create user',
    httpStatus: 500
  },
  USER_UPDATE_FAILED: {
    code: 4003,
    message: 'Failed to update user',
    httpStatus: 500
  },
  USER_DELETE_FAILED: {
    code: 4004,
    message: 'Failed to delete user',
    httpStatus: 500
  },
  USER_INACTIVE: {
    code: 4005,
    message: 'User account is inactive',
    httpStatus: 403
  },
  USER_EXPIRED: {
    code: 4006,
    message: 'User account has expired',
    httpStatus: 403
  },

  // Role Errors (5000-5999)
  ROLE_NOT_FOUND: {
    code: 5000,
    message: 'Role not found',
    httpStatus: 404
  },
  ROLE_ALREADY_EXISTS: {
    code: 5001,
    message: 'Role with this code already exists',
    httpStatus: 409
  },
  ROLE_CREATION_FAILED: {
    code: 5002,
    message: 'Failed to create role',
    httpStatus: 500
  },
  ROLE_UPDATE_FAILED: {
    code: 5003,
    message: 'Failed to update role',
    httpStatus: 500
  },
  ROLE_DELETE_FAILED: {
    code: 5004,
    message: 'Failed to delete role',
    httpStatus: 500
  },

  // Database Errors (6000-6999)
  DATABASE_ERROR: {
    code: 6000,
    message: 'Database operation failed',
    httpStatus: 500
  },
  DATABASE_CONNECTION_ERROR: {
    code: 6001,
    message: 'Failed to connect to database',
    httpStatus: 500
  }
};

module.exports = ERROR_CODES;
