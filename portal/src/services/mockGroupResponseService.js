import api from './api'

export const mockGroupResponseService = {
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString()
    const response = await api.get(`/api/mock-group-responses${queryParams ? `?${queryParams}` : ''}`)
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/api/mock-group-responses/${id}`)
    return response.data
  },

  create: async (data) => {
    const response = await api.post('/api/mock-group-responses', data)
    return response.data
  },

  delete: async (id) => {
    const response = await api.delete(`/api/mock-group-responses/${id}`)
    return response.data
  },

  deleteByGroupAndMockResponse: async (groupId, mockResponseId) => {
    const response = await api.post('/api/mock-group-responses/delete-by-relation', {
      group_id: groupId,
      mock_response_id: mockResponseId
    })
    return response.data
  }
}
