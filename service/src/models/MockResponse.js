const db = require('../config/database');

class MockResponse {
  static async create({ domain_id, name, path, method, status_code, delay, headers, body, state }) {
    // Default name to path if not provided
    const mockName = name || path;
    const [result] = await db.execute(
      'INSERT INTO mock_responses (domain_id, name, path, method, status_code, delay, headers, body, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        domain_id,
        mockName,
        path,
        method,
        status_code,
        delay || 0,
        JSON.stringify(headers || {}),
        JSON.stringify(body || null),
        state || 'Active'
      ]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM mock_responses WHERE id = ?',
      [id]
    );
    if (rows[0]) {
      rows[0].headers = rows[0].headers ? JSON.parse(rows[0].headers) : {};
      rows[0].body = rows[0].body ? JSON.parse(rows[0].body) : null;
    }
    return rows[0];
  }

  static async findByPath(domainId, path, method) {
    const [rows] = await db.execute(
      'SELECT * FROM mock_responses WHERE domain_id = ? AND path = ? AND method = ? AND state = ?',
      [domainId, path, method, 'Active']
    );
    if (rows[0]) {
      rows[0].headers = rows[0].headers ? JSON.parse(rows[0].headers) : {};
      rows[0].body = rows[0].body ? JSON.parse(rows[0].body) : null;
    }
    return rows[0];
  }

  static async findByDomainId(domainId) {
    const [rows] = await db.execute(
      'SELECT * FROM mock_responses WHERE domain_id = ? ORDER BY created_at DESC',
      [domainId]
    );
    return rows.map(row => ({
      ...row,
      headers: row.headers ? JSON.parse(row.headers) : {},
      body: row.body ? JSON.parse(row.body) : null
    }));
  }

  static async findAll(limit = 100, offset = 0) {
    const limitInt = Math.max(1, Math.min(1000, parseInt(limit) || 100));
    const offsetInt = Math.max(0, parseInt(offset) || 0);
    
    const [rows] = await db.query(
      `SELECT * FROM mock_responses ORDER BY created_at DESC LIMIT ${limitInt} OFFSET ${offsetInt}`
    );
    return rows.map(row => ({
      ...row,
      headers: row.headers ? JSON.parse(row.headers) : {},
      body: row.body ? JSON.parse(row.body) : null
    }));
  }

  static async update(id, { name, status_code, delay, headers, body, state }) {
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (status_code !== undefined) {
      updates.push('status_code = ?');
      values.push(status_code);
    }
    if (delay !== undefined) {
      updates.push('delay = ?');
      values.push(delay);
    }
    if (headers !== undefined) {
      updates.push('headers = ?');
      values.push(JSON.stringify(headers));
    }
    if (body !== undefined) {
      updates.push('body = ?');
      values.push(JSON.stringify(body));
    }
    if (state !== undefined) {
      updates.push('state = ?');
      values.push(state);
    }

    if (updates.length === 0) {
      return false;
    }

    values.push(id);
    const [result] = await db.execute(
      `UPDATE mock_responses SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.execute(
      'DELETE FROM mock_responses WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async findByDomainAndPath(domainId, path, method) {
    const [rows] = await db.execute(
      'SELECT * FROM mock_responses WHERE domain_id = ? AND path = ? AND method = ?',
      [domainId, path, method]
    );
    if (rows[0]) {
      rows[0].headers = rows[0].headers ? JSON.parse(rows[0].headers) : {};
      rows[0].body = rows[0].body ? JSON.parse(rows[0].body) : null;
    }
    return rows[0];
  }
}

module.exports = MockResponse;

