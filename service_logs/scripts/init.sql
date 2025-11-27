-- Create database if not exists
CREATE DATABASE IF NOT EXISTS service_logs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE service_logs;

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
  id VARCHAR(255) PRIMARY KEY,
  userId VARCHAR(255),
  sessionId VARCHAR(255),
  deviceId VARCHAR(255),
  deviceModel VARCHAR(255),
  deviceVersion VARCHAR(255),
  osName VARCHAR(255),
  osVersion VARCHAR(255),
  appVersion VARCHAR(255),
  environment VARCHAR(255),
  logLevel VARCHAR(50),
  logSource VARCHAR(255),
  logCategory VARCHAR(255),
  logContent TEXT,
  errorCode VARCHAR(255),
  stackTrace TEXT,
  logIndex VARCHAR(50),
  url TEXT,
  userAgent TEXT,
  ipAddress VARCHAR(45),
  networkType VARCHAR(50),
  screenResolution VARCHAR(50),
  viewport VARCHAR(50),
  timestamp BIGINT,
  createdAt VARCHAR(255),
  tags JSON,
  metadata JSON,
  performance JSON,
  previousLogId VARCHAR(255),
  isResolved TINYINT(1) DEFAULT 0,
  createdAt_db TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_logSource (logSource),
  INDEX idx_logLevel (logLevel),
  INDEX idx_environment (environment),
  INDEX idx_timestamp (timestamp),
  INDEX idx_userId (userId),
  INDEX idx_sessionId (sessionId),
  INDEX idx_createdAt_db (createdAt_db)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

