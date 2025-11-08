const User = require('../models/User');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../utils/errorCodes');

const authorize = (requiredPath) => {
  return async (req, res, next) => {
    try {
      // User should be attached by authenticate middleware
      if (!req.user) {
        throw new AppError(ERROR_CODES.UNAUTHORIZED);
      }

      // Get user's roles
      const userRoles = await User.getRolesForUser(req.user.id);

      if (!userRoles || userRoles.length === 0) {
        throw new AppError(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      }

      // Check if any of the user's roles have permission for the required path
      const hasPermission = userRoles.some(role => {
        if (!role.path) return false;

        // Convert path pattern to regex (e.g., /config/* becomes /config/.*)
        const pathPattern = role.path.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pathPattern}$`);

        return regex.test(requiredPath);
      });

      if (!hasPermission) {
        throw new AppError(ERROR_CODES.FORBIDDEN);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = authorize;
