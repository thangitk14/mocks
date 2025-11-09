const axios = require('axios');
const { getMappingDomainByPath } = require('../config/configLoader');
const { generateCurl } = require('../utils/curlGenerator');

// Normalize path by removing trailing slash (except for root)
const normalizePath = (path) => {
  if (!path || path === '/') return '/';
  return path.endsWith('/') ? path.slice(0, -1) : path;
};

const forwardRequest = async (req, res, next) => {
  const startTime = Date.now(); // Record start time at the beginning
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  
  // Step 1: Log incoming request
  console.log(`[${requestId}] ========================================`);
  console.log(`[${requestId}] [STEP 1] Incoming Request`);
  console.log(`[${requestId}]   Method: ${req.method}`);
  console.log(`[${requestId}]   Path: ${req.path}`);
  console.log(`[${requestId}]   Client IP: ${clientIp}`);
  console.log(`[${requestId}]   Headers:`, JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[${requestId}]   Body:`, JSON.stringify(req.body, null, 2));
  }
  if (req.query && Object.keys(req.query).length > 0) {
    console.log(`[${requestId}]   Query:`, JSON.stringify(req.query, null, 2));
  }
  
  try {
    const path = req.path;
    
    // Step 2: Extract first path segment and find mapping domain
    console.log(`[${requestId}] [STEP 2] Finding Mapping Domain`);
    console.log(`[${requestId}]   Full path: ${path}`);
    
    // Extract first path segment (e.g., /vietbank from /vietbank/api/master-data-service/...)
    const pathSegments = path.split('/').filter(segment => segment.length > 0);
    const firstPathSegment = pathSegments.length > 0 ? `/${pathSegments[0]}` : '/';
    
    console.log(`[${requestId}]   First path segment: ${firstPathSegment}`);
    console.log(`[${requestId}]   Calling API to get mapping for: ${firstPathSegment}`);
    
    // Call API to get mapping for first path segment
    // SERVICE_URL must be set in docker-compose.yml
    const serviceUrl = process.env.SERVICE_URL;
    if (!serviceUrl) {
      console.error(`[${requestId}] ERROR: SERVICE_URL is not set!`);
      return res.status(500).json({
        success: false,
        error: { message: 'Service configuration error: SERVICE_URL not set' }
      });
    }
    let domain = null;
    
    try {
      const response = await axios.get(`${serviceUrl}/api/config/mappingDomain`, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      if (response.data && response.data.success) {
        const allMappings = response.data.data.mappingDomains || [];
        console.log(`[${requestId}]   Loaded ${allMappings.length} mapping(s) from API`);
        
        // Find mapping that matches first path segment
        const normalizedFirstPath = normalizePath(firstPathSegment);
        domain = allMappings.find(d => {
          if (d.state !== 'Active') return false;
          const normalizedMappingPath = normalizePath(d.path);
          return normalizedMappingPath === normalizedFirstPath;
        });
        
        // If no exact match, try prefix matching
        if (!domain) {
          domain = allMappings.find(d => {
            if (d.state !== 'Active') return false;
            if (d.forward_state === 'NoneApi') return false;
            
            const normalizedMappingPath = normalizePath(d.path);
            
            // Check if first path segment starts with mapping path
            if (normalizedFirstPath.startsWith(normalizedMappingPath)) {
              const nextChar = normalizedFirstPath[normalizedMappingPath.length];
              if (!nextChar || nextChar === '/') {
                return true;
              }
            }
            
            // Handle wildcard mapping
            if (d.path.endsWith('/*')) {
              const basePath = d.path.slice(0, -1);
              const normalizedBasePath = normalizePath(basePath);
              if (normalizedFirstPath.startsWith(normalizedBasePath)) {
                const nextChar = normalizedFirstPath[normalizedBasePath.length];
                if (!nextChar || nextChar === '/') {
                  return true;
                }
              }
              if (normalizedFirstPath === normalizedBasePath) {
                return true;
              }
            }
            
            return false;
          });
        }
      }
    } catch (apiError) {
      console.error(`[${requestId}]   Error calling API to get mapping:`, apiError.message);
      // Fallback to memory-based lookup
      console.log(`[${requestId}]   Falling back to memory-based lookup`);
      domain = getMappingDomainByPath(firstPathSegment);
    }

    // If no mapping found or forward_state is NoneApi, return 404
    if (!domain || domain.forward_state === 'NoneApi') {
      console.log(`[${requestId}] [STEP 2] ❌ No mapping found or forward_state is NoneApi`);
      console.log(`[${requestId}]   Domain:`, domain ? JSON.stringify({ id: domain.id, path: domain.path, forward_state: domain.forward_state }) : 'null');
      console.log(`[${requestId}] [RESPONSE] 404 - No mapping found`);
      return res.status(404).json({
        success: false,
        error: {
          message: 'No mapping found for this path',
          path: path
        }
      });
    }
    
    console.log(`[${requestId}] [STEP 2] ✅ Mapping found`);
    console.log(`[${requestId}]   Domain ID: ${domain.id}`);
    console.log(`[${requestId}]   Project: ${domain.project_name}`);
    console.log(`[${requestId}]   Path: ${domain.path}`);
    console.log(`[${requestId}]   Forward Domain: ${domain.forward_domain}`);
    console.log(`[${requestId}]   Forward State: ${domain.forward_state}`);

    // Check if forward_state allows forwarding
    if (domain.forward_state === 'SomeApi') {
      // For SomeApi, you might want to check a whitelist or other conditions
      // For now, we'll forward all requests
    }

    // Build forward URL - replace the first path segment with forward_domain
    // Since we matched by first path segment, we need to remove it from the full path
    let forwardPath = path;
    
    // Remove the first path segment (mapping path) from the full path
    if (path.startsWith(domain.path)) {
      // Remove the mapped path prefix
      forwardPath = path.substring(domain.path.length) || '/';
    } else if (path.startsWith(firstPathSegment)) {
      // Remove the first path segment
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
    
    // Step 3: Build forward URL
    console.log(`[${requestId}] [STEP 3] Building Forward URL`);
    console.log(`[${requestId}]   Original Path: ${path}`);
    console.log(`[${requestId}]   Mapped Path: ${domain.path}`);
    console.log(`[${requestId}]   Forward Path: ${forwardPath}`);
    console.log(`[${requestId}]   Forward URL: ${forwardUrl}`);

    // Check for mock response before forwarding
    // Normalize path: remove leading slash, but keep '/' for root
    let relativePath = forwardPath.replace(/^\//, '');
    if (relativePath === '') {
      relativePath = '/';
    }
    
    // Step 4: Check for mock response
    console.log(`[${requestId}] [STEP 4] Checking Mock Response`);
    console.log(`[${requestId}]   Service URL: ${serviceUrl}`);
    console.log(`[${requestId}]   Domain ID: ${domain.id}`);
    console.log(`[${requestId}]   Relative Path: ${relativePath}`);
    console.log(`[${requestId}]   Method: ${req.method}`);
    
    try {
      const mockResponse = await axios.get(`${serviceUrl}/api/mock-responses/path`, {
        params: {
          domainId: domain.id,
          path: relativePath,
          method: req.method
        },
        timeout: 2000
      }).then(response => {
        console.log(`[${requestId}] [STEP 4] Mock check response status: ${response.status}`);
        return response.data?.data?.mockResponse;
      }).catch((err) => {
        console.log(`[${requestId}] [STEP 4] Mock check failed: ${err.message}`);
        return null;
      });

      // If mock response exists and is Active, return mock response
      if (mockResponse && mockResponse.state === 'Active') {
        console.log(`[${requestId}] [STEP 4] ✅ Mock response found (Active)`);
        console.log(`[${requestId}]   Mock ID: ${mockResponse.id}`);
        console.log(`[${requestId}]   Status Code: ${mockResponse.status_code}`);
        console.log(`[${requestId}]   Delay: ${mockResponse.delay}ms`);
        
        // Apply delay if specified
        if (mockResponse.delay > 0) {
          console.log(`[${requestId}] [STEP 4] Applying delay: ${mockResponse.delay}ms`);
          await new Promise(resolve => setTimeout(resolve, mockResponse.delay));
        }

        // Calculate duration
        const duration = Date.now() - startTime;
        console.log(`[${requestId}] [STEP 4] Total duration: ${duration}ms`);

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
          console.error(`[${requestId}] Error calling logRequest:`, err.message);
        });

        // Return mock response
        console.log(`[${requestId}] [RESPONSE] Returning mock response`);
        console.log(`[${requestId}]   Status: ${mockResponse.status_code}`);
        res.status(mockResponse.status_code);
        
        // Disable caching for mock responses to ensure status code 200 is always returned
        res.removeHeader('ETag');
        res.removeHeader('Last-Modified');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Set mock response headers (but exclude cache-related headers)
        if (mockResponse.headers && typeof mockResponse.headers === 'object') {
          const cacheHeaders = ['etag', 'last-modified', 'cache-control', 'pragma', 'expires'];
          Object.entries(mockResponse.headers).forEach(([key, value]) => {
            // Skip cache-related headers to prevent 304 responses
            if (!cacheHeaders.includes(key.toLowerCase())) {
              res.setHeader(key, value);
            }
          });
          console.log(`[${requestId}]   Headers:`, JSON.stringify(mockResponse.headers, null, 2));
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
        
        console.log(`[${requestId}] [COMPLETE] Mock response sent (${duration}ms)`);
        console.log(`[${requestId}] ========================================`);
        return; // Exit early, don't forward
      } else {
        console.log(`[${requestId}] [STEP 4] ❌ No active mock response found`);
        if (mockResponse) {
          console.log(`[${requestId}]   Mock exists but state is: ${mockResponse.state}`);
        }
      }
    } catch (error) {
      // If mock check fails, continue with normal forwarding
      console.warn(`[${requestId}] [STEP 4] ⚠️ Mock check failed, continuing with forward:`, error.message);
    }

    // Step 5: Prepare forward request
    console.log(`[${requestId}] [STEP 5] Preparing Forward Request`);
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];
    
    // Set content-type if not present and body exists
    if (req.body && Object.keys(req.body).length > 0 && !headers['content-type']) {
      headers['content-type'] = 'application/json';
    }
    
    console.log(`[${requestId}]   Forward URL: ${forwardUrl}`);
    console.log(`[${requestId}]   Method: ${req.method}`);
    console.log(`[${requestId}]   Headers:`, JSON.stringify(headers, null, 2));
    if (req.query && Object.keys(req.query).length > 0) {
      console.log(`[${requestId}]   Query Params:`, JSON.stringify(req.query, null, 2));
    }
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`[${requestId}]   Request Body:`, JSON.stringify(req.body, null, 2));
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

    // Step 6: Forward the request
    console.log(`[${requestId}] [STEP 6] Forwarding Request`);
    const forwardStartTime = Date.now();
    const response = await axios(requestOptions);
    const forwardDuration = Date.now() - forwardStartTime;
    console.log(`[${requestId}] [STEP 6] ✅ Forward response received`);
    console.log(`[${requestId}]   Status: ${response.status}`);
    console.log(`[${requestId}]   Forward Duration: ${forwardDuration}ms`);
    console.log(`[${requestId}]   Response Headers:`, JSON.stringify(response.headers, null, 2));

    // Calculate duration in milliseconds
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] [STEP 7] Total Request Duration: ${duration}ms`);

    // Store request info for logging
    req.forwardInfo = {
      domain,
      forwardUrl,
      responseStatus: response.status,
      responseData: response.data,
      responseHeaders: response.headers || {},
      duration
    };

    // Step 8: Log request to service
    console.log(`[${requestId}] [STEP 8] Logging Request to Service`);
    logRequest(req, res, () => {}).catch(err => {
      console.error(`[${requestId}] Error calling logRequest:`, err.message);
    });

    // Step 9: Return response to client
    console.log(`[${requestId}] [STEP 9] Returning Response to Client`);
    console.log(`[${requestId}]   Status: ${response.status}`);
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
    
    console.log(`[${requestId}] [COMPLETE] Request completed successfully (${duration}ms)`);
    console.log(`[${requestId}] ========================================`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] [ERROR] Forward failed`);
    console.error(`[${requestId}]   Error: ${error.message}`);
    console.error(`[${requestId}]   Stack:`, error.stack);
    console.error(`[${requestId}]   Duration: ${duration}ms`);
    
    // Store error info for logging
    req.forwardInfo = {
      error: error.message,
      responseStatus: 500,
      duration
    };

    // Call logRequest directly (fire and forget - don't await)
    logRequest(req, res, () => {}).catch(err => {
      console.error(`[${requestId}] Error calling logRequest:`, err.message);
    });
    
    // Return error response
    console.log(`[${requestId}] [RESPONSE] Returning error response (500)`);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to forward request'
      }
    });
    
    console.log(`[${requestId}] [COMPLETE] Request failed (${duration}ms)`);
    console.log(`[${requestId}] ========================================`);
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
    // SERVICE_URL must be set in docker-compose.yml
    const serviceUrl = process.env.SERVICE_URL;
    if (!serviceUrl) {
      console.error(`[LOG] ERROR: SERVICE_URL is not set! Cannot log request.`);
      return next();
    }
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

