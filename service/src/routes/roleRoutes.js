const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');

// Validation rules
const createRoleValidation = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Code is required')
    .isLength({ max: 100 })
    .withMessage('Code must not exceed 100 characters'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 255 })
    .withMessage('Name must not exceed 255 characters'),
  body('path')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Path must not exceed 255 characters')
];

const updateRoleValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid role ID is required'),
  body('code')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Code cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Code must not exceed 100 characters'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Name must not exceed 255 characters'),
  body('path')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Path must not exceed 255 characters')
];

const idParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid role ID is required')
];

// Routes
router.get('/', authenticate, authorize('/roles/*'), roleController.getAllRoles);
router.get('/:id', authenticate, authorize('/roles/*'), idParamValidation, validate, roleController.getRoleById);
router.post('/', authenticate, authorize('/roles/*'), createRoleValidation, validate, roleController.createRole);
router.put('/:id', authenticate, authorize('/roles/*'), updateRoleValidation, validate, roleController.updateRole);
router.delete('/:id', authenticate, authorize('/roles/*'), idParamValidation, validate, roleController.deleteRole);

module.exports = router;
