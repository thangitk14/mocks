import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { mockResponseService } from '../services/mockResponseService'
import { mappingDomainService } from '../services/mappingDomainService'
import { useError } from '../contexts/ErrorContext'

function MockResponses() {
  const { domainId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [mockResponses, setMockResponses] = useState([])
  const [domain, setDomain] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedMock, setSelectedMock] = useState(null) // For edit
  const [showForm, setShowForm] = useState(false) // For add/edit form
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    method: 'GET',
    statusCode: '200',
    delay: '0',
    headers: '{}',
    body: '',
    state: 'Active'
  })
  const [formLoading, setFormLoading] = useState(false)
  const { showError } = useError()

  const fetchDomain = async () => {
    try {
      const response = await mappingDomainService.getById(domainId)
      setDomain(response.data?.mappingDomain)
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to load domain')
    }
  }

  const fetchMockResponses = async () => {
    try {
      setLoading(true)
      const response = await mockResponseService.getAll({ domain_id: domainId })
      setMockResponses(response.data?.mockResponses || [])
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to load mock responses')
      setMockResponses([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDomain()
    fetchMockResponses()
  }, [domainId])

  const handleBack = () => {
    const from = location.state?.from
    if (from === 'dashboard') {
      navigate('/dashboard')
    } else {
      navigate('/mapping-domain')
    }
  }

  const handleAdd = () => {
    setFormData({
      name: '',
      path: '',
      method: 'GET',
      statusCode: '200',
      delay: '0',
      headers: '{}',
      body: '',
      state: 'Active'
    })
    setSelectedMock(null)
    setShowForm(true)
  }

  const handleEdit = (mock) => {
    setFormData({
      name: mock.name || mock.path, // Use name if exists, otherwise use path
      path: mock.path,
      method: mock.method,
      statusCode: mock.status_code?.toString() || '200',
      delay: mock.delay?.toString() || '0',
      headers: mock.headers ? JSON.stringify(mock.headers, null, 2) : '{}',
      body: mock.body 
        ? (typeof mock.body === 'string' ? mock.body : JSON.stringify(mock.body, null, 2))
        : '',
      state: mock.state || 'Active'
    })
    setSelectedMock(mock)
    setShowForm(true)
  }

  const handleDelete = async (mock) => {
    if (!window.confirm('Are you sure you want to delete this mock response?')) {
      return
    }

    try {
      await mockResponseService.delete(mock.id)
      fetchMockResponses()
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to delete mock response')
    }
  }

  const handleSubmit = async () => {
    try {
      setFormLoading(true)

      // Parse JSON fields
      let headers = {}
      let body = null
      
      try {
        headers = formData.headers ? JSON.parse(formData.headers) : {}
      } catch (e) {
        showError('Invalid JSON format for headers')
        setFormLoading(false)
        return
      }

      try {
        if (formData.body.trim()) {
          body = JSON.parse(formData.body)
        }
      } catch (e) {
        // If body is not JSON, treat as string
        body = formData.body
      }

      if (selectedMock) {
        // Update existing mock
        await mockResponseService.update(selectedMock.id, {
          name: formData.name.trim() || formData.path.trim(), // Default to path if name is empty
          status_code: parseInt(formData.statusCode),
          delay: parseInt(formData.delay) || 0,
          headers,
          body,
          state: formData.state
        })
      } else {
        // Create new mock
        if (!formData.path.trim()) {
          showError('Path is required')
          setFormLoading(false)
          return
        }
        
        await mockResponseService.create({
          domain_id: parseInt(domainId),
          name: formData.name.trim() || formData.path.trim(), // Default to path if name is empty
          path: formData.path.trim(),
          method: formData.method,
          status_code: parseInt(formData.statusCode),
          delay: parseInt(formData.delay) || 0,
          headers,
          body,
          state: formData.state
        })
      }

      setShowForm(false)
      setSelectedMock(null)
      fetchMockResponses()
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to save mock response')
    } finally {
      setFormLoading(false)
    }
  }

  if (loading && !domain) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
          >
            ← Back
          </button>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
            Mock Responses - {domain?.forward_domain || 'Loading...'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/mapping-domain/${domainId}/logs`, { state: location.state })}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Logs
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
          >
            + Add Mock
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
                <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Path</th>
                <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Method</th>
                <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status Code</th>
                <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Delay</th>
                <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">State</th>
                <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {mockResponses.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-2 md:px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                    No mock responses found
                  </td>
                </tr>
              ) : (
                mockResponses.map((mock) => (
                  <tr key={mock.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap text-gray-900 dark:text-white text-sm">{mock.id}</td>
                    <td className="px-2 md:px-3 py-2 text-gray-900 dark:text-white text-sm">
                      <div className="max-w-md truncate" title={mock.name || mock.path}>
                        {mock.name || mock.path}
                      </div>
                    </td>
                    <td className="px-2 md:px-3 py-2 text-gray-900 dark:text-white text-sm">
                      <div className="max-w-md truncate" title={mock.path}>
                        {mock.path}
                      </div>
                    </td>
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                        {mock.method}
                      </span>
                    </td>
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        mock.status_code >= 200 && mock.status_code < 300 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : mock.status_code >= 300 && mock.status_code < 400
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                          : mock.status_code >= 400
                          ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                      }`}>
                        {mock.status_code}
                      </span>
                    </td>
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap text-gray-900 dark:text-white text-sm">
                      {mock.delay ? `${mock.delay}ms` : '0ms'}
                    </td>
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        mock.state === 'Active'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                      }`}>
                        {mock.state}
                      </span>
                    </td>
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap">
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => handleEdit(mock)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs md:text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(mock)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs md:text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Form Dialog */}
      {showForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowForm(false)
            setSelectedMock(null)
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  {selectedMock ? 'Edit Mock Response' : 'Add Mock Response'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setSelectedMock(null)
                  }}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl transition"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="Leave empty to use path as name"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {selectedMock ? 'Name can be edited' : 'If empty, will default to path value'}
                  </p>
                </div>

                {/* Path */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Path <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.path}
                    onChange={(e) => {
                      const newPath = e.target.value
                      setFormData({ 
                        ...formData, 
                        path: newPath,
                        // Auto-update name to path if name is empty (only when creating new)
                        name: !selectedMock && !formData.name ? newPath : formData.name
                      })
                    }}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="/api/users"
                    disabled={!!selectedMock}
                  />
                  {selectedMock && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Path cannot be changed when editing</p>
                  )}
                </div>

                {/* Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    disabled={!!selectedMock}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  {selectedMock && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Method cannot be changed when editing</p>
                  )}
                </div>

                {/* Status Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status Code
                  </label>
                  <input
                    type="number"
                    value={formData.statusCode}
                    onChange={(e) => setFormData({ ...formData, statusCode: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="200"
                  />
                </div>

                {/* Delay */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Delay (milliseconds)
                  </label>
                  <input
                    type="number"
                    value={formData.delay}
                    onChange={(e) => setFormData({ ...formData, delay: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="0"
                  />
                </div>

                {/* Headers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Headers (JSON format)
                  </label>
                  <textarea
                    value={formData.headers}
                    onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-mono text-sm"
                    rows={8}
                    style={{ maxHeight: '200px', overflowY: 'auto' }}
                    placeholder='{"Content-Type": "application/json"}'
                  />
                </div>

                {/* Body */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Body (JSON format or plain text)
                  </label>
                  <textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-mono text-sm"
                    rows={12}
                    style={{ maxHeight: '300px', overflowY: 'auto' }}
                    placeholder='{"message": "Hello World"}'
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="Active">Active</option>
                    <option value="Forward">Forward</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowForm(false)
                  setSelectedMock(null)
                }}
                className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded hover:bg-gray-600 dark:hover:bg-gray-700 transition"
                disabled={formLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={formLoading}
              >
                {formLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MockResponses

