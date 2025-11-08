const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { forwardRequest, logRequest } = require('./middleware/forward');
const { loadConfig, refreshConfig } = require('./config/configLoader');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;
const SERVICE_URL = process.env.SERVICE_URL || 'http://localhost:3000';

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
app.all('*', (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  forwardRequest(req, res, next);
}, logRequest);

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

app.listen(PORT, () => {
  console.log(`Host Forward service is running on port ${PORT}`);
  console.log(`Service URL: ${SERVICE_URL}`);
});

module.exports = app;

