import { useState, useEffect } from 'react'
import api from '../services/api'
import { useError } from '../contexts/ErrorContext'

function Functions() {
  const { showError } = useError()
  const [loading, setLoading] = useState(false)

  // Define all API endpoints grouped by route
  const apiGroups = [
    {
      name: 'api/auth',
      basePath: '/api/auth',
      endpoints: [
        { method: 'POST', path: '/api/auth/register', description: 'Register a new user account' },
        { method: 'POST', path: '/api/auth/login', description: 'Login with username and password' },
        { method: 'GET', path: '/api/auth/profile', description: 'Get authenticated user profile' },
      ]
    },
    {
      name: 'api/users',
      basePath: '/api/users',
      endpoints: [
        { method: 'GET', path: '/api/users', description: 'Get all users' },
        { method: 'GET', path: '/api/users/:id', description: 'Get user by ID' },
        { method: 'POST', path: '/api/users', description: 'Create a new user' },
        { method: 'PUT', path: '/api/users/:id', description: 'Update user' },
        { method: 'DELETE', path: '/api/users/:id', description: 'Delete user (soft delete)' },
      ]
    },
    {
      name: 'api/roles',
      basePath: '/api/roles',
      endpoints: [
        { method: 'GET', path: '/api/roles', description: 'Get all roles' },
        { method: 'GET', path: '/api/roles/:id', description: 'Get role by ID' },
        { method: 'POST', path: '/api/roles', description: 'Create a new role' },
        { method: 'PUT', path: '/api/roles/:id', description: 'Update role' },
        { method: 'DELETE', path: '/api/roles/:id', description: 'Delete role' },
      ]
    },
    {
      name: 'api/role-user',
      basePath: '/api/role-user',
      endpoints: [
        { method: 'GET', path: '/api/role-user/users/:userId/roles', description: 'Get all roles for a user' },
        { method: 'POST', path: '/api/role-user/assign', description: 'Assign a single role to a user' },
        { method: 'POST', path: '/api/role-user/assign-multiple', description: 'Assign multiple roles to a user' },
        { method: 'DELETE', path: '/api/role-user/users/:userId/roles/:roleId', description: 'Remove a role from a user' },
      ]
    },
    {
      name: 'api/config/mappingDomain',
      basePath: '/api/config/mappingDomain',
      endpoints: [
        { method: 'GET', path: '/api/config/mappingDomain', description: 'Get all mapping domains (public)' },
        { method: 'GET', path: '/api/config/mappingDomain/:id', description: 'Get mapping domain by ID (public)' },
        { method: 'POST', path: '/api/config/mappingDomain', description: 'Create mapping domain' },
        { method: 'PUT', path: '/api/config/mappingDomain/:id', description: 'Update mapping domain' },
        { method: 'DELETE', path: '/api/config/mappingDomain/:id', description: 'Delete mapping domain' },
        { method: 'GET', path: '/api/config/mappingDomain/:id/export', description: 'Export mapping domain with mocks' },
        { method: 'POST', path: '/api/config/mappingDomain/import', description: 'Import mapping domain with mocks' },
      ]
    },
    {
      name: 'api/logs',
      basePath: '/api/logs',
      endpoints: [
        { method: 'POST', path: '/api/logs', description: 'Create API log (public)' },
        { method: 'GET', path: '/api/logs', description: 'Get all API logs' },
        { method: 'GET', path: '/api/logs/:id', description: 'Get API log by ID' },
        { method: 'GET', path: '/api/logs/domain/:domainId', description: 'Get API logs by domain ID' },
      ]
    },
    {
      name: 'api/mock-responses',
      basePath: '/api/mock-responses',
      endpoints: [
        { method: 'GET', path: '/api/mock-responses/path', description: 'Get mock response by path (public)' },
        { method: 'GET', path: '/api/mock-responses', description: 'Get all mock responses' },
        { method: 'GET', path: '/api/mock-responses/:id', description: 'Get mock response by ID' },
        { method: 'POST', path: '/api/mock-responses', description: 'Create mock response' },
        { method: 'PUT', path: '/api/mock-responses/:id', description: 'Update mock response' },
        { method: 'DELETE', path: '/api/mock-responses/:id', description: 'Delete mock response' },
        { method: 'POST', path: '/api/mock-responses/disable', description: 'Disable mock responses by path and method' },
      ]
    },
    {
      name: 'Health',
      basePath: '/health',
      endpoints: [
        { method: 'GET', path: '/health', description: 'Health check endpoint' },
      ]
    },
  ]

  const getMethodColor = (method) => {
    switch (method) {
      case 'GET':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'POST':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'PUT':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  const handleDownloadPostman = async () => {
    try {
      setLoading(true)
      // Try to fetch from service
      const response = await api.get('/api/functions/postman', {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'postman-collection.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      // If API endpoint doesn't exist, try to fetch from public folder
      try {
        const response = await fetch('/postman.json')
        if (!response.ok) throw new Error('File not found')
        
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'postman-collection.json'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch (fetchError) {
        showError('Failed to download Postman collection. Please check if the file exists.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Functions</h2>
        <button
          onClick={handleDownloadPostman}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Downloading...' : 'Download Postman Collection'}
        </button>
      </div>

      <div className="space-y-6">
        {apiGroups.map((group) => (
          <div
            key={group.name}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6"
          >
            <h3 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-white mb-4">
              {group.name}
            </h3>
            <div className="space-y-2">
              {group.endpoints.map((endpoint, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                >
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium w-fit ${getMethodColor(endpoint.method)}`}
                  >
                    {endpoint.method}
                  </span>
                  <code className="text-sm md:text-base text-gray-900 dark:text-gray-100 font-mono flex-1">
                    {endpoint.path}
                  </code>
                  {endpoint.description && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {endpoint.description}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Functions

