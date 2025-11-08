const express = require('express');
const router = express.Router();
const roleUserController = require('../controllers/roleUserController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');

// Validation rules
const assignRoleValidation = [
  body('userId')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  body('roleId')
    .isInt({ min: 1 })
    .withMessage('Valid role ID is required')
];

const assignMultipleRolesValidation = [
  body('userId')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  body('roleIds')
    .isArray()
    .withMessage('Role IDs must be an array')
    .custom((roleIds) => {
      if (!roleIds.every(id => Number.isInteger(id) && id > 0)) {
        throw new Error('All role IDs must be valid positive integers');
      }
      return true;
    })
];

const userRolesParamValidation = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required')
];

const removeRoleValidation = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  param('roleId')
    .isInt({ min: 1 })
    .withMessage('Valid role ID is required')
];

// Routes
// Get all roles for a user
router.get('/users/:userId/roles', authenticate, authorize('/role_user/*'), userRolesParamValidation, validate, roleUserController.getUserRoles);

// Assign a single role to a user
router.post('/assign', authenticate, authorize('/role_user/*'), assignRoleValidation, validate, roleUserController.assignRoleToUser);

// Assign multiple roles to a user (replaces all existing roles)
router.post('/assign-multiple', authenticate, authorize('/role_user/*'), assignMultipleRolesValidation, validate, roleUserController.assignMultipleRolesToUser);

// Remove a role from a user
router.delete('/users/:userId/roles/:roleId', authenticate, authorize('/role_user/*'), removeRoleValidation, validate, roleUserController.removeRoleFromUser);

module.exports = router;
