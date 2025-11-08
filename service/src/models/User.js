const db = require('../config/database');
const bcrypt = require('bcryptjs');
const USER_STATES = require('../constants/userStates');

class User {
  static async create({ name, username, password, created_by, state, expired_time }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (name, username, password, created_by, updated_by, state, expired_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, username, hashedPassword, created_by, created_by, state || USER_STATES.ACTIVE, expired_time || null]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT id, name, username, created_by, updated_by, state, expired_time, created_at, updated_at FROM users WHERE id = ?',
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

  static async findAll() {
    const [rows] = await db.execute(
      'SELECT id, name, username, created_by, updated_by, state, expired_time, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  }

  static async update(id, { name, username, password, updated_by, state, expired_time }) {
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
    if (state !== undefined) {
      updates.push('state = ?');
      values.push(state);
    }
    if (expired_time !== undefined) {
      updates.push('expired_time = ?');
      values.push(expired_time);
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

  static isUserActive(user) {
    if (!user) return false;
    return user.state === USER_STATES.ACTIVE;
  }

  static isUserExpired(user) {
    if (!user) return true;

    // Check if state is Expired
    if (user.state === USER_STATES.EXPIRED) return true;

    // Check if expired_time has passed
    if (user.expired_time) {
      const now = new Date();
      const expiredTime = new Date(user.expired_time);
      return now > expiredTime;
    }

    return false;
  }

  static canUserLogin(user) {
    if (!user) return false;

    // User must be active
    if (!this.isUserActive(user)) return false;

    // User must not be expired
    if (this.isUserExpired(user)) return false;

    return true;
  }
}

module.exports = User;
