const express = require('express');
const router = express.Router();
const {
  getMockResponses,
  getMockResponseById,
  getMockResponseByPath,
  createMockResponse,
  updateMockResponse,
  deleteMockResponse,
  disableByPathAndMethod
} = require('../controllers/mockResponseController');
const authenticate = require('../middleware/auth');

// Get mock response by path (no auth required for host_forward service)
router.get('/path', getMockResponseByPath);

// All other routes require authentication
router.use(authenticate);

// Get all mock responses (with optional domain_id query param)
router.get('/', getMockResponses);

// Get mock response by ID
router.get('/:id', getMockResponseById);

// Create mock response
router.post('/', createMockResponse);

// Update mock response
router.put('/:id', updateMockResponse);

// Delete mock response
router.delete('/:id', deleteMockResponse);

// Disable mock responses by path and method
router.post('/disable', disableByPathAndMethod);

module.exports = router;

