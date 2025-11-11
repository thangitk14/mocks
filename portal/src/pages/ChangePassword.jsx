import { useState } from 'react'
import { authService } from '../services/authService'
import { useError } from '../contexts/ErrorContext'

function ChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const { showError } = useError()

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      showError('All fields are required')
      return
    }

    if (formData.newPassword.length < 6) {
      showError('New password must be at least 6 characters')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showError('New password and confirm password do not match')
      return
    }

    if (formData.currentPassword === formData.newPassword) {
      showError('New password must be different from current password')
      return
    }

    try {
      setLoading(true)
      await authService.changePassword(formData.currentPassword, formData.newPassword)
      // Reset form on success
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      // Show success message (you might want to add a success context)
      alert('Password changed successfully!')
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-800 dark:text-white">Change Password</h2>
      
      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Current Password</label>
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) =>
                setFormData({ ...formData, currentPassword: e.target.value })
              }
              className="w-full px-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">New Password</label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) =>
                setFormData({ ...formData, newPassword: e.target.value })
              }
              className="w-full px-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Password must be at least 6 characters
            </p>
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              className="w-full px-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
              minLength={6}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangePassword

