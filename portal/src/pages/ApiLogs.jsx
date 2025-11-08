import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiLogService } from '../services/apiLogService'
import { mappingDomainService } from '../services/mappingDomainService'
import { useError } from '../contexts/ErrorContext'

function ApiLogs() {
  const { domainId } = useParams()
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [domain, setDomain] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCurl, setSelectedCurl] = useState(null)
  const { showError } = useError()

  useEffect(() => {
    fetchDomain()
    fetchLogs()
  }, [domainId])

  const fetchDomain = async () => {
    try {
      const response = await mappingDomainService.getById(domainId)
      setDomain(response.data?.mappingDomain)
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to load domain')
    }
  }

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await apiLogService.getByDomainId(domainId, { limit: 100 })
      const logsData = response.data?.logs || []
      setLogs(Array.isArray(logsData) ? logsData : [])
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to load API logs')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCurl = async () => {
    if (selectedCurl) {
      try {
        await navigator.clipboard.writeText(selectedCurl)
        alert('cURL copied to clipboard!')
      } catch (error) {
        showError('Failed to copy to clipboard')
      }
    }
  }

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-800'
    if (status >= 300 && status < 400) return 'bg-yellow-100 text-yellow-800'
    if (status >= 400) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/mapping-domain')}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
        >
          ← Back
        </button>
        <h2 className="text-xl md:text-2xl font-bold">
          API Logs - {domain?.forward_domain || 'Loading...'}
        </h2>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Created At</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">{log.id}</td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {log.method}
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                    {log.status && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    )}
                  </td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                    {log.toCUrl && (
                      <button
                        onClick={() => setSelectedCurl(log.toCUrl)}
                        className="text-blue-600 hover:text-blue-800 text-sm md:text-base"
                      >
                        View cURL
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && (
          <div className="text-center py-8 text-gray-500">No API logs found</div>
        )}
      </div>

      {/* cURL Dialog */}
      {selectedCurl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">cURL Command</h3>
                <button
                  onClick={() => setSelectedCurl(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto whitespace-pre-wrap break-words">
                {selectedCurl}
              </pre>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <button
                onClick={() => setSelectedCurl(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                Close
              </button>
              <button
                onClick={handleCopyCurl}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApiLogs

