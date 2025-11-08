const axios = require('axios');

let mappingDomains = [];
let configLoaded = false;

const loadConfig = async (serviceUrl) => {
  try {
    const response = await axios.get(`${serviceUrl}/api/config/mappingDomain`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.success) {
      mappingDomains = response.data.data.mappingDomains || [];
      configLoaded = true;
      console.log(`Loaded ${mappingDomains.length} mapping domain(s)`);
      return mappingDomains;
    }
    throw new Error('Invalid response format from service');
  } catch (error) {
    console.error('Error loading config:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

const refreshConfig = async (serviceUrl) => {
  return loadConfig(serviceUrl);
};

const getMappingDomainByPath = (path) => {
  // Find exact match first
  let domain = mappingDomains.find(d => d.path === path && d.state === 'Active');
  
  // If no exact match, try prefix matching
  if (!domain) {
    domain = mappingDomains.find(d => {
      if (d.state !== 'Active') return false;
      if (d.forward_state === 'NoneApi') return false;
      
      // Handle exact path match
      if (path.startsWith(d.path)) {
        return true;
      }
      
      // Handle wildcard mapping (e.g., /vietbank/sample/*)
      if (d.path.endsWith('/*')) {
        const basePath = d.path.slice(0, -1); // Remove trailing *
        // Check if path starts with basePath (with or without trailing slash)
        return path.startsWith(basePath) || path === basePath.slice(0, -1);
      }
      
      return false;
    });
  }

  return domain;
};

const getAllMappingDomains = () => {
  return mappingDomains;
};

module.exports = {
  loadConfig,
  refreshConfig,
  getMappingDomainByPath,
  getAllMappingDomains,
  isConfigLoaded: () => configLoaded
};

