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
    if (!total_mocks || total_mocks === 0) {
      return 'InActive';
    }

    // Convert to number to ensure proper comparison
    const totalCount = Number(total_mocks);
    const activeCount = Number(active_mocks || 0);

    // Active only if ALL mocks are Active
    return totalCount === activeCount && activeCount > 0 ? 'Active' : 'InActive';
  }

  // Toggle group state
  static async toggleGroupState(groupId) {
    const currentState = await this.getGroupState(groupId);

    if (currentState === 'Active') {
      // Active -> InActive: Set all mocks in group to Forward
      await db.execute(
        `UPDATE mock_responses mr
         JOIN mock_group_responses mgr ON mr.id = mgr.mock_response_id
         SET mr.state = 'Forward'
         WHERE mgr.group_id = ?`,
        [groupId]
      );
      return 'InActive';
    } else {
      // InActive -> Active:
      // Step 1: For each mock in group, set ALL mocks with same path+method to Forward
      // Step 2: Then set mocks in group to Active

      // First, get all mocks in this group with their path/method/domain
      const [groupMocks] = await db.execute(
        `SELECT DISTINCT mr.domain_id, mr.path, mr.method
         FROM mock_group_responses mgr
         JOIN mock_responses mr ON mgr.mock_response_id = mr.id
         WHERE mgr.group_id = ?`,
        [groupId]
      );

      // For each unique path/method combination, set all related mocks to Forward
      for (const mock of groupMocks) {
        await db.execute(
          `UPDATE mock_responses
           SET state = 'Forward'
           WHERE domain_id = ? AND path = ? AND method = ?`,
          [mock.domain_id, mock.path, mock.method]
        );
      }

      // Now set only the mocks in this group to Active
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
