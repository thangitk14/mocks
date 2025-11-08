const express = require('express');
const router = express.Router();
const {
  getAllMappingDomains,
  getMappingDomainById,
  createMappingDomain,
  updateMappingDomain,
  deleteMappingDomain
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

module.exports = router;

