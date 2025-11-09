const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { forwardRequest, logRequest } = require('./middleware/forward');
const { loadConfig, refreshConfig } = require('./config/configLoader');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;
// SERVICE_URL must be set in docker-compose.yml or environment
const SERVICE_URL = process.env.SERVICE_URL;
if (!SERVICE_URL) {
  console.error('ERROR: SERVICE_URL environment variable is not set!');
  console.error('Please set SERVICE_URL in docker-compose.yml or environment');
  process.exit(1);
}

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load config on startup
loadConfig(SERVICE_URL).then(() => {
  console.log('Configuration loaded successfully');
}).catch(err => {
  console.error('Failed to load configuration:', err.message);
});

// Refresh config every 30 seconds
setInterval(() => {
  refreshConfig(SERVICE_URL).catch(err => {
    console.error('Failed to refresh configuration:', err.message);
  });
}, 30000);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Host Forward service is running',
    timestamp: new Date().toISOString()
  });
});

// Forward all requests (except health check)
// logRequest is now called directly inside forwardRequest
app.all('*', (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  forwardRequest(req, res, next);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error'
    }
  });
});

// Listen on 0.0.0.0 in production to accept connections from both localhost and external interfaces
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
app.listen(PORT, HOST, () => {
  console.log(`Host Forward service is running on ${HOST}:${PORT}`);
  console.log(`Service URL: ${SERVICE_URL}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`Listening on 0.0.0.0 (accessible from localhost and external interfaces)`);
  }
});

module.exports = app;

