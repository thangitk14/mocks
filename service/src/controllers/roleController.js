const Role = require('../models/Role');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../utils/errorCodes');

const getAllRoles = async (req, res, next) => {
  try {
    const roles = await Role.findAll();

    res.json({
      success: true,
      data: {
        roles
      }
    });
  } catch (error) {
    next(error);
  }
};

const getRoleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const role = await Role.findById(id);

    if (!role) {
      throw new AppError({
        message: 'Role not found',
        statusCode: 404,
        errorCode: 'ROLE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        role
      }
    });
  } catch (error) {
    next(error);
  }
};

const createRole = async (req, res, next) => {
  try {
    const { code, name, path } = req.body;

    // Check if role with same code already exists
    const existingRole = await Role.findByCode(code);
    if (existingRole) {
      throw new AppError({
        message: 'Role with this code already exists',
        statusCode: 400,
        errorCode: 'ROLE_ALREADY_EXISTS'
      });
    }

    // Create new role
    const roleId = await Role.create({ code, name, path });

    // Get created role
    const role = await Role.findById(roleId);

    res.status(201).json({
      success: true,
      data: {
        role
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, name, path } = req.body;

    // Check if role exists
    const existingRole = await Role.findById(id);
    if (!existingRole) {
      throw new AppError({
        message: 'Role not found',
        statusCode: 404,
        errorCode: 'ROLE_NOT_FOUND'
      });
    }

    // Check if code is being changed and if new code already exists
    if (code && code !== existingRole.code) {
      const roleWithCode = await Role.findByCode(code);
      if (roleWithCode) {
        throw new AppError({
          message: 'Role with this code already exists',
          statusCode: 400,
          errorCode: 'ROLE_ALREADY_EXISTS'
        });
      }
    }

    // Update role
    await Role.update(id, { code, name, path });

    // Get updated role
    const role = await Role.findById(id);

    res.json({
      success: true,
      data: {
        role
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if role exists
    const existingRole = await Role.findById(id);
    if (!existingRole) {
      throw new AppError({
        message: 'Role not found',
        statusCode: 404,
        errorCode: 'ROLE_NOT_FOUND'
      });
    }

    // Delete role (cascade will handle role_user entries)
    await Role.delete(id);

    res.json({
      success: true,
      data: {
        message: 'Role deleted successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
};
