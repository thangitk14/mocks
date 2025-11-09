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

// Normalize path by removing trailing slash (except for root)
const normalizePath = (path) => {
  if (!path || path === '/') return '/';
  return path.endsWith('/') ? path.slice(0, -1) : path;
};

const getMappingDomainByPath = (path) => {
  // Normalize the incoming path
  const normalizedPath = normalizePath(path);
  
  // Find exact match first (with and without trailing slash)
  let domain = mappingDomains.find(d => {
    if (d.state !== 'Active') return false;
    const normalizedMappingPath = normalizePath(d.path);
    return normalizedMappingPath === normalizedPath;
  });
  
  // If no exact match, try prefix matching
  if (!domain) {
    domain = mappingDomains.find(d => {
      if (d.state !== 'Active') return false;
      if (d.forward_state === 'NoneApi') return false;
      
      const normalizedMappingPath = normalizePath(d.path);
      
      // Handle exact path match (normalized)
      if (normalizedPath.startsWith(normalizedMappingPath)) {
        // Ensure it's a proper prefix match (not just substring)
        const nextChar = normalizedPath[normalizedMappingPath.length];
        if (!nextChar || nextChar === '/') {
          return true;
        }
      }
      
      // Handle wildcard mapping (e.g., /vietbank/sample/*)
      if (d.path.endsWith('/*')) {
        const basePath = d.path.slice(0, -1); // Remove trailing *
        const normalizedBasePath = normalizePath(basePath);
        
        // Check if path starts with basePath (with or without trailing slash)
        if (normalizedPath.startsWith(normalizedBasePath)) {
          const nextChar = normalizedPath[normalizedBasePath.length];
          if (!nextChar || nextChar === '/') {
            return true;
          }
        }
        // Also check exact match without trailing slash
        if (normalizedPath === normalizedBasePath) {
          return true;
        }
      }
      
      return false;
    });
  }

  // Log for debugging (only in production or when verbose)
  if (process.env.NODE_ENV === 'production') {
    if (!domain) {
      console.log(`[Config] No mapping found for path: ${path} (normalized: ${normalizedPath})`);
      console.log(`[Config] Available mappings:`, mappingDomains
        .filter(d => d.state === 'Active')
        .map(d => ({ path: d.path, forward_state: d.forward_state }))
      );
    } else {
      console.log(`[Config] Found mapping for path: ${path} -> ${domain.path}`);
    }
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

