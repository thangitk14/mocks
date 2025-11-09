import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { mappingDomainService } from '../services/mappingDomainService'
import { useError } from '../contexts/ErrorContext'
import { useConfirm } from '../contexts/ConfirmContext'

function MappingDomain() {
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importData, setImportData] = useState(null)
  const [importNewPath, setImportNewPath] = useState('')
  const [importOverwrite, setImportOverwrite] = useState(false)
  const [editingDomain, setEditingDomain] = useState(null)
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    project_name: '',
    path: '',
    forward_domain: '',
    state: 'Active',
    forward_state: 'NoneApi',
  })
  const { showError } = useError()
  const { showConfirm } = useConfirm()
  const navigate = useNavigate()

  useEffect(() => {
    fetchDomains()
  }, [])

  const fetchDomains = async () => {
    try {
      setLoading(true)
      const response = await mappingDomainService.getAll()
      const domainsData = response.data?.mappingDomains || response.data || []
      setDomains(Array.isArray(domainsData) ? domainsData : [])
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to load mapping domains')
      setDomains([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingDomain) {
        await mappingDomainService.update(editingDomain.id, formData)
      } else {
        await mappingDomainService.create(formData)
      }
      setShowForm(false)
      setEditingDomain(null)
      setFormData({ project_name: '', path: '', forward_domain: '', state: 'Active', forward_state: 'NoneApi' })
      fetchDomains()
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to save mapping domain')
    }
  }

  const handleEdit = (domain) => {
    setEditingDomain(domain)
    setFormData({
      project_name: domain.project_name || '',
      path: domain.path || '',
      forward_domain: domain.forward_domain || '',
      state: domain.state || 'Active',
      forward_state: domain.forward_state || 'NoneApi',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('Are you sure you want to delete this mapping domain?')
    if (!confirmed) return

    try {
      await mappingDomainService.delete(id)
      fetchDomains()
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to delete mapping domain')
    }
  }

  const handleViewLogs = (domainId) => {
    navigate(`/mapping-domain/${domainId}/logs`)
  }

  const handleExport = async (domainId, e) => {
    e?.stopPropagation()
    try {
      const response = await mappingDomainService.export(domainId)
      const exportData = response.data

      // Create filename with domain info
      const filename = `mapping-domain-${exportData.mappingDomain.path.replace(/\//g, '_')}-${new Date().toISOString().split('T')[0]}.json`

      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to export mapping domain')
    }
  }

  const handleImportFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        if (!data.mappingDomain) {
          showError('Invalid import file format. Missing mappingDomain data.')
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
          return
        }
        setImportData(data)
        setImportNewPath('')
        setImportOverwrite(false)
        setShowImportDialog(true)
      } catch (error) {
        showError('Failed to parse JSON file: ' + error.message)
        // Reset file input on error
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }
    reader.onerror = () => {
      showError('Failed to read file')
      // Reset file input on error
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    try {
      // Check if path already exists
      const existingDomain = domains.find(d => d.path === (importNewPath || importData.mappingDomain.path))
      
      if (existingDomain && !importOverwrite && !importNewPath) {
        showError('Path already exists. Please choose to overwrite or enter a new path.')
        return
      }

      await mappingDomainService.import(importData, {
        newPath: importNewPath || undefined,
        overwrite: importOverwrite
      })

      setShowImportDialog(false)
      setImportData(null)
      setImportNewPath('')
      setImportOverwrite(false)
      // Reset file input after successful import
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      fetchDomains()
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to import mapping domain'
      if (error.response?.data?.error?.errorCode === 'PATH_ALREADY_EXISTS') {
        showError('Path already exists. Please choose to overwrite or enter a new path.')
      } else {
        showError(errorMessage)
      }
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Mapping Domain Management</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <label className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm md:text-base text-center cursor-pointer">
            Import
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFileSelect}
              className="hidden"
            />
          </label>
          <button
            onClick={() => {
              setShowForm(true)
              setEditingDomain(null)
              setFormData({ project_name: '', path: '', forward_domain: '', state: 'Active', forward_state: 'NoneApi' })
            }}
            className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm md:text-base"
          >
            Add Mapping Domain
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-gray-800 dark:text-white">
            {editingDomain ? 'Edit Mapping Domain' : 'Add New Mapping Domain'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Project Name</label>
              <input
                type="text"
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                className="w-full px-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Path</label>
              <input
                type="text"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                className="w-full px-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                disabled={!!editingDomain}
                placeholder="/test"
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Forward Domain</label>
              <input
                type="text"
                value={formData.forward_domain}
                onChange={(e) => setFormData({ ...formData, forward_domain: e.target.value })}
                className="w-full px-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                placeholder="https://api.example.com"
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">State</label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="Active">Active</option>
                <option value="InActive">InActive</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Forward State</label>
              <select
                value={formData.forward_state}
                onChange={(e) => setFormData({ ...formData, forward_state: e.target.value })}
                className="w-full px-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="NoneApi">NoneApi - No forwarding</option>
                <option value="SomeApi">SomeApi - Forward some APIs</option>
                <option value="AllApi">AllApi - Forward all APIs</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm md:text-base"
              >
                {editingDomain ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingDomain(null)
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
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Project Name</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Path</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase hidden md:table-cell">Forward Domain</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">State</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase hidden md:table-cell">Forward State</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {domains.map((domain) => (
                <tr key={domain.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleViewLogs(domain.id)}>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{domain.id}</td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{domain.project_name}</td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{domain.path}</td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden md:table-cell text-gray-900 dark:text-white">{domain.forward_domain}</td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      domain.state === 'Active' 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      {domain.state}
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden md:table-cell text-gray-900 dark:text-white">{domain.forward_state}</td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleExport(domain.id, e)}
                        className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm md:text-base"
                        title="Export mapping and mocks"
                      >
                        Export
                      </button>
                      <button
                        onClick={() => handleEdit(domain)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm md:text-base"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(domain.id)}
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
        {domains.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">No mapping domains found</div>
        )}
      </div>

      {/* Import Dialog */}
      {showImportDialog && importData && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Only close if clicking on backdrop, not on dialog content
            if (e.target === e.currentTarget) {
              setShowImportDialog(false)
              setImportData(null)
              setImportNewPath('')
              setImportOverwrite(false)
              // Reset file input when closing dialog
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }
            }
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Import Mapping Domain</h3>
              
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Mapping Domain Info:</h4>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm">
                  <p className="text-gray-900 dark:text-gray-100"><span className="font-medium text-gray-700 dark:text-gray-300">Project:</span> {importData.mappingDomain.project_name}</p>
                  <p className="text-gray-900 dark:text-gray-100"><span className="font-medium text-gray-700 dark:text-gray-300">Path:</span> {importData.mappingDomain.path}</p>
                  <p className="text-gray-900 dark:text-gray-100"><span className="font-medium text-gray-700 dark:text-gray-300">Forward Domain:</span> {importData.mappingDomain.forward_domain}</p>
                  <p className="text-gray-900 dark:text-gray-100"><span className="font-medium text-gray-700 dark:text-gray-300">State:</span> {importData.mappingDomain.state}</p>
                  <p className="text-gray-900 dark:text-gray-100"><span className="font-medium text-gray-700 dark:text-gray-300">Forward State:</span> {importData.mappingDomain.forward_state}</p>
                  <p className="text-gray-900 dark:text-gray-100"><span className="font-medium text-gray-700 dark:text-gray-300">Mock Responses:</span> {importData.mockResponses?.length || 0}</p>
                </div>
              </div>

              {(() => {
                const originalPath = importData.mappingDomain.path
                const originalPathExists = domains.find(d => d.path === originalPath)
                const newPathExists = importNewPath ? domains.find(d => d.path === importNewPath) : null
                const targetPath = importNewPath || originalPath
                const existingDomain = originalPathExists || newPathExists
                
                if (!originalPathExists && !newPathExists) return null
                
                return (
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                    {originalPathExists && (
                      <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                        ⚠️ Path "{originalPath}" already exists!
                      </p>
                    )}
                    {newPathExists && importNewPath && (
                      <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                        ⚠️ New path "{importNewPath}" also already exists!
                      </p>
                    )}
                    <div className="space-y-3">
                      {originalPathExists && (
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={importOverwrite}
                            onChange={(e) => {
                              e.stopPropagation()
                              setImportOverwrite(e.target.checked)
                              if (e.target.checked) setImportNewPath('')
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mr-2 w-4 h-4 text-green-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 dark:focus:ring-green-600 focus:ring-2 cursor-pointer"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Overwrite existing mapping (will delete existing mocks)</span>
                        </label>
                      )}
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Or enter new path:</label>
                        <input
                          type="text"
                          value={importNewPath}
                          onChange={(e) => {
                            e.stopPropagation()
                            setImportNewPath(e.target.value)
                            if (e.target.value) setImportOverwrite(false)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => e.stopPropagation()}
                          placeholder="/new-path"
                          className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                        {newPathExists && importNewPath && (
                          <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-1">
                            This path also exists. Please choose a different path or enable overwrite.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleImport}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                >
                  Import
                </button>
                <button
                  onClick={() => {
                    setShowImportDialog(false)
                    setImportData(null)
                    setImportNewPath('')
                    setImportOverwrite(false)
                    // Reset file input when canceling
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MappingDomain

