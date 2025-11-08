const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../utils/errorCodes');

const register = async (req, res, next) => {
  try {
    const { name, username, password, role_user_id } = req.body;

    // Check if user already exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      throw new AppError(ERROR_CODES.USER_ALREADY_EXISTS);
    }

    // Create new user
    const userId = await User.create({
      name,
      username,
      password,
      created_by: 0, // System created
      role_user_id
    });

    // Get created user (without password)
    const user = await User.findById(userId);

    // Generate JWT token
    const token = generateToken({ userId: user.id, username: user.username });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role_user_id: user.role_user_id
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findByUsername(username);
    if (!user) {
      throw new AppError(ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Verify password
    const isPasswordValid = await User.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Check if user is expired
    if (User.isUserExpired(user)) {
      throw new AppError(ERROR_CODES.USER_EXPIRED);
    }

    // Check if user is active
    if (!User.isUserActive(user)) {
      throw new AppError(ERROR_CODES.USER_INACTIVE);
    }

    // Generate JWT token
    const token = generateToken({ userId: user.id, username: user.username });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role_user_id: user.role_user_id
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    // User is attached by authenticate middleware
    const user = req.user;

    // Get user's roles
    const roles = await User.getRolesForUser(user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role_user_id: user.role_user_id
        },
        roles
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile
};
