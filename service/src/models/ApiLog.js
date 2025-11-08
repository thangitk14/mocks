const db = require('../config/database');

class ApiLog {
  static async create({ domain_id, headers, body, query, method, status, toCUrl }) {
    const [result] = await db.execute(
      'INSERT INTO api_logs (domain_id, headers, body, query, method, status, toCUrl) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        domain_id,
        JSON.stringify(headers || {}),
        JSON.stringify(body || {}),
        JSON.stringify(query || {}),
        method,
        status,
        toCUrl
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
    }
    return rows[0];
  }

  static async findByDomainId(domainId, limit = 100, offset = 0) {
    const [rows] = await db.execute(
      'SELECT * FROM api_logs WHERE domain_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [domainId, limit, offset]
    );
    return rows.map(row => ({
      ...row,
      headers: JSON.parse(row.headers || '{}'),
      body: JSON.parse(row.body || '{}'),
      query: JSON.parse(row.query || '{}')
    }));
  }

  static async findAll(limit = 100, offset = 0) {
    const [rows] = await db.execute(
      'SELECT * FROM api_logs ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return rows.map(row => ({
      ...row,
      headers: JSON.parse(row.headers || '{}'),
      body: JSON.parse(row.body || '{}'),
      query: JSON.parse(row.query || '{}')
    }));
  }

  static async countByDomainId(domainId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM api_logs WHERE domain_id = ?',
      [domainId]
    );
    return rows[0].count;
  }
}

module.exports = ApiLog;

