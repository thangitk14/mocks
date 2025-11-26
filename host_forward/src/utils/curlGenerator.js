// Normalize path by removing trailing slash (except for root)
const normalizePath = (path) => {
  if (!path || path === '/') return '/';
  return path.endsWith('/') ? path.slice(0, -1) : path;
};

const generateCurl = (req, domain) => {
  const method = req.method.toUpperCase();
  
  // Calculate forward path by removing the mapping path prefix
  // This logic should match the logic in forward.js
  const path = req.path;
  let forwardPath = path;
  
  // Extract first path segment (e.g., /vietbank from /vietbank/api/master-data-service/...)
  const pathSegments = path.split('/').filter(segment => segment.length > 0);
  const firstPathSegment = pathSegments.length > 0 ? `/${pathSegments[0]}` : '/';
  
  // Remove the first path segment (mapping path) from the full path
  if (path.startsWith(domain.path)) {
    // Remove the mapped path prefix
    forwardPath = path.substring(domain.path.length) || '/';
  } else if (path.startsWith(firstPathSegment)) {
    // Remove the first path segment (this handles cases where domain.path is normalized differently)
    forwardPath = path.substring(firstPathSegment.length) || '/';
  }
  // Handle wildcard mapping (e.g., /vietbank/*)
  else if (domain.path.endsWith('/*')) {
    const basePath = domain.path.slice(0, -1); // Remove trailing *
    if (path.startsWith(basePath)) {
      // Remove the base path prefix
      forwardPath = path.substring(basePath.length) || '/';
    } else if (path === basePath.slice(0, -1)) {
      // Handle case where path is exactly basePath without trailing slash
      forwardPath = '/';
    }
  }
  
  // Ensure forward_domain doesn't end with / and forwardPath starts with /
  const cleanForwardDomain = domain.forward_domain.replace(/\/$/, '');
  const cleanForwardPath = forwardPath.startsWith('/') ? forwardPath : `/${forwardPath}`;
  const forwardUrl = `${cleanForwardDomain}${cleanForwardPath}`;
  
  let curl = `curl -X ${method}`;

  // Escape function for header values - escape quotes and backslashes
  const escapeHeaderValue = (value) => {
    if (typeof value !== 'string') {
      value = String(value);
    }
    // Escape backslashes first, then quotes
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  };

  // Add headers
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers['content-length'];

  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const escapedValue = escapeHeaderValue(value);
      curl += ` \\\n  -H "${key}: ${escapedValue}"`;
    }
  });

  // Add query parameters
  const queryString = new URLSearchParams(req.query).toString();
  const url = queryString ? `${forwardUrl}?${queryString}` : forwardUrl;

  // Escape URL for cURL command (escape quotes and backslashes)
  const escapeUrl = (urlStr) => {
    return urlStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  };
  const escapedUrl = escapeUrl(url);

  // Add body for POST, PUT, PATCH
  if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
    const bodyStr = typeof req.body === 'string' 
      ? req.body 
      : JSON.stringify(req.body);
    // Escape single quotes in body for shell command
    curl += ` \\\n  -d '${bodyStr.replace(/'/g, "'\\''")}'`;
  }

  curl += ` \\\n  "${escapedUrl}"`;

  return curl;
};

module.exports = {
  generateCurl
};

