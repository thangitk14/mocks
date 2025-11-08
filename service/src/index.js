const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const config = require('./config/config');
require('./config/database'); // Initialize database connection

// Import routes
const authRoutes = require('./routes/authRoutes');
const roleRoutes = require('./routes/roleRoutes');
const roleUserRoutes = require('./routes/roleUserRoutes');
const userRoutes = require('./routes/userRoutes');
const mappingDomainRoutes = require('./routes/mappingDomainRoutes');
const apiLogRoutes = require('./routes/apiLogRoutes');
const mockResponseRoutes = require('./routes/mockResponseRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins
    credentials: true
  }
});

// Make io available globally
global.io = io;

// Middleware
app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/role-user', roleUserRoutes);
app.use('/api/users', userRoutes);
app.use('/api/config/mappingDomain', mappingDomainRoutes);
app.use('/api/logs', apiLogRoutes);
app.use('/api/mock-responses', mockResponseRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 1002,
      message: 'Route not found'
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle joining a domain room for real-time updates
  socket.on('join-domain', (domainId) => {
    const roomName = `domain-${domainId}`;
    socket.join(roomName);
    console.log(`[Socket] Client ${socket.id} joined ${roomName}`);
    
    // Log room info
    const room = io.sockets.adapter.rooms.get(roomName);
    const clientCount = room ? room.size : 0;
    console.log(`[Socket] Room ${roomName} now has ${clientCount} client(s)`);
  });

  // Handle leaving a domain room
  socket.on('leave-domain', (domainId) => {
    const roomName = `domain-${domainId}`;
    socket.leave(roomName);
    console.log(`[Socket] Client ${socket.id} left ${roomName}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = config.port;
// Listen on 0.0.0.0 in production to accept connections from both localhost and external interfaces
const HOST = config.nodeEnv === 'production' ? '0.0.0.0' : 'localhost';
server.listen(PORT, HOST, () => {
  console.log(`Server is running on ${HOST}:${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Socket.IO server initialized`);
  if (config.nodeEnv === 'production') {
    console.log(`Listening on 0.0.0.0 (accessible from localhost and external interfaces)`);
  }
});

module.exports = { app, server, io };
