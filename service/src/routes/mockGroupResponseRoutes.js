const express = require('express');
const router = express.Router();
const {
  getMockGroupResponses,
  getMockGroupResponseById,
  createMockGroupResponse,
  deleteMockGroupResponse,
  deleteMockGroupResponseByGroupAndMockResponse
} = require('../controllers/mockGroupResponseController');
const authenticate = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all mock group responses (with optional query params)
router.get('/', getMockGroupResponses);

// Get mock group response by ID
router.get('/:id', getMockGroupResponseById);

// Create mock group response
router.post('/', createMockGroupResponse);

// Delete mock group response by ID
router.delete('/:id', deleteMockGroupResponse);

// Delete mock group response by group_id and mock_response_id
router.post('/delete-by-relation', deleteMockGroupResponseByGroupAndMockResponse);

module.exports = router;
