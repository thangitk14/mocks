const db = require('../config/database');

class RoleUser {
  static async create({ user_id, role_id }) {
    const [result] = await db.execute(
      'INSERT INTO role_user (user_id, role_id) VALUES (?, ?)',
      [user_id, role_id]
    );
    return result.insertId;
  }

  static async findByUserId(userId) {
    const [rows] = await db.execute(
      'SELECT * FROM role_user WHERE user_id = ?',
      [userId]
    );
    return rows;
  }

  static async findByRoleId(roleId) {
    const [rows] = await db.execute(
      'SELECT * FROM role_user WHERE role_id = ?',
      [roleId]
    );
    return rows;
  }

  static async delete(userId, roleId) {
    const [result] = await db.execute(
      'DELETE FROM role_user WHERE user_id = ? AND role_id = ?',
      [userId, roleId]
    );
    return result.affectedRows > 0;
  }

  static async deleteByUserId(userId) {
    const [result] = await db.execute(
      'DELETE FROM role_user WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows > 0;
  }

  static async deleteByRoleId(roleId) {
    const [result] = await db.execute(
      'DELETE FROM role_user WHERE role_id = ?',
      [roleId]
    );
    return result.affectedRows > 0;
  }

  static async assignRolesToUser(userId, roleIds) {
    // First, remove all existing roles for the user
    await this.deleteByUserId(userId);

    // Then, add new roles
    if (roleIds && roleIds.length > 0) {
      const values = roleIds.map(roleId => [userId, roleId]);
      await db.query(
        'INSERT INTO role_user (user_id, role_id) VALUES ?',
        [values]
      );
    }
    return true;
  }
}

module.exports = RoleUser;
