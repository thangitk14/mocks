import api from './api'

export const apiLogService = {
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString()
    const response = await api.get(`/api/logs${queryParams ? `?${queryParams}` : ''}`)
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/api/logs/${id}`)
    return response.data
  },

  getByDomainId: async (domainId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString()
    const response = await api.get(`/api/logs/domain/${domainId}${queryParams ? `?${queryParams}` : ''}`)
    return response.data
  },

  deleteAllByDomainId: async (domainId) => {
    const response = await api.delete(`/api/logs/domain/${domainId}`)
    return response.data
  },
}

