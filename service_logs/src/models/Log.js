const db = require('../config/database');

class Log {
  static async create(logData) {
    const {
      id,
      userId,
      sessionId,
      deviceId,
      deviceModel,
      deviceVersion,
      osName,
      osVersion,
      appVersion,
      environment,
      logLevel,
      logSource,
      logCategory,
      logContent,
      errorCode,
      stackTrace,
      logIndex,
      url,
      userAgent,
      ipAddress,
      networkType,
      screenResolution,
      viewport,
      timestamp,
      createdAt,
      tags,
      metadata,
      performance,
      previousLogId,
      isResolved
    } = logData;

    const [result] = await db.execute(
      `INSERT INTO logs (
        id, userId, sessionId, deviceId, deviceModel, deviceVersion,
        osName, osVersion, appVersion, environment, logLevel, logSource,
        logCategory, logContent, errorCode, stackTrace, logIndex,
        url, userAgent, ipAddress, networkType, screenResolution,
        viewport, timestamp, createdAt, tags, metadata, performance,
        previousLogId, isResolved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId || null,
        sessionId || null,
        deviceId || null,
        deviceModel || null,
        deviceVersion || null,
        osName || null,
        osVersion || null,
        appVersion || null,
        environment || null,
        logLevel || null,
        logSource || null,
        logCategory || null,
        logContent || null,
        errorCode || null,
        stackTrace || null,
        logIndex || null,
        url || null,
        userAgent || null,
        ipAddress || null,
        networkType || null,
        screenResolution || null,
        viewport || null,
        timestamp || null,
        createdAt || null,
        tags ? JSON.stringify(tags) : null,
        metadata ? JSON.stringify(metadata) : null,
        performance ? JSON.stringify(performance) : null,
        previousLogId || null,
        isResolved !== undefined ? (isResolved ? 1 : 0) : 0
      ]
    );
    return result.insertId;
  }

  static async createBatch(logsArray) {
    if (!logsArray || logsArray.length === 0) {
      return { inserted: 0, errors: [] };
    }

    const errors = [];
    let inserted = 0;

    for (const logData of logsArray) {
      try {
        await this.create(logData);
        inserted++;
      } catch (error) {
        errors.push({
          logId: logData.id || 'unknown',
          error: error.message
        });
      }
    }

    return { inserted, errors };
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM logs WHERE 1=1';
    const values = [];

    if (filters.logSource) {
      query += ' AND logSource = ?';
      values.push(filters.logSource);
    }

    if (filters.logLevel) {
      query += ' AND logLevel = ?';
      values.push(filters.logLevel);
    }

    if (filters.environment) {
      query += ' AND environment = ?';
      values.push(filters.environment);
    }

    if (filters.startDate) {
      query += ' AND timestamp >= ?';
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND timestamp <= ?';
      values.push(filters.endDate);
    }

    query += ' ORDER BY timestamp DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      values.push(parseInt(filters.limit));
    }

    const [rows] = await db.execute(query, values);
    return rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      performance: row.performance ? JSON.parse(row.performance) : {},
      isResolved: row.isResolved === 1
    }));
  }

  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM logs WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      performance: row.performance ? JSON.parse(row.performance) : {},
      isResolved: row.isResolved === 1
    };
  }

  static async update(id, updates) {
    const updateFields = [];
    const values = [];

    const allowedFields = [
      'logLevel', 'logContent', 'errorCode', 'stackTrace',
      'isResolved', 'tags', 'metadata', 'performance'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'tags' || field === 'metadata' || field === 'performance') {
          updateFields.push(`${field} = ?`);
          values.push(JSON.stringify(updates[field]));
        } else if (field === 'isResolved') {
          updateFields.push(`${field} = ?`);
          values.push(updates[field] ? 1 : 0);
        } else {
          updateFields.push(`${field} = ?`);
          values.push(updates[field]);
        }
      }
    }

    if (updateFields.length === 0) return false;

    values.push(id);
    const [result] = await db.execute(
      `UPDATE logs SET ${updateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.execute('DELETE FROM logs WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Log;

