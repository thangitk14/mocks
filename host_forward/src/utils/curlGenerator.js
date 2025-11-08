const generateCurl = (req, domain) => {
  const method = req.method.toUpperCase();
  const forwardUrl = `${domain.forward_domain}${req.path}`;
  
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

