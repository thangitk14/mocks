const MockGroup = require('../models/MockGroup');
const MockGroupResponse = require('../models/MockGroupResponse');
const AppError = require('../utils/AppError');

const getMockGroups = async (req, res, next) => {
  try {
    const mockGroups = await MockGroup.findAll();

    res.json({
      success: true,
      data: {
        mockGroups
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMockGroupById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mockGroup = await MockGroup.findById(id);

    if (!mockGroup) {
      throw new AppError({
        message: 'Mock group not found',
        statusCode: 404,
        errorCode: 'MOCK_GROUP_NOT_FOUND'
      });
    }

    // Get associated mock responses
    const mockResponses = await MockGroupResponse.findByGroupId(id);

    res.json({
      success: true,
      data: {
        mockGroup,
        mockResponses
      }
    });
  } catch (error) {
    next(error);
  }
};

const createMockGroup = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      throw new AppError({
        message: 'Name is required',
        statusCode: 400,
        errorCode: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const mockGroupId = await MockGroup.create({
      name: name.trim()
    });

    const mockGroup = await MockGroup.findById(mockGroupId);

    res.status(201).json({
      success: true,
      data: {
        mockGroup
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateMockGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const mockGroup = await MockGroup.findById(id);
    if (!mockGroup) {
      throw new AppError({
        message: 'Mock group not found',
        statusCode: 404,
        errorCode: 'MOCK_GROUP_NOT_FOUND'
      });
    }

    if (!name || !name.trim()) {
      throw new AppError({
        message: 'Name is required',
        statusCode: 400,
        errorCode: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const updated = await MockGroup.update(id, { name: name.trim() });

    if (!updated) {
      throw new AppError({
        message: 'Failed to update mock group',
        statusCode: 500,
        errorCode: 'UPDATE_FAILED'
      });
    }

    const updatedMockGroup = await MockGroup.findById(id);

    res.json({
      success: true,
      data: {
        mockGroup: updatedMockGroup
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteMockGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const mockGroup = await MockGroup.findById(id);
    if (!mockGroup) {
      throw new AppError({
        message: 'Mock group not found',
        statusCode: 404,
        errorCode: 'MOCK_GROUP_NOT_FOUND'
      });
    }

    const deleted = await MockGroup.delete(id);

    if (!deleted) {
      throw new AppError({
        message: 'Failed to delete mock group',
        statusCode: 500,
        errorCode: 'DELETE_FAILED'
      });
    }

    res.json({
      success: true,
      message: 'Mock group deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getGroupState = async (req, res, next) => {
  try {
    const { id } = req.params;

    const mockGroup = await MockGroup.findById(id);
    if (!mockGroup) {
      throw new AppError({
        message: 'Mock group not found',
        statusCode: 404,
        errorCode: 'MOCK_GROUP_NOT_FOUND'
      });
    }

    const state = await MockGroup.getGroupState(id);

    res.json({
      success: true,
      data: {
        state
      }
    });
  } catch (error) {
    next(error);
  }
};

const toggleGroupState = async (req, res, next) => {
  try {
    const { id } = req.params;

    const mockGroup = await MockGroup.findById(id);
    if (!mockGroup) {
      throw new AppError({
        message: 'Mock group not found',
        statusCode: 404,
        errorCode: 'MOCK_GROUP_NOT_FOUND'
      });
    }

    const newState = await MockGroup.toggleGroupState(id);

    res.json({
      success: true,
      data: {
        state: newState
      },
      message: `Group state changed to ${newState}`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMockGroups,
  getMockGroupById,
  createMockGroup,
  updateMockGroup,
  deleteMockGroup,
  getGroupState,
  toggleGroupState
};
