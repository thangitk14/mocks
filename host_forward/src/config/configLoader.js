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
      return path.startsWith(d.path);
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

