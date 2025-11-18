const MockGroupResponse = require('../models/MockGroupResponse');
const MockGroup = require('../models/MockGroup');
const MockResponse = require('../models/MockResponse');
const AppError = require('../utils/AppError');

const getMockGroupResponses = async (req, res, next) => {
  try {
    const { group_id, mock_response_id } = req.query;

    let mockGroupResponses;
    if (group_id) {
      mockGroupResponses = await MockGroupResponse.findByGroupId(group_id);
    } else if (mock_response_id) {
      mockGroupResponses = await MockGroupResponse.findByMockResponseId(mock_response_id);
    } else {
      mockGroupResponses = await MockGroupResponse.findAll();
    }

    res.json({
      success: true,
      data: {
        mockGroupResponses
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMockGroupResponseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mockGroupResponse = await MockGroupResponse.findById(id);

    if (!mockGroupResponse) {
      throw new AppError({
        message: 'Mock group response not found',
        statusCode: 404,
        errorCode: 'MOCK_GROUP_RESPONSE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        mockGroupResponse
      }
    });
  } catch (error) {
    next(error);
  }
};

const createMockGroupResponse = async (req, res, next) => {
  try {
    const { group_id, mock_response_id } = req.body;

    if (!group_id || !mock_response_id) {
      throw new AppError({
        message: 'group_id and mock_response_id are required',
        statusCode: 400,
        errorCode: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Verify that the group exists
    const group = await MockGroup.findById(group_id);
    if (!group) {
      throw new AppError({
        message: 'Mock group not found',
        statusCode: 404,
        errorCode: 'MOCK_GROUP_NOT_FOUND'
      });
    }

    // Verify that the mock response exists
    const mockResponse = await MockResponse.findById(mock_response_id);
    if (!mockResponse) {
      throw new AppError({
        message: 'Mock response not found',
        statusCode: 404,
        errorCode: 'MOCK_RESPONSE_NOT_FOUND'
      });
    }

    const mockGroupResponseId = await MockGroupResponse.create({
      group_id,
      mock_response_id
    });

    const mockGroupResponse = await MockGroupResponse.findById(mockGroupResponseId);

    res.status(201).json({
      success: true,
      data: {
        mockGroupResponse
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteMockGroupResponse = async (req, res, next) => {
  try {
    const { id } = req.params;

    const mockGroupResponse = await MockGroupResponse.findById(id);
    if (!mockGroupResponse) {
      throw new AppError({
        message: 'Mock group response not found',
        statusCode: 404,
        errorCode: 'MOCK_GROUP_RESPONSE_NOT_FOUND'
      });
    }

    const deleted = await MockGroupResponse.delete(id);

    if (!deleted) {
      throw new AppError({
        message: 'Failed to delete mock group response',
        statusCode: 500,
        errorCode: 'DELETE_FAILED'
      });
    }

    res.json({
      success: true,
      message: 'Mock group response deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const deleteMockGroupResponseByGroupAndMockResponse = async (req, res, next) => {
  try {
    const { group_id, mock_response_id } = req.body;

    if (!group_id || !mock_response_id) {
      throw new AppError({
        message: 'group_id and mock_response_id are required',
        statusCode: 400,
        errorCode: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const deleted = await MockGroupResponse.deleteByGroupAndMockResponse(group_id, mock_response_id);

    if (!deleted) {
      throw new AppError({
        message: 'Failed to delete mock group response',
        statusCode: 404,
        errorCode: 'MOCK_GROUP_RESPONSE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Mock group response deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMockGroupResponses,
  getMockGroupResponseById,
  createMockGroupResponse,
  deleteMockGroupResponse,
  deleteMockGroupResponseByGroupAndMockResponse
};
