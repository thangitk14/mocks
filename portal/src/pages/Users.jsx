import { useState, useEffect } from 'react'
import { userService } from '../services/userService'
import { useError } from '../contexts/ErrorContext'
import { useConfirm } from '../contexts/ConfirmContext'

function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    state: 'Active',
  })
  const { showError } = useError()
  const { showConfirm } = useConfirm()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await userService.getAll()
      // API returns { success: true, data: { users: [...] } }
      const usersData = response.data?.users || response.data || []
      setUsers(Array.isArray(usersData) ? usersData : [])
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to load users list')
      setUsers([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingUser) {
        // Update user - don't send password if empty
        const updateData = { ...formData }
        if (!updateData.password) {
          delete updateData.password
        }
        await userService.update(editingUser.id, updateData)
      } else {
        // Create user - password is required
        if (!formData.password) {
          showError('Password is required when creating a new user')
          return
        }
        await userService.create(formData)
      }
      setShowForm(false)
      setEditingUser(null)
      setFormData({ name: '', username: '', password: '', state: 'Active' })
      fetchUsers()
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to save user')
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      name: user.name || '',
      username: user.username || '',
      password: '', // Don't pre-fill password
      state: user.state || 'Active',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    const confirmed = await showConfirm(
      'Are you sure you want to deactivate this user? (Soft delete - only changes state)'
    )
    if (!confirmed) return

    try {
      await userService.delete(id)
      fetchUsers()
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to delete user')
    }
  }

  const getStateBadgeColor = (state) => {
    switch (state) {
      case 'Active':
        return 'bg-green-100 text-green-800'
      case 'InActive':
        return 'bg-red-100 text-red-800'
      case 'Expired':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">User Management</h2>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingUser(null)
            setFormData({ name: '', username: '', password: '', state: 'Active' })
          }}
          className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm md:text-base"
        >
          Add User
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-gray-800 dark:text-white">
            {editingUser ? 'Edit User' : 'Add New User'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full px-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                disabled={!!editingUser}
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Password {editingUser && '(Leave blank if not changing)'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required={!editingUser}
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">State</label>
              <select
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                className="w-full px-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="Active">Active</option>
                <option value="InActive">InActive</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm md:text-base"
              >
                {editingUser ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingUser(null)
                }}
                className="w-full sm:w-auto px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition text-sm md:text-base"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                ID
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Name
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Username
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                State
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase hidden md:table-cell">
                Created Date
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{user.id}</td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{user.name}</td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{user.username}</td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.state === 'Active'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : user.state === 'InActive'
                        ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                    }`}
                  >
                    {user.state}
                  </span>
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden md:table-cell text-gray-900 dark:text-white">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-US')
                    : 'N/A'}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm md:text-base"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm md:text-base"
                      >
                        Delete
                      </button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No users found
          </div>
        )}
      </div>
    </div>
  )
}

export default Users
