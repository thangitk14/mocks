import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { mappingDomainService } from '../services/mappingDomainService'
import { useError } from '../contexts/ErrorContext'
import { useConfirm } from '../contexts/ConfirmContext'

function MappingDomain() {
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDomain, setEditingDomain] = useState(null)
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

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl md:text-2xl font-bold">Mapping Domain Management</h2>
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

      {showForm && (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg md:text-xl font-bold mb-4">
            {editingDomain ? 'Edit Mapping Domain' : 'Add New Mapping Domain'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Project Name</label>
              <input
                type="text"
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Path</label>
              <input
                type="text"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
                disabled={!!editingDomain}
                placeholder="/test"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Forward Domain</label>
              <input
                type="text"
                value={formData.forward_domain}
                onChange={(e) => setFormData({ ...formData, forward_domain: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
                placeholder="https://api.example.com"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">State</label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              >
                <option value="Active">Active</option>
                <option value="InActive">InActive</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Forward State</label>
              <select
                value={formData.forward_state}
                onChange={(e) => setFormData({ ...formData, forward_state: e.target.value })}
                className="w-full px-4 py-2 border rounded"
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project Name</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Path</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Forward Domain</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Forward State</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {domains.map((domain) => (
                <tr key={domain.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewLogs(domain.id)}>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">{domain.id}</td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">{domain.project_name}</td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">{domain.path}</td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden md:table-cell">{domain.forward_domain}</td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      domain.state === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {domain.state}
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden md:table-cell">{domain.forward_state}</td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(domain)}
                        className="text-blue-600 hover:text-blue-800 text-sm md:text-base"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(domain.id)}
                        className="text-red-600 hover:text-red-800 text-sm md:text-base"
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
          <div className="text-center py-8 text-gray-500">No mapping domains found</div>
        )}
      </div>
    </div>
  )
}

export default MappingDomain

