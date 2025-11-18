const express = require('express');
const router = express.Router();
const {
  getMockGroups,
  getMockGroupById,
  createMockGroup,
  updateMockGroup,
  deleteMockGroup
} = require('../controllers/mockGroupController');
const authenticate = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all mock groups
router.get('/', getMockGroups);

// Get mock group by ID
router.get('/:id', getMockGroupById);

// Create mock group
router.post('/', createMockGroup);

// Update mock group
router.put('/:id', updateMockGroup);

// Delete mock group
router.delete('/:id', deleteMockGroup);

module.exports = router;
