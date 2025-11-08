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

module.exports = {
  getAllMappingDomains,
  getMappingDomainById,
  createMappingDomain,
  updateMappingDomain,
  deleteMappingDomain
};

