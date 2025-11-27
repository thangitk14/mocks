const express = require('express');
const cors = require('cors');
const config = require('./config/config');
require('./config/database'); // Initialize database connection

// Import routes
const logRoutes = require('./routes/logRoutes');

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/logs', logRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Service Logs is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'Route not found'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error'
    }
  });
});

// Start server
const PORT = config.port;
const HOST = config.nodeEnv === 'production' ? '0.0.0.0' : 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`Service Logs is running on ${HOST}:${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

module.exports = app;

