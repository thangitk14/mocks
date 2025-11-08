const axios = require('axios');
const { getMappingDomainByPath } = require('../config/configLoader');
const { generateCurl } = require('../utils/curlGenerator');

const forwardRequest = async (req, res, next) => {
  try {
    const path = req.path;
    const domain = getMappingDomainByPath(path);

    // If no mapping found or forward_state is NoneApi, return 404
    if (!domain || domain.forward_state === 'NoneApi') {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No mapping found for this path',
          path: path
        }
      });
    }

    // Check if forward_state allows forwarding
    if (domain.forward_state === 'SomeApi') {
      // For SomeApi, you might want to check a whitelist or other conditions
      // For now, we'll forward all requests
    }

    // Build forward URL - replace the path prefix with forward_domain
    let forwardPath = path;
    if (path.startsWith(domain.path)) {
      // Remove the mapped path prefix and append to forward_domain
      forwardPath = path.substring(domain.path.length) || '/';
    }
    
    // Ensure forward_domain doesn't end with / and forwardPath starts with /
    const cleanForwardDomain = domain.forward_domain.replace(/\/$/, '');
    const cleanForwardPath = forwardPath.startsWith('/') ? forwardPath : `/${forwardPath}`;
    const forwardUrl = `${cleanForwardDomain}${cleanForwardPath}`;

    // Prepare request options
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];
    
    // Set content-type if not present and body exists
    if (req.body && Object.keys(req.body).length > 0 && !headers['content-type']) {
      headers['content-type'] = 'application/json';
    }

    const requestOptions = {
      method: req.method,
      url: forwardUrl,
      headers: headers,
      params: req.query,
      data: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
      timeout: 30000,
      validateStatus: () => true, // Accept all status codes
      maxRedirects: 5
    };

    // Forward the request
    const response = await axios(requestOptions);

    // Store request info for logging
    req.forwardInfo = {
      domain,
      forwardUrl,
      responseStatus: response.status,
      responseData: response.data
    };

    // Return response to client with same headers
    res.status(response.status);
    
    // Copy response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      if (key !== 'content-encoding' && key !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });
    
    // Return response data
    if (response.data) {
      if (typeof response.data === 'string') {
        res.send(response.data);
      } else {
        res.json(response.data);
      }
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Forward error:', error.message);
    
    // Store error info for logging
    req.forwardInfo = {
      error: error.message,
      responseStatus: 500
    };

    // Still log the request even if forward failed
    next();
    
    // Return error response
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to forward request'
      }
    });
  }
};

const logRequest = async (req, res, next) => {
  // Skip logging for health check
  if (req.path === '/health') {
    return next();
  }

  try {
    const path = req.path;
    const domain = getMappingDomainByPath(path);

    if (!domain) {
      return next();
    }

    // Generate cURL command
    const curlCommand = generateCurl(req, domain);

    // Prepare log data
    const logData = {
      domain_id: domain.id,
      headers: req.headers,
      body: req.body || {},
      query: req.query || {},
      method: req.method,
      status: req.forwardInfo?.responseStatus || res.statusCode || 500,
      toCUrl: curlCommand
    };

    // Send log to service (fire and forget)
    const serviceUrl = process.env.SERVICE_URL || 'http://localhost:3000';
    axios.post(`${serviceUrl}/api/logs`, logData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    }).catch(err => {
      console.error('Failed to log request:', err.message);
    });

    next();
  } catch (error) {
    console.error('Log request error:', error.message);
    next();
  }
};

module.exports = {
  forwardRequest,
  logRequest
};

