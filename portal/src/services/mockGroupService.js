import api from './api'

export const mockGroupService = {
  getAll: async () => {
    const response = await api.get('/api/mock-groups')
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/api/mock-groups/${id}`)
    return response.data
  },

  create: async (data) => {
    const response = await api.post('/api/mock-groups', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await api.put(`/api/mock-groups/${id}`, data)
    return response.data
  },

  delete: async (id) => {
    const response = await api.delete(`/api/mock-groups/${id}`)
    return response.data
  },

  getGroupState: async (id) => {
    const response = await api.get(`/api/mock-groups/${id}/state`)
    return response.data
  },

  toggleGroupState: async (id) => {
    const response = await api.post(`/api/mock-groups/${id}/toggle-state`)
    return response.data
  }
}
