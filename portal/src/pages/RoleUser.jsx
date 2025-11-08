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
      showError(error.response?.data?.message || 'Không thể tải danh sách roles')
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
      showError(error.response?.data?.message || 'Không thể tải roles của user')
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
      showError(error.response?.data?.message || 'Không thể gán role')
    }
  }

  const handleRemoveRole = async (userId, roleId) => {
    const confirmed = await showConfirm(
      'Bạn có chắc chắn muốn xóa role này khỏi user?'
    )
    if (!confirmed) return

    try {
      await roleUserService.removeRole(userId, roleId)
      fetchUserRoles(userId)
    } catch (error) {
      showError(error.response?.data?.message || 'Không thể xóa role')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Quản lý Role-User</h2>
        <button
          onClick={() => setShowAssignForm(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Gán Role cho User
        </button>
      </div>

      {showAssignForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-xl font-bold mb-4">Gán Role cho User</h3>
          <form onSubmit={handleAssignRole} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">User ID</label>
              <input
                type="number"
                value={assignData.userId}
                onChange={(e) =>
                  setAssignData({ ...assignData, userId: e.target.value })
                }
                className="w-full px-4 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Role</label>
              <select
                value={assignData.roleId}
                onChange={(e) =>
                  setAssignData({ ...assignData, roleId: e.target.value })
                }
                className="w-full px-4 py-2 border rounded"
                required
              >
                <option value="">Chọn role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} ({role.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
              >
                Gán Role
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAssignForm(false)
                  setAssignData({ userId: '', roleId: '' })
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-bold mb-4">Xem Roles của User</h3>
        <div className="flex gap-4">
          <input
            type="number"
            placeholder="Nhập User ID"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="px-4 py-2 border rounded flex-1"
          />
          <button
            onClick={() => selectedUserId && fetchUserRoles(selectedUserId)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Tìm kiếm
          </button>
        </div>
      </div>

      {selectedUserId && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Path
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {userRoles.map((role) => (
                    <tr key={role.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{role.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {role.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {role.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {role.path}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            handleRemoveRole(selectedUserId, role.id)
                          }
                          className="text-red-600 hover:text-red-800"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {userRoles.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  User này chưa có role nào
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

