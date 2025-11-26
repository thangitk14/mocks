import api from './api'

export const mockResponseService = {
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString()
    const response = await api.get(`/api/mock-responses${queryParams ? `?${queryParams}` : ''}`)
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/api/mock-responses/${id}`)
    return response.data
  },

  getByPath: async (domainId, path, method, includeAllStates = false) => {
    const queryParams = new URLSearchParams({ 
      domainId, 
      path, 
      method,
      ...(includeAllStates && { includeAllStates: 'true' })
    }).toString()
    const response = await api.get(`/api/mock-responses/path?${queryParams}`)
    return response.data
  },

  create: async (data) => {
    const response = await api.post('/api/mock-responses', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await api.put(`/api/mock-responses/${id}`, data)
    return response.data
  },

  delete: async (id) => {
    const response = await api.delete(`/api/mock-responses/${id}`)
    return response.data
  },

  disableByPathAndMethod: async (domainId, path, method) => {
    const response = await api.post('/api/mock-responses/disable', {
      domainId,
      path,
      method
    })
    return response.data
  },

  getByPaths: async (domainId, paths, includeAllStates = false) => {
    const queryParams = new URLSearchParams({ 
      domainId,
      ...(includeAllStates && { includeAllStates: 'true' })
    }).toString()
    const response = await api.post(`/api/mock-responses/batch?${queryParams}`, {
      paths
    })
    return response.data
  }
}

