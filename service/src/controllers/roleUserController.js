const RoleUser = require('../models/RoleUser');
const User = require('../models/User');
const Role = require('../models/Role');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../utils/errorCodes');

const getUserRoles = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError({
        message: 'User not found',
        statusCode: 404,
        errorCode: 'USER_NOT_FOUND'
      });
    }

    // Get user's roles
    const roles = await User.getRolesForUser(userId);

    res.json({
      success: true,
      data: {
        userId: parseInt(userId),
        roles
      }
    });
  } catch (error) {
    next(error);
  }
};

const assignRoleToUser = async (req, res, next) => {
  try {
    const { userId, roleId } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError({
        message: 'User not found',
        statusCode: 404,
        errorCode: 'USER_NOT_FOUND'
      });
    }

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      throw new AppError({
        message: 'Role not found',
        statusCode: 404,
        errorCode: 'ROLE_NOT_FOUND'
      });
    }

    // Check if assignment already exists
    const existingAssignments = await RoleUser.findByUserId(userId);
    const alreadyAssigned = existingAssignments.some(assignment => assignment.role_id === roleId);

    if (alreadyAssigned) {
      throw new AppError({
        message: 'Role is already assigned to this user',
        statusCode: 400,
        errorCode: 'ROLE_ALREADY_ASSIGNED'
      });
    }

    // Assign role to user
    const assignmentId = await RoleUser.create({ user_id: userId, role_id: roleId });

    // Get updated user roles
    const roles = await User.getRolesForUser(userId);

    res.status(201).json({
      success: true,
      data: {
        assignmentId,
        userId,
        roleId,
        roles
      }
    });
  } catch (error) {
    next(error);
  }
};

const removeRoleFromUser = async (req, res, next) => {
  try {
    const { userId, roleId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError({
        message: 'User not found',
        statusCode: 404,
        errorCode: 'USER_NOT_FOUND'
      });
    }

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      throw new AppError({
        message: 'Role not found',
        statusCode: 404,
        errorCode: 'ROLE_NOT_FOUND'
      });
    }

    // Remove role from user
    const deleted = await RoleUser.delete(userId, roleId);

    if (!deleted) {
      throw new AppError({
        message: 'Role assignment not found',
        statusCode: 404,
        errorCode: 'ASSIGNMENT_NOT_FOUND'
      });
    }

    // Get updated user roles
    const roles = await User.getRolesForUser(userId);

    res.json({
      success: true,
      data: {
        message: 'Role removed from user successfully',
        userId: parseInt(userId),
        roleId: parseInt(roleId),
        roles
      }
    });
  } catch (error) {
    next(error);
  }
};

const assignMultipleRolesToUser = async (req, res, next) => {
  try {
    const { userId, roleIds } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError({
        message: 'User not found',
        statusCode: 404,
        errorCode: 'USER_NOT_FOUND'
      });
    }

    // Validate all role IDs exist
    if (roleIds && roleIds.length > 0) {
      for (const roleId of roleIds) {
        const role = await Role.findById(roleId);
        if (!role) {
          throw new AppError({
            message: `Role with ID ${roleId} not found`,
            statusCode: 404,
            errorCode: 'ROLE_NOT_FOUND'
          });
        }
      }
    }

    // Assign roles to user (replaces all existing roles)
    await RoleUser.assignRolesToUser(userId, roleIds);

    // Get updated user roles
    const roles = await User.getRolesForUser(userId);

    res.json({
      success: true,
      data: {
        userId,
        roles
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserRoles,
  assignRoleToUser,
  removeRoleFromUser,
  assignMultipleRolesToUser
};
