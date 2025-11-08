import api from './api'

export const roleService = {
  getAll: async () => {
    const response = await api.get('/api/roles')
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/api/roles/${id}`)
    return response.data
  },

  create: async (data) => {
    const response = await api.post('/api/roles', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await api.put(`/api/roles/${id}`, data)
    return response.data
  },

  delete: async (id) => {
    const response = await api.delete(`/api/roles/${id}`)
    return response.data
  },
}

