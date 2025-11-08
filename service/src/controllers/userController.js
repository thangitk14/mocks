const User = require('../models/User');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../utils/errorCodes');
const USER_STATES = require('../constants/userStates');

const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll();

    res.json({
      success: true,
      data: {
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      throw new AppError({
        message: 'User not found',
        statusCode: 404,
        errorCode: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, username, password, state, expired_time } = req.body;
    const created_by = req.user?.id || null;

    // Check if username already exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      throw new AppError({
        message: 'Username already exists',
        statusCode: 400,
        errorCode: 'USERNAME_ALREADY_EXISTS'
      });
    }

    // Create new user
    const userId = await User.create({
      name,
      username,
      password,
      created_by,
      state: state || USER_STATES.ACTIVE,
      expired_time: expired_time || null
    });

    // Get created user
    const user = await User.findById(userId);

    res.status(201).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, username, password, state, expired_time } = req.body;
    const updated_by = req.user?.id || null;

    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      throw new AppError({
        message: 'User not found',
        statusCode: 404,
        errorCode: 'USER_NOT_FOUND'
      });
    }

    // Check if username is being changed and if new username already exists
    if (username && username !== existingUser.username) {
      const userWithUsername = await User.findByUsername(username);
      if (userWithUsername) {
        throw new AppError({
          message: 'Username already exists',
          statusCode: 400,
          errorCode: 'USERNAME_ALREADY_EXISTS'
        });
      }
    }

    // Update user
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username;
    if (password !== undefined) updateData.password = password;
    if (state !== undefined) updateData.state = state;
    if (expired_time !== undefined) updateData.expired_time = expired_time;
    if (updated_by !== undefined) updateData.updated_by = updated_by;

    await User.update(id, updateData);

    // Get updated user
    const user = await User.findById(id);

    res.json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated_by = req.user?.id || null;

    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      throw new AppError({
        message: 'User not found',
        statusCode: 404,
        errorCode: 'USER_NOT_FOUND'
      });
    }

    // Soft delete: Update state to INACTIVE instead of deleting
    await User.update(id, {
      state: USER_STATES.INACTIVE,
      updated_by
    });

    // Get updated user
    const user = await User.findById(id);

    res.json({
      success: true,
      data: {
        user,
        message: 'User deactivated successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};

