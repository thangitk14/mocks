const db = require('../config/database');

class Role {
  static async create({ code, name, path }) {
    const [result] = await db.execute(
      'INSERT INTO roles (code, name, path) VALUES (?, ?, ?)',
      [code, name, path]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM roles WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findByCode(code) {
    const [rows] = await db.execute(
      'SELECT * FROM roles WHERE code = ?',
      [code]
    );
    return rows[0];
  }

  static async findAll() {
    const [rows] = await db.execute('SELECT * FROM roles');
    return rows;
  }

  static async update(id, { code, name, path }) {
    const updates = [];
    const values = [];

    if (code !== undefined) {
      updates.push('code = ?');
      values.push(code);
    }
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (path !== undefined) {
      updates.push('path = ?');
      values.push(path);
    }

    if (updates.length === 0) return false;

    values.push(id);
    const [result] = await db.execute(
      `UPDATE roles SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.execute('DELETE FROM roles WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async checkPathPermission(roleId, requestPath) {
    const role = await this.findById(roleId);
    if (!role || !role.path) return false;

    // Convert path pattern to regex (e.g., /config/* becomes /config/.*)
    const pathPattern = role.path.replace(/\*/g, '.*');
    const regex = new RegExp(`^${pathPattern}$`);

    return regex.test(requestPath);
  }
}

module.exports = Role;
