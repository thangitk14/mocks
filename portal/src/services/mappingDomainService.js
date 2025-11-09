import api from './api'

export const mappingDomainService = {
  getAll: async () => {
    const response = await api.get('/api/config/mappingDomain')
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/api/config/mappingDomain/${id}`)
    return response.data
  },

  create: async (data) => {
    const response = await api.post('/api/config/mappingDomain', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await api.put(`/api/config/mappingDomain/${id}`, data)
    return response.data
  },

  delete: async (id) => {
    const response = await api.delete(`/api/config/mappingDomain/${id}`)
    return response.data
  },

  export: async (id) => {
    const response = await api.get(`/api/config/mappingDomain/${id}/export`)
    return response.data
  },

  import: async (importData, options = {}) => {
    const response = await api.post('/api/config/mappingDomain/import', {
      importData,
      newPath: options.newPath,
      overwrite: options.overwrite || false
    })
    return response.data
  },
}

