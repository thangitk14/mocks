import api from './api'

export const roleUserService = {
  getUserRoles: async (userId) => {
    const response = await api.get(`/api/role-user/users/${userId}/roles`)
    return response.data
  },

  assignRole: async (userId, roleId) => {
    const response = await api.post('/api/role-user/assign', { userId, roleId })
    return response.data
  },

  assignMultipleRoles: async (userId, roleIds) => {
    const response = await api.post('/api/role-user/assign-multiple', {
      userId,
      roleIds,
    })
    return response.data
  },

  removeRole: async (userId, roleId) => {
    const response = await api.delete(
      `/api/role-user/users/${userId}/roles/${roleId}`
    )
    return response.data
  },
}

