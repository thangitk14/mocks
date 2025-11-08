const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ name, username, password, created_by, role_user_id }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (name, username, password, created_by, updated_by, role_user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, username, hashedPassword, created_by, created_by, role_user_id]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT id, name, username, created_by, updated_by, role_user_id, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findByUsername(username) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows[0];
  }

  static async update(id, { name, username, password, updated_by, role_user_id }) {
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (username !== undefined) {
      updates.push('username = ?');
      values.push(username);
    }
    if (password !== undefined) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }
    if (role_user_id !== undefined) {
      updates.push('role_user_id = ?');
      values.push(role_user_id);
    }
    if (updated_by !== undefined) {
      updates.push('updated_by = ?');
      values.push(updated_by);
    }

    if (updates.length === 0) return false;

    values.push(id);
    const [result] = await db.execute(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static async getRolesForUser(userId) {
    const [rows] = await db.execute(
      `SELECT r.* FROM roles r
       INNER JOIN role_user ru ON r.id = ru.role_id
       WHERE ru.user_id = ?`,
      [userId]
    );
    return rows;
  }
}

module.exports = User;
