const ApiLog = require('../models/ApiLog');
const AppError = require('../utils/AppError');

const getApiLogs = async (req, res, next) => {
  try {
    const { domain_id } = req.query;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    let logs;
    if (domain_id) {
      logs = await ApiLog.findByDomainId(domain_id, limit, offset);
    } else {
      logs = await ApiLog.findAll(limit, offset);
    }

    res.json({
      success: true,
      data: {
        logs
      }
    });
  } catch (error) {
    next(error);
  }
};

const getApiLogById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const log = await ApiLog.findById(id);

    if (!log) {
      throw new AppError({
        message: 'API log not found',
        statusCode: 404,
        errorCode: 'API_LOG_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        log
      }
    });
  } catch (error) {
    next(error);
  }
};

const getApiLogsByDomain = async (req, res, next) => {
  try {
    const { domainId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const logs = await ApiLog.findByDomainId(domainId, limit, offset);
    const total = await ApiLog.countByDomainId(domainId);

    res.json({
      success: true,
      data: {
        logs,
        total,
        limit,
        offset
      }
    });
  } catch (error) {
    next(error);
  }
};

const createApiLog = async (req, res, next) => {
  console.log('createApiLog');
  try {
    const { domain_id, headers, body, query, method, status, toCUrl, responseHeaders, responseBody } = req.body;

    if (!domain_id || !method) {
      throw new AppError({
        message: 'domain_id and method are required',
        statusCode: 400,
        errorCode: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const logId = await ApiLog.create({
      domain_id,
      headers: headers || {},
      body: body || {},
      query: query || {},
      method,
      status: status || null,
      toCUrl: toCUrl || '',
      responseHeaders: responseHeaders || {},
      responseBody: responseBody || null
    });

    res.status(201).json({
      success: true,
      data: {
        logId
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getApiLogs,
  getApiLogById,
  getApiLogsByDomain,
  createApiLog
};

