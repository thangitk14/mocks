import api from './api'

export const authService = {
  register: async (data) => {
    const response = await api.post('/api/auth/register', data)
    return response.data
  },

  login: async (username, password) => {
    const response = await api.post('/api/auth/login', { username, password })
    return response.data
  },

  getProfile: async () => {
    const response = await api.get('/api/auth/profile')
    return response.data
  },
}

