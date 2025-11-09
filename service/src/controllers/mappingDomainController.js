const MappingDomain = require('../models/MappingDomain');
const AppError = require('../utils/AppError');

const getAllMappingDomains = async (req, res, next) => {
  try {
    const domains = await MappingDomain.findAll();

    res.json({
      success: true,
      data: {
        mappingDomains: domains
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMappingDomainById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const domain = await MappingDomain.findById(id);

    if (!domain) {
      throw new AppError({
        message: 'Mapping domain not found',
        statusCode: 404,
        errorCode: 'MAPPING_DOMAIN_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        mappingDomain: domain
      }
    });
  } catch (error) {
    next(error);
  }
};

const createMappingDomain = async (req, res, next) => {
  try {
    const { project_name, path, forward_domain, state, forward_state } = req.body;
    const created_by = req.user?.id || null;

    if (!project_name || !path || !forward_domain) {
      throw new AppError({
        message: 'project_name, path, and forward_domain are required',
        statusCode: 400,
        errorCode: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Check if path already exists
    const existingDomain = await MappingDomain.findByPath(path);
    if (existingDomain) {
      throw new AppError({
        message: 'Path already exists',
        statusCode: 400,
        errorCode: 'PATH_ALREADY_EXISTS'
      });
    }

    const domainId = await MappingDomain.create({
      project_name,
      path,
      forward_domain,
      created_by,
      state: state || 'Active',
      forward_state: forward_state || 'NoneApi'
    });

    const domain = await MappingDomain.findById(domainId);

    res.status(201).json({
      success: true,
      data: {
        mappingDomain: domain
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateMappingDomain = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { project_name, path, forward_domain, state, forward_state } = req.body;
    const updated_by = req.user?.id || null;

    const existingDomain = await MappingDomain.findById(id);
    if (!existingDomain) {
      throw new AppError({
        message: 'Mapping domain not found',
        statusCode: 404,
        errorCode: 'MAPPING_DOMAIN_NOT_FOUND'
      });
    }

    // Check if path is being changed and if new path already exists
    if (path && path !== existingDomain.path) {
      const domainWithPath = await MappingDomain.findByPath(path);
      if (domainWithPath) {
        throw new AppError({
          message: 'Path already exists',
          statusCode: 400,
          errorCode: 'PATH_ALREADY_EXISTS'
        });
      }
    }

    const updateData = {};
    if (project_name !== undefined) updateData.project_name = project_name;
    if (path !== undefined) updateData.path = path;
    if (forward_domain !== undefined) updateData.forward_domain = forward_domain;
    if (state !== undefined) updateData.state = state;
    if (forward_state !== undefined) updateData.forward_state = forward_state;
    updateData.updated_by = updated_by;

    await MappingDomain.update(id, updateData);

    const domain = await MappingDomain.findById(id);

    res.json({
      success: true,
      data: {
        mappingDomain: domain
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteMappingDomain = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingDomain = await MappingDomain.findById(id);
    if (!existingDomain) {
      throw new AppError({
        message: 'Mapping domain not found',
        statusCode: 404,
        errorCode: 'MAPPING_DOMAIN_NOT_FOUND'
      });
    }

    await MappingDomain.delete(id);

    res.json({
      success: true,
      data: {
        message: 'Mapping domain deleted successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

const exportMappingDomain = async (req, res, next) => {
  try {
    const { id } = req.params;
    const MappingDomain = require('../models/MappingDomain');
    const MockResponse = require('../models/MockResponse');

    const domain = await MappingDomain.findById(id);
    if (!domain) {
      throw new AppError({
        message: 'Mapping domain not found',
        statusCode: 404,
        errorCode: 'MAPPING_DOMAIN_NOT_FOUND'
      });
    }

    // Get all mock responses for this domain
    const mockResponses = await MockResponse.findByDomainId(id);

    // Prepare export data
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      mappingDomain: {
        project_name: domain.project_name,
        path: domain.path,
        forward_domain: domain.forward_domain,
        state: domain.state,
        forward_state: domain.forward_state
      },
      mockResponses: mockResponses.map(mock => ({
        name: mock.name || '',
        path: mock.path,
        method: mock.method,
        status_code: mock.status_code,
        delay: mock.delay || 0,
        headers: mock.headers || {},
        body: mock.body || null,
        state: mock.state
      }))
    };

    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    next(error);
  }
};

const importMappingDomain = async (req, res, next) => {
  try {
    const { importData, newPath, overwrite } = req.body;
    const MappingDomain = require('../models/MappingDomain');
    const MockResponse = require('../models/MockResponse');
    const created_by = req.user?.id || null;

    if (!importData || !importData.mappingDomain) {
      throw new AppError({
        message: 'Invalid import data',
        statusCode: 400,
        errorCode: 'INVALID_IMPORT_DATA'
      });
    }

    const { mappingDomain: domainData, mockResponses = [] } = importData;

    // Determine the path to use
    let targetPath = domainData.path;
    if (newPath) {
      targetPath = newPath;
    }

    // Check if path already exists
    const existingDomain = await MappingDomain.findByPath(targetPath);
    let domainId;

    if (existingDomain) {
      if (overwrite) {
        // Update existing domain
        await MappingDomain.update(existingDomain.id, {
          project_name: domainData.project_name,
          forward_domain: domainData.forward_domain,
          state: domainData.state,
          forward_state: domainData.forward_state,
          updated_by: created_by
        });
        domainId = existingDomain.id;

        // Delete existing mock responses if overwriting
        const existingMocks = await MockResponse.findByDomainId(domainId);
        for (const mock of existingMocks) {
          await MockResponse.delete(mock.id);
        }
      } else {
        throw new AppError({
          message: 'Path already exists. Use overwrite=true or provide newPath',
          statusCode: 400,
          errorCode: 'PATH_ALREADY_EXISTS'
        });
      }
    } else {
      // Create new domain
      domainId = await MappingDomain.create({
        project_name: domainData.project_name,
        path: targetPath,
        forward_domain: domainData.forward_domain,
        created_by,
        state: domainData.state || 'Active',
        forward_state: domainData.forward_state || 'NoneApi'
      });
    }

    // Import mock responses
    const importedMocks = [];
    for (const mockData of mockResponses) {
      const mockId = await MockResponse.create({
        domain_id: domainId,
        name: mockData.name || '',
        path: mockData.path,
        method: mockData.method,
        status_code: mockData.status_code,
        delay: mockData.delay || 0,
        headers: mockData.headers || {},
        body: mockData.body || null,
        state: mockData.state || 'Active'
      });
      importedMocks.push(mockId);
    }

    const domain = await MappingDomain.findById(domainId);

    res.json({
      success: true,
      data: {
        mappingDomain: domain,
        importedMocksCount: importedMocks.length
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllMappingDomains,
  getMappingDomainById,
  createMappingDomain,
  updateMappingDomain,
  deleteMappingDomain,
  exportMappingDomain,
  importMappingDomain
};

