const express = require('express');
const router = express.Router();
const {
  getAllMappingDomains,
  getMappingDomainById,
  createMappingDomain,
  updateMappingDomain,
  deleteMappingDomain,
  exportMappingDomain,
  importMappingDomain
} = require('../controllers/mappingDomainController');
const authenticate = require('../middleware/auth');

// Public routes (for HostForward service)
// Get all mapping domains - public access
router.get('/', getAllMappingDomains);

// Get mapping domain by ID - public access
router.get('/:id', getMappingDomainById);

// Protected routes (require authentication)
router.use(authenticate);

// Create mapping domain
router.post('/', createMappingDomain);

// Update mapping domain
router.put('/:id', updateMappingDomain);

// Delete mapping domain
router.delete('/:id', deleteMappingDomain);

// Export mapping domain (with mocks)
router.get('/:id/export', authenticate, exportMappingDomain);

// Import mapping domain (with mocks)
router.post('/import', authenticate, importMappingDomain);

module.exports = router;

