const MockResponse = require('../models/MockResponse');
const AppError = require('../utils/AppError');

const getMockResponses = async (req, res, next) => {
  try {
    const { domain_id } = req.query;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    let mockResponses;
    if (domain_id) {
      mockResponses = await MockResponse.findByDomainId(domain_id);
    } else {
      mockResponses = await MockResponse.findAll(limit, offset);
    }

    res.json({
      success: true,
      data: {
        mockResponses
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMockResponseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mockResponse = await MockResponse.findById(id);

    if (!mockResponse) {
      throw new AppError({
        message: 'Mock response not found',
        statusCode: 404,
        errorCode: 'MOCK_RESPONSE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        mockResponse
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMockResponseByPath = async (req, res, next) => {
  try {
    const { domainId, path, method } = req.query;

    if (!domainId || !path || !method) {
      throw new AppError({
        message: 'domainId, path, and method are required',
        statusCode: 400,
        errorCode: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const mockResponse = await MockResponse.findByPath(domainId, path, method);

    res.json({
      success: true,
      data: {
        mockResponse: mockResponse || null
      }
    });
  } catch (error) {
    next(error);
  }
};

const createMockResponse = async (req, res, next) => {
  try {
    const { domain_id, name, path, method, status_code, delay, headers, body, state } = req.body;

    if (!domain_id || !path || !method || !status_code) {
      throw new AppError({
        message: 'domain_id, path, method, and status_code are required',
        statusCode: 400,
        errorCode: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Check if mock response already exists for this domain, path, and method
    // Only update if existing mock is still Active (not Disable)
    // This allows creating new mocks even when old ones are Disabled
    const existing = await MockResponse.findByDomainAndPath(domain_id, path, method);
    if (existing && existing.state === 'Active') {
      // Update existing Active mock instead of creating new
      const updated = await MockResponse.update(existing.id, {
        name: name || '', // Default to empty string if not provided
        status_code,
        delay: delay || 0,
        headers: headers || {},
        body: body || null,
        state: state || 'Active'
      });

      if (updated) {
        const mockResponse = await MockResponse.findById(existing.id);
        return res.json({
          success: true,
          data: {
            mockResponse
          }
        });
      }
    }
    // If no Active mock exists (or existing is Disabled), create new one

    const mockResponseId = await MockResponse.create({
      domain_id,
      name: name || '', // Default to empty string if not provided
      path,
      method,
      status_code,
      delay: delay || 0,
      headers: headers || {},
      body: body || null,
      state: state || 'Active'
    });

    const mockResponse = await MockResponse.findById(mockResponseId);

    res.status(201).json({
      success: true,
      data: {
        mockResponse
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateMockResponse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, status_code, delay, headers, body, state } = req.body;

    const mockResponse = await MockResponse.findById(id);
    if (!mockResponse) {
      throw new AppError({
        message: 'Mock response not found',
        statusCode: 404,
        errorCode: 'MOCK_RESPONSE_NOT_FOUND'
      });
    }

    const updated = await MockResponse.update(id, {
      name,
      status_code,
      delay,
      headers,
      body,
      state
    });

    if (!updated) {
      throw new AppError({
        message: 'Failed to update mock response',
        statusCode: 500,
        errorCode: 'UPDATE_FAILED'
      });
    }

    const updatedMockResponse = await MockResponse.findById(id);

    res.json({
      success: true,
      data: {
        mockResponse: updatedMockResponse
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteMockResponse = async (req, res, next) => {
  try {
    const { id } = req.params;

    const mockResponse = await MockResponse.findById(id);
    if (!mockResponse) {
      throw new AppError({
        message: 'Mock response not found',
        statusCode: 404,
        errorCode: 'MOCK_RESPONSE_NOT_FOUND'
      });
    }

    const deleted = await MockResponse.delete(id);

    if (!deleted) {
      throw new AppError({
        message: 'Failed to delete mock response',
        statusCode: 500,
        errorCode: 'DELETE_FAILED'
      });
    }

    res.json({
      success: true,
      message: 'Mock response deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const disableByPathAndMethod = async (req, res, next) => {
  try {
    const { domainId, path, method } = req.body;

    if (!domainId || !path || !method) {
      throw new AppError({
        message: 'domainId, path, and method are required',
        statusCode: 400,
        errorCode: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const affectedRows = await MockResponse.disableByPathAndMethod(domainId, path, method);

    res.json({
      success: true,
      data: {
        affectedRows
      },
      message: `Disabled ${affectedRows} mock response(s)`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMockResponses,
  getMockResponseById,
  getMockResponseByPath,
  createMockResponse,
  updateMockResponse,
  deleteMockResponse,
  disableByPathAndMethod
};

