const db = require('../config/database');

class MappingDomain {
  static async create({ project_name, path, forward_domain, created_by, state, forward_state }) {
    const [result] = await db.execute(
      'INSERT INTO mapping_domains (project_name, path, forward_domain, created_by, updated_by, state, forward_state) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [project_name, path, forward_domain, created_by, created_by, state || 'Active', forward_state || 'NoneApi']
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM mapping_domains WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findAll() {
    const [rows] = await db.execute(
      'SELECT * FROM mapping_domains ORDER BY created_at DESC'
    );
    return rows;
  }

  static async findByPath(path) {
    const [rows] = await db.execute(
      'SELECT * FROM mapping_domains WHERE path = ? AND state = ?',
      [path, 'Active']
    );
    return rows[0];
  }

  static async update(id, { project_name, path, forward_domain, updated_by, state, forward_state }) {
    const updates = [];
    const values = [];

    if (project_name !== undefined) {
      updates.push('project_name = ?');
      values.push(project_name);
    }
    if (path !== undefined) {
      updates.push('path = ?');
      values.push(path);
    }
    if (forward_domain !== undefined) {
      updates.push('forward_domain = ?');
      values.push(forward_domain);
    }
    if (state !== undefined) {
      updates.push('state = ?');
      values.push(state);
    }
    if (forward_state !== undefined) {
      updates.push('forward_state = ?');
      values.push(forward_state);
    }
    if (updated_by !== undefined) {
      updates.push('updated_by = ?');
      values.push(updated_by);
    }

    if (updates.length === 0) return false;

    values.push(id);
    const [result] = await db.execute(
      `UPDATE mapping_domains SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.execute('DELETE FROM mapping_domains WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = MappingDomain;

