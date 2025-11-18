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

  // Get group state: Active if all mocks are Active, otherwise InActive
  static async getGroupState(groupId) {
    const [rows] = await db.execute(
      `SELECT
        COUNT(*) as total_mocks,
        SUM(CASE WHEN mr.state = 'Active' THEN 1 ELSE 0 END) as active_mocks
       FROM mock_group_responses mgr
       JOIN mock_responses mr ON mgr.mock_response_id = mr.id
       WHERE mgr.group_id = ?`,
      [groupId]
    );

    const { total_mocks, active_mocks } = rows[0];

    // If no mocks in group, consider it InActive
    if (total_mocks === 0) {
      return 'InActive';
    }

    // Active only if ALL mocks are Active
    return total_mocks === active_mocks ? 'Active' : 'InActive';
  }

  // Toggle group state
  static async toggleGroupState(groupId) {
    const currentState = await this.getGroupState(groupId);

    if (currentState === 'Active') {
      // Active -> InActive: Set all mocks to Forward
      await db.execute(
        `UPDATE mock_responses mr
         JOIN mock_group_responses mgr ON mr.id = mgr.mock_response_id
         SET mr.state = 'Forward'
         WHERE mgr.group_id = ?`,
        [groupId]
      );
      return 'InActive';
    } else {
      // InActive -> Active: First set all to Forward, then set all to Active
      // Step 1: Set all to Forward first
      await db.execute(
        `UPDATE mock_responses mr
         JOIN mock_group_responses mgr ON mr.id = mgr.mock_response_id
         SET mr.state = 'Forward'
         WHERE mgr.group_id = ?`,
        [groupId]
      );

      // Step 2: Set all to Active
      await db.execute(
        `UPDATE mock_responses mr
         JOIN mock_group_responses mgr ON mr.id = mgr.mock_response_id
         SET mr.state = 'Active'
         WHERE mgr.group_id = ?`,
        [groupId]
      );
      return 'Active';
    }
  }
}

module.exports = MockGroup;
