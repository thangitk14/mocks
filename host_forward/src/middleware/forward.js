const axios = require('axios');
const { getMappingDomainByPath } = require('../config/configLoader');
const { generateCurl } = require('../utils/curlGenerator');

const forwardRequest = async (req, res, next) => {
  const startTime = Date.now(); // Record start time at the beginning
  
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
    
    // Handle exact path match
    if (path.startsWith(domain.path)) {
      // Remove the mapped path prefix and append to forward_domain
      forwardPath = path.substring(domain.path.length) || '/';
    }
    // Handle wildcard mapping (e.g., /vietbank/sample/*)
    else if (domain.path.endsWith('/*')) {
      const basePath = domain.path.slice(0, -1); // Remove trailing *
      if (path.startsWith(basePath)) {
        // Remove the base path prefix
        forwardPath = path.substring(basePath.length) || '/';
      } else if (path === basePath.slice(0, -1)) {
        // Handle case where path is exactly basePath without trailing slash
        // e.g., path = /vietbank/sample, basePath = /vietbank/sample/
        forwardPath = '/';
      }
    }
    
    // Ensure forward_domain doesn't end with / and forwardPath starts with /
    const cleanForwardDomain = domain.forward_domain.replace(/\/$/, '');
    const cleanForwardPath = forwardPath.startsWith('/') ? forwardPath : `/${forwardPath}`;
    const forwardUrl = `${cleanForwardDomain}${cleanForwardPath}`;

    // Check for mock response before forwarding
    // Normalize path: remove leading slash, but keep '/' for root
    let relativePath = forwardPath.replace(/^\//, '');
    if (relativePath === '') {
      relativePath = '/';
    }
    
    const serviceUrl = process.env.SERVICE_URL || 'http://localhost:3000';
    
    try {
      const mockResponse = await axios.get(`${serviceUrl}/api/mock-responses/path`, {
        params: {
          domainId: domain.id,
          path: relativePath,
          method: req.method
        },
        timeout: 2000
      }).then(response => response.data?.data?.mockResponse).catch(() => null);

      // If mock response exists and is Active, return mock response
      if (mockResponse && mockResponse.state === 'Active') {
        // Apply delay if specified
        if (mockResponse.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, mockResponse.delay));
        }

        // Calculate duration
        const duration = Date.now() - startTime;

        // Store request info for logging (mock response)
        req.forwardInfo = {
          domain,
          forwardUrl,
          responseStatus: mockResponse.status_code,
          responseData: mockResponse.body,
          responseHeaders: mockResponse.headers || {},
          duration,
          isMock: true
        };

        // Call logRequest directly (fire and forget - don't await)
        logRequest(req, res, () => {}).catch(err => {
          console.error('Error calling logRequest:', err.message);
        });

        // Return mock response
        res.status(mockResponse.status_code);
        
        // Set mock response headers
        if (mockResponse.headers && typeof mockResponse.headers === 'object') {
          Object.entries(mockResponse.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
        }
        
        // Return mock response body
        if (mockResponse.body !== null && mockResponse.body !== undefined) {
          if (typeof mockResponse.body === 'string') {
            res.send(mockResponse.body);
          } else {
            res.json(mockResponse.body);
          }
        } else {
          res.end();
        }
        
        return; // Exit early, don't forward
      }
    } catch (error) {
      // If mock check fails, continue with normal forwarding
      console.warn('[Mock] Failed to check mock response, continuing with forward:', error.message);
    }

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

    // Calculate duration in milliseconds
    const duration = Date.now() - startTime;

    // Store request info for logging
    req.forwardInfo = {
      domain,
      forwardUrl,
      responseStatus: response.status,
      responseData: response.data,
      responseHeaders: response.headers || {},
      duration
    };

    // Call logRequest directly (fire and forget - don't await)
    logRequest(req, res, () => {}).catch(err => {
      console.error('Error calling logRequest:', err.message);
    });

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
    
    // Calculate duration even on error
    const duration = Date.now() - startTime;
    
    // Store error info for logging
    req.forwardInfo = {
      error: error.message,
      responseStatus: 500,
      duration
    };

    // Call logRequest directly (fire and forget - don't await)
    logRequest(req, res, () => {}).catch(err => {
      console.error('Error calling logRequest:', err.message);
    });
    
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
    // Use domain from forwardInfo if available (set by forwardRequest)
    const domain = req.forwardInfo?.domain;

    if (!domain) {
      // If no domain in forwardInfo, try to find it
      const path = req.path;
      const foundDomain = getMappingDomainByPath(path);
      if (!foundDomain) {
        return next();
      }
      // Use found domain
      req.forwardInfo = req.forwardInfo || {};
      req.forwardInfo.domain = foundDomain;
    }

    const domainToUse = req.forwardInfo.domain;

    // Generate cURL command
    const curlCommand = generateCurl(req, domainToUse);

    // Prepare log data
    const logData = {
      domain_id: domainToUse.id,
      headers: req.headers,
      body: req.body || {},
      query: req.query || {},
      method: req.method,
      status: req.forwardInfo?.responseStatus || res.statusCode || 500,
      toCUrl: curlCommand,
      responseHeaders: req.forwardInfo?.responseHeaders || {},
      responseBody: req.forwardInfo?.responseData || null,
      duration: req.forwardInfo?.duration || null
    };

    // Send log to service (fire and forget)
    const serviceUrl = process.env.SERVICE_URL || 'http://localhost:3000';
    console.log(`[LOG] Sending log to ${serviceUrl}/api/logs for domain_id: ${domainToUse.id}, method: ${req.method}, path: ${req.path}`);
    axios.post(`${serviceUrl}/api/logs`, logData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    }).then((response) => {
      console.log(`[LOG] Successfully logged request for domain_id: ${domainToUse.id}, status: ${response.status}`);
    }).catch(err => {
      console.error(`[LOG] Failed to log request for domain_id: ${domainToUse.id}:`, err.message);
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', JSON.stringify(err.response.data));
      } else if (err.request) {
        console.error('No response received. Request config:', err.config?.url);
      }
    });

    next();
  } catch (error) {
    console.error('Log request error:', error.message);
    console.error('Stack:', error.stack);
    next();
  }
};

module.exports = {
  forwardRequest,
  logRequest
};

