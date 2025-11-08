const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');

const router = express.Router();

// Validation rules
const createUserValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('username').trim().notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('state').optional().isIn(['Active', 'InActive', 'Expired']).withMessage('Invalid state'),
  validate
];

const updateUserValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('username').optional().trim().notEmpty().withMessage('Username cannot be empty')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('state').optional().isIn(['Active', 'InActive', 'Expired']).withMessage('Invalid state'),
  validate
];

// All routes require authentication and /users/* permission
router.use(authenticate);
router.use(authorize('/users/*'));

// Routes
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.post('/', createUserValidation, userController.createUser);
router.put('/:id', updateUserValidation, userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;

