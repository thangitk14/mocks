const generateCurl = (req, domain) => {
  const method = req.method.toUpperCase();
  
  // Calculate forward path by removing the mapping path prefix
  let forwardPath = req.path;
  if (req.path.startsWith(domain.path)) {
    // Remove the mapped path prefix
    forwardPath = req.path.substring(domain.path.length) || '/';
  }
  // Handle wildcard mapping (e.g., /vietbank/sample/*)
  else if (domain.path.endsWith('/*')) {
    const basePath = domain.path.slice(0, -1); // Remove trailing *
    if (req.path.startsWith(basePath)) {
      forwardPath = req.path.substring(basePath.length) || '/';
    } else if (req.path === basePath.slice(0, -1)) {
      // Handle case where path is exactly basePath without trailing slash
      forwardPath = '/';
    }
  }
  
  // Ensure forward_domain doesn't end with / and forwardPath starts with /
  const cleanForwardDomain = domain.forward_domain.replace(/\/$/, '');
  const cleanForwardPath = forwardPath.startsWith('/') ? forwardPath : `/${forwardPath}`;
  const forwardUrl = `${cleanForwardDomain}${cleanForwardPath}`;
  
  let curl = `curl -X ${method}`;

  // Add headers
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers['content-length'];

  Object.entries(headers).forEach(([key, value]) => {
    if (value) {
      curl += ` \\\n  -H "${key}: ${value}"`;
    }
  });

  // Add query parameters
  const queryString = new URLSearchParams(req.query).toString();
  const url = queryString ? `${forwardUrl}?${queryString}` : forwardUrl;

  // Add body for POST, PUT, PATCH
  if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
    const bodyStr = typeof req.body === 'string' 
      ? req.body 
      : JSON.stringify(req.body);
    curl += ` \\\n  -d '${bodyStr.replace(/'/g, "'\\''")}'`;
  }

  curl += ` \\\n  "${url}"`;

  return curl;
};

module.exports = {
  generateCurl
};

