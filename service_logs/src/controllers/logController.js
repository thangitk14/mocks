const Log = require('../models/Log');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const { Readable } = require('stream');

class LogController {
  // POST /api/logs - Store list of logs
  static async storeLogs(req, res) {
    try {
      const { logs } = req.body;

      if (!logs || !Array.isArray(logs)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'logs must be an array'
          }
        });
      }

      if (logs.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'EMPTY_ARRAY',
            message: 'logs array cannot be empty'
          }
        });
      }

      const result = await Log.createBatch(logs);

      res.status(201).json({
        success: true,
        data: {
          inserted: result.inserted,
          total: logs.length,
          errors: result.errors.length > 0 ? result.errors : undefined
        }
      });
    } catch (error) {
      console.error('Error storing logs:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      });
    }
  }

  // POST /api/logs/csv - Upload CSV file and store logs
  static async uploadCsv(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No CSV file uploaded'
          }
        });
      }

      const logs = [];
      const errors = [];

      return new Promise((resolve, reject) => {
        const stream = Readable.from(req.file.buffer.toString());
        
        stream
          .pipe(csv())
          .on('data', (row) => {
            try {
              // Map CSV columns to log model
              const log = {
                id: row.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId: row.userId || null,
                sessionId: row.sessionId || null,
                deviceId: row.deviceId || null,
                deviceModel: row.deviceModel || null,
                deviceVersion: row.deviceVersion || null,
                osName: row.osName || null,
                osVersion: row.osVersion || null,
                appVersion: row.appVersion || null,
                environment: row.environment || null,
                logLevel: row.logLevel || null,
                logSource: row.logSource || null,
                logCategory: row.logCategory || null,
                logContent: row.logContent || null,
                errorCode: row.errorCode || null,
                stackTrace: row.stackTrace || null,
                logIndex: row.logIndex || null,
                url: row.url || null,
                userAgent: row.userAgent || null,
                ipAddress: row.ipAddress || null,
                networkType: row.networkType || null,
                screenResolution: row.screenResolution || null,
                viewport: row.viewport || null,
                timestamp: row.timestamp ? parseInt(row.timestamp) : Date.now(),
                createdAt: row.createdAt || new Date().toISOString(),
                tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : [],
                metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : {},
                performance: row.performance ? (typeof row.performance === 'string' ? JSON.parse(row.performance) : row.performance) : {},
                previousLogId: row.previousLogId || null,
                isResolved: row.isResolved === 'true' || row.isResolved === '1' || false
              };
              logs.push(log);
            } catch (error) {
              errors.push({
                row: JSON.stringify(row),
                error: error.message
              });
            }
          })
          .on('end', async () => {
            try {
              if (logs.length === 0) {
                res.status(400).json({
                  success: false,
                  error: {
                    code: 'NO_VALID_LOGS',
                    message: 'No valid logs found in CSV file',
                    errors
                  }
                });
                return resolve();
              }

              const result = await Log.createBatch(logs);

              res.status(201).json({
                success: true,
                data: {
                  inserted: result.inserted,
                  total: logs.length,
                  csvErrors: errors.length > 0 ? errors : undefined,
                  dbErrors: result.errors.length > 0 ? result.errors : undefined
                }
              });
              resolve();
            } catch (error) {
              reject(error);
            }
          })
          .on('error', (error) => {
            reject(error);
          });
      });
    } catch (error) {
      console.error('Error uploading CSV:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      });
    }
  }

  // GET /api/logs/export - Export logs as CSV
  static async exportLogs(req, res) {
    try {
      const { logSource, logLevel, environment, startDate, endDate } = req.query;

      const filters = {};
      if (logSource) filters.logSource = logSource;
      if (logLevel) filters.logLevel = logLevel;
      if (environment) filters.environment = environment;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const logs = await Log.findAll(filters);

      if (logs.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_LOGS_FOUND',
            message: 'No logs found matching the criteria'
          }
        });
      }

      // Create CSV content
      const csvRows = [];
      csvRows.push([
        'id', 'userId', 'sessionId', 'deviceId', 'deviceModel', 'deviceVersion',
        'osName', 'osVersion', 'appVersion', 'environment', 'logLevel', 'logSource',
        'logCategory', 'logContent', 'errorCode', 'stackTrace', 'logIndex',
        'url', 'userAgent', 'ipAddress', 'networkType', 'screenResolution',
        'viewport', 'timestamp', 'createdAt', 'tags', 'metadata', 'performance',
        'previousLogId', 'isResolved'
      ].join(','));

      logs.forEach(log => {
        const row = [
          log.id || '',
          log.userId || '',
          log.sessionId || '',
          log.deviceId || '',
          log.deviceModel || '',
          log.deviceVersion || '',
          log.osName || '',
          log.osVersion || '',
          log.appVersion || '',
          log.environment || '',
          log.logLevel || '',
          log.logSource || '',
          log.logCategory || '',
          (log.logContent || '').replace(/"/g, '""'), // Escape quotes
          log.errorCode || '',
          (log.stackTrace || '').replace(/"/g, '""'), // Escape quotes
          log.logIndex || '',
          log.url || '',
          (log.userAgent || '').replace(/"/g, '""'), // Escape quotes
          log.ipAddress || '',
          log.networkType || '',
          log.screenResolution || '',
          log.viewport || '',
          log.timestamp || '',
          log.createdAt || '',
          JSON.stringify(log.tags || []),
          JSON.stringify(log.metadata || {}),
          JSON.stringify(log.performance || {}),
          log.previousLogId || '',
          log.isResolved ? 'true' : 'false'
        ].map(field => `"${field}"`).join(',');
        csvRows.push(row);
      });

      const csvContent = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="logs_export_${Date.now()}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('Error exporting logs:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      });
    }
  }
}

module.exports = LogController;

