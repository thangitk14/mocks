const db = require('../config/database');

class MockGroup {
  static async create({ name }) {
    const [result] = await db.execute(
      'INSERT INTO mock_groups (name) VALUES (?)',
      [name]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM mock_groups WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findAll() {
    const [rows] = await db.execute(
      'SELECT * FROM mock_groups ORDER BY created_at DESC'
    );
    return rows;
  }

  static async update(id, { name }) {
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (updates.length === 0) {
      return false;
    }

    values.push(id);
    const [result] = await db.execute(
      `UPDATE mock_groups SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.execute(
      'DELETE FROM mock_groups WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = MockGroup;
