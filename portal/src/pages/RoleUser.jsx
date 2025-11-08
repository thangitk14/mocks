import { useState, useEffect } from 'react'
import { roleUserService } from '../services/roleUserService'
import { roleService } from '../services/roleService'
import { useError } from '../contexts/ErrorContext'
import { useConfirm } from '../contexts/ConfirmContext'

function RoleUser() {
  const [userRoles, setUserRoles] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [assignData, setAssignData] = useState({ userId: '', roleId: '' })
  const { showError } = useError()
  const { showConfirm } = useConfirm()

  useEffect(() => {
    fetchRoles()
  }, [])

  useEffect(() => {
    if (selectedUserId) {
      fetchUserRoles(selectedUserId)
    }
  }, [selectedUserId])

  const fetchRoles = async () => {
    try {
      const response = await roleService.getAll()
      // API returns { success: true, data: { roles: [...] } }
      const rolesData = response.data?.roles || response.data || []
      setRoles(Array.isArray(rolesData) ? rolesData : [])
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to load roles list')
      setRoles([]) // Set empty array on error
    }
  }

  const fetchUserRoles = async (userId) => {
    try {
      setLoading(true)
      const response = await roleUserService.getUserRoles(userId)
      // API returns { success: true, data: { userId, roles: [...] } }
      const rolesData = response.data?.roles || response.data || []
      setUserRoles(Array.isArray(rolesData) ? rolesData : [])
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to load user roles')
      setUserRoles([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleAssignRole = async (e) => {
    e.preventDefault()
    try {
      await roleUserService.assignRole(
        parseInt(assignData.userId),
        parseInt(assignData.roleId)
      )
      setShowAssignForm(false)
      setAssignData({ userId: '', roleId: '' })
      if (selectedUserId) {
        fetchUserRoles(selectedUserId)
      }
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to assign role')
    }
  }

  const handleRemoveRole = async (userId, roleId) => {
    const confirmed = await showConfirm(
      'Are you sure you want to remove this role from the user?'
    )
    if (!confirmed) return

    try {
      await roleUserService.removeRole(userId, roleId)
      fetchUserRoles(userId)
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to remove role')
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Role-User Management</h2>
        <button
          onClick={() => setShowAssignForm(true)}
          className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm md:text-base"
        >
          Assign Role to User
        </button>
      </div>

      {showAssignForm && (
        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-gray-800 dark:text-white">Assign Role to User</h3>
          <form onSubmit={handleAssignRole} className="space-y-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">User ID</label>
              <input
                type="number"
                value={assignData.userId}
                onChange={(e) =>
                  setAssignData({ ...assignData, userId: e.target.value })
                }
                className="w-full px-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Role</label>
              <select
                value={assignData.roleId}
                onChange={(e) =>
                  setAssignData({ ...assignData, roleId: e.target.value })
                }
                className="w-full px-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} ({role.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm md:text-base"
              >
                Assign Role
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAssignForm(false)
                  setAssignData({ userId: '', roleId: '' })
                }}
                className="w-full sm:w-auto px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition text-sm md:text-base"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow mb-6">
        <h3 className="text-base md:text-lg font-bold mb-4 text-gray-800 dark:text-white">View User Roles</h3>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <input
            type="number"
            placeholder="Enter User ID"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="px-4 py-2 border dark:border-gray-600 rounded flex-1 text-sm md:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            onClick={() => selectedUserId && fetchUserRoles(selectedUserId)}
            className="w-full sm:w-auto px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition text-sm md:text-base"
          >
            Search
          </button>
        </div>
      </div>

      {selectedUserId && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-8 text-gray-800 dark:text-white">Loading...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Role ID
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Code
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Name
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase hidden md:table-cell">
                      Path
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {userRoles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{role.id}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
                        {role.code}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
                        {role.name}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden md:table-cell text-gray-900 dark:text-white">
                        {role.path}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            handleRemoveRole(selectedUserId, role.id)
                          }
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm md:text-base"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {userRoles.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  This user has no roles
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default RoleUser

