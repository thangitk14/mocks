const db = require('../config/database');

class MockGroupResponse {
  static async create({ group_id, mock_response_id }) {
    const [result] = await db.execute(
      'INSERT INTO mock_group_responses (group_id, mock_response_id) VALUES (?, ?)',
      [group_id, mock_response_id]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM mock_group_responses WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findByGroupId(groupId) {
    const [rows] = await db.execute(
      `SELECT mgr.*, mr.*
       FROM mock_group_responses mgr
       JOIN mock_responses mr ON mgr.mock_response_id = mr.id
       WHERE mgr.group_id = ?
       ORDER BY mgr.created_at DESC`,
      [groupId]
    );
    return rows;
  }

  static async findByMockResponseId(mockResponseId) {
    const [rows] = await db.execute(
      'SELECT * FROM mock_group_responses WHERE mock_response_id = ?',
      [mockResponseId]
    );
    return rows;
  }

  static async findAll() {
    const [rows] = await db.execute(
      'SELECT * FROM mock_group_responses ORDER BY created_at DESC'
    );
    return rows;
  }

  static async delete(id) {
    const [result] = await db.execute(
      'DELETE FROM mock_group_responses WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async deleteByGroupAndMockResponse(groupId, mockResponseId) {
    const [result] = await db.execute(
      'DELETE FROM mock_group_responses WHERE group_id = ? AND mock_response_id = ?',
      [groupId, mockResponseId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = MockGroupResponse;
