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

// All routes require authentication
router.use(authenticate);

// Get all mapping domains
router.get('/', getAllMappingDomains);

// Get mapping domain by ID
router.get('/:id', getMappingDomainById);

// Create mapping domain
router.post('/', createMappingDomain);

// Update mapping domain
router.put('/:id', updateMappingDomain);

// Delete mapping domain
router.delete('/:id', deleteMappingDomain);

module.exports = router;

