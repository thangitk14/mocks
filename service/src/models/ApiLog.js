const db = require('../config/database');

class ApiLog {
  static async create({ domain_id, headers, body, query, method, status, toCUrl, responseHeaders, responseBody, duration }) {
    const [result] = await db.execute(
      'INSERT INTO api_logs (domain_id, headers, body, query, method, status, toCUrl, response_headers, response_body, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        domain_id,
        JSON.stringify(headers || {}),
        JSON.stringify(body || {}),
        JSON.stringify(query || {}),
        method,
        status,
        toCUrl,
        JSON.stringify(responseHeaders || {}),
        JSON.stringify(responseBody || null),
        duration || null
      ]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM api_logs WHERE id = ?',
      [id]
    );
    if (rows[0]) {
      rows[0].headers = JSON.parse(rows[0].headers || '{}');
      rows[0].body = JSON.parse(rows[0].body || '{}');
      rows[0].query = JSON.parse(rows[0].query || '{}');
      rows[0].responseHeaders = rows[0].response_headers ? JSON.parse(rows[0].response_headers) : {};
      rows[0].responseBody = rows[0].response_body ? JSON.parse(rows[0].response_body) : null;
    }
    return rows[0];
  }

  static async findByDomainId(domainId, limit = 100, offset = 0) {
    // Convert to integers and validate to avoid MySQL prepared statement issues
    const domainIdInt = parseInt(domainId);
    const limitInt = Math.max(1, Math.min(1000, parseInt(limit) || 100)); // Clamp between 1 and 1000
    const offsetInt = Math.max(0, parseInt(offset) || 0); // Ensure non-negative
    
    if (isNaN(domainIdInt)) {
      throw new Error('Invalid domainId');
    }
    
    // Use query instead of execute to avoid LIMIT/OFFSET placeholder issues
    // Values are validated integers, safe for template string
    const [rows] = await db.query(
      `SELECT * FROM api_logs WHERE domain_id = ? ORDER BY created_at DESC LIMIT ${limitInt} OFFSET ${offsetInt}`,
      [domainIdInt]
    );
    return rows.map(row => ({
      ...row,
      headers: JSON.parse(row.headers || '{}'),
      body: JSON.parse(row.body || '{}'),
      query: JSON.parse(row.query || '{}'),
      responseHeaders: row.response_headers ? JSON.parse(row.response_headers) : {},
      responseBody: row.response_body ? JSON.parse(row.response_body) : null
    }));
  }

  static async findAll(limit = 100, offset = 0) {
    // Convert to integers and validate to avoid MySQL prepared statement issues
    const limitInt = Math.max(1, Math.min(1000, parseInt(limit) || 100)); // Clamp between 1 and 1000
    const offsetInt = Math.max(0, parseInt(offset) || 0); // Ensure non-negative
    
    // Use query instead of execute to avoid LIMIT/OFFSET placeholder issues
    // Values are validated integers, safe for template string
    const [rows] = await db.query(
      `SELECT * FROM api_logs ORDER BY created_at DESC LIMIT ${limitInt} OFFSET ${offsetInt}`
    );
    return rows.map(row => ({
      ...row,
      headers: JSON.parse(row.headers || '{}'),
      body: JSON.parse(row.body || '{}'),
      query: JSON.parse(row.query || '{}'),
      responseHeaders: row.response_headers ? JSON.parse(row.response_headers) : {},
      responseBody: row.response_body ? JSON.parse(row.response_body) : null
    }));
  }

  static async countByDomainId(domainId) {
    // Convert to integer to avoid MySQL prepared statement issues
    const domainIdInt = parseInt(domainId);
    
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM api_logs WHERE domain_id = ?',
      [domainIdInt]
    );
    return rows[0].count;
  }
}

module.exports = ApiLog;

