const express = require('express');
const router = express.Router();
const {
  getApiLogs,
  getApiLogById,
  getApiLogsByDomain,
  createApiLog
} = require('../controllers/apiLogController');
const authenticate = require('../middleware/auth');

// Create API log (no auth required for host_forward service)
router.post('/', createApiLog);

// All other routes require authentication
router.use(authenticate);

// Get all API logs (with optional domain_id query param)
router.get('/', getApiLogs);

// Get API log by ID
router.get('/:id', getApiLogById);

// Get API logs by domain ID
router.get('/domain/:domainId', getApiLogsByDomain);

module.exports = router;

