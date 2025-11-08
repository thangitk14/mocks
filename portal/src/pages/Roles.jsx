import { useState, useEffect } from 'react'
import { roleService } from '../services/roleService'
import { useError } from '../contexts/ErrorContext'

function Roles() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [formData, setFormData] = useState({ code: '', name: '', path: '' })
  const { showError } = useError()

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const response = await roleService.getAll()
      // API returns { success: true, data: { roles: [...] } }
      const rolesData = response.data?.roles || response.data || []
      setRoles(Array.isArray(rolesData) ? rolesData : [])
    } catch (error) {
      showError(error.response?.data?.message || 'Không thể tải danh sách roles')
      setRoles([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingRole) {
        await roleService.update(editingRole.id, formData)
      } else {
        await roleService.create(formData)
      }
      setShowForm(false)
      setEditingRole(null)
      setFormData({ code: '', name: '', path: '' })
      fetchRoles()
    } catch (error) {
      showError(error.response?.data?.message || 'Không thể lưu role')
    }
  }

  const handleEdit = (role) => {
    setEditingRole(role)
    setFormData({ code: role.code, name: role.name, path: role.path })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa role này?')) return

    try {
      await roleService.delete(id)
      fetchRoles()
    } catch (error) {
      showError(error.response?.data?.message || 'Không thể xóa role')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Đang tải...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Quản lý Roles</h2>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingRole(null)
            setFormData({ code: '', name: '', path: '' })
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Thêm Role
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-xl font-bold mb-4">
            {editingRole ? 'Chỉnh sửa Role' : 'Thêm Role mới'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                className="w-full px-4 py-2 border rounded"
                required
                disabled={!!editingRole}
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Path</label>
              <input
                type="text"
                value={formData.path}
                onChange={(e) =>
                  setFormData({ ...formData, path: e.target.value })
                }
                className="w-full px-4 py-2 border rounded"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
              >
                {editingRole ? 'Cập nhật' : 'Tạo mới'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingRole(null)
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
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
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="px-6 py-4 whitespace-nowrap">{role.id}</td>
                <td className="px-6 py-4 whitespace-nowrap">{role.code}</td>
                <td className="px-6 py-4 whitespace-nowrap">{role.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{role.path}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleEdit(role)}
                    className="text-blue-600 hover:text-blue-800 mr-4"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {roles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Không có role nào
          </div>
        )}
      </div>
    </div>
  )
}

export default Roles

