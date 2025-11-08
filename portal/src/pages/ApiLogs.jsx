import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiLogService } from '../services/apiLogService'
import { mappingDomainService } from '../services/mappingDomainService'
import { useError } from '../contexts/ErrorContext'
import { connectSocket, disconnectSocket, joinDomainRoom, leaveDomainRoom, getSocket } from '../services/socketService'

function ApiLogs() {
  const { domainId } = useParams()
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [domain, setDomain] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCurl, setSelectedCurl] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)
  const [showResponseHeaders, setShowResponseHeaders] = useState(false)
  const [showResponseBody, setShowResponseBody] = useState(true)
  const { showError } = useError()

  useEffect(() => {
    fetchDomain()
    fetchLogs()

    // Connect to socket and join domain room
    const socket = connectSocket()
    
    // Listen for new API logs
    const handleNewLog = (data) => {
      console.log('[ApiLogs] Received new-api-log event:', data)
      if (data.log) {
        const logDomainId = parseInt(data.log.domain_id)
        const currentDomainId = parseInt(domainId)
        console.log(`[ApiLogs] Comparing domain_id: ${logDomainId} === ${currentDomainId}`)
        
        if (logDomainId === currentDomainId) {
          console.log('[ApiLogs] Adding new log to list:', data.log.id)
          // Add new log to the beginning of the list
          setLogs(prevLogs => {
            // Check if log already exists to avoid duplicates
            const exists = prevLogs.some(log => log.id === data.log.id)
            if (exists) {
              console.log('[ApiLogs] Log already exists, skipping:', data.log.id)
              return prevLogs
            }
            // Add new log at the beginning and limit to 100 items
            const newLogs = [data.log, ...prevLogs].slice(0, 100)
            console.log('[ApiLogs] Updated logs list, new count:', newLogs.length)
            return newLogs
          })
        } else {
          console.log(`[ApiLogs] Domain ID mismatch, ignoring log`)
        }
      } else {
        console.warn('[ApiLogs] Received event without log data')
      }
    }

    socket.on('new-api-log', handleNewLog)
    
    // Join domain room after socket is ready
    const handleConnect = () => {
      console.log('[ApiLogs] Socket connected, joining domain room:', domainId)
      joinDomainRoom(domainId)
    }
    
    if (socket.connected) {
      joinDomainRoom(domainId)
    } else {
      socket.once('connect', handleConnect)
    }

    // Cleanup on unmount
    return () => {
      socket.off('new-api-log', handleNewLog)
      socket.off('connect', handleConnect)
      leaveDomainRoom(domainId)
    }
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

  // Extract forward path from cURL command (path only, not full URL)
  // Example: from "https://mock-3.thangvnnc.io.vn/vietbank/api/transaction-service/reward-360/GetMemberProfileAsync"
  // with mapping "/vietbank/*" => returns "api/transaction-service/reward-360/GetMemberProfileAsync"
  const getForwardPath = (curlCommand) => {
    if (!curlCommand) {
      console.log('[getForwardPath] No curlCommand provided')
      return 'N/A'
    }
    if (!domain) {
      console.log('[getForwardPath] No domain provided')
      return 'N/A'
    }
    
    // Extract URL from cURL command - match quoted strings that contain http
    // Handle both single-line and multi-line cURL commands
    let fullUrl = null
    
    // Try to find URL in quoted strings
    const urlMatches = curlCommand.match(/"([^"]+)"/g)
    if (urlMatches && urlMatches.length > 0) {
      // Find the last match that starts with http:// or https://
      for (let i = urlMatches.length - 1; i >= 0; i--) {
        const match = urlMatches[i].replace(/"/g, '')
        if (match.startsWith('http://') || match.startsWith('https://')) {
          fullUrl = match
          break
        }
      }
    }
    
    // If not found in quoted strings, try to find URL directly
    if (!fullUrl) {
      const directUrlMatch = curlCommand.match(/(https?:\/\/[^\s"']+)/)
      if (directUrlMatch) {
        fullUrl = directUrlMatch[1]
      }
    }
    
    if (!fullUrl) {
      console.log('[getForwardPath] No URL found in curlCommand:', curlCommand.substring(0, 200))
      return 'N/A'
    }
    
    console.log('[getForwardPath] Found URL:', fullUrl)
    console.log('[getForwardPath] Domain:', domain)
    console.log('[getForwardPath] Forward domain:', domain.forward_domain)
    console.log('[getForwardPath] Mapping path:', domain.path)
    
    try {
      // Remove forward domain to get the path
      const forwardDomain = domain.forward_domain.replace(/\/$/, '')
      
      if (fullUrl.startsWith(forwardDomain)) {
        // Extract path from URL (remove forward domain)
        let pathWithQuery = fullUrl.substring(forwardDomain.length)
        
        // Remove query string if exists
        const queryIndex = pathWithQuery.indexOf('?')
        let path = queryIndex >= 0 ? pathWithQuery.substring(0, queryIndex) : pathWithQuery
        
        console.log('[getForwardPath] Path after removing domain:', path)
        
        // Remove mapping path prefix from domain.path
        let mappingPath = domain.path
        if (mappingPath.endsWith('/*')) {
          // For wildcard mapping, remove the base path (e.g., /vietbank from /vietbank/*)
          mappingPath = mappingPath.slice(0, -1) // Remove * to get /vietbank
        }
        
        console.log('[getForwardPath] Mapping path (processed):', mappingPath)
        
        // Remove mapping prefix from path
        // Handle both /vietbank and /vietbank/ cases
        if (path.startsWith(mappingPath)) {
          path = path.substring(mappingPath.length)
        } else if (mappingPath.endsWith('/') && path.startsWith(mappingPath.slice(0, -1))) {
          // Handle case where mappingPath ends with / but path doesn't
          path = path.substring(mappingPath.length - 1)
        }
        
        // Remove leading slash to get relative path (e.g., /api/... => api/...)
        path = path.replace(/^\//, '')
        
        console.log('[getForwardPath] Final path:', path)
        return path || '/'
      }
      
      // If domain doesn't match, try to extract path from URL object
      console.log('[getForwardPath] Domain mismatch, trying URL object')
      const url = new URL(fullUrl)
      let path = url.pathname
      
      // Remove mapping path prefix
      let mappingPath = domain.path
      if (mappingPath.endsWith('/*')) {
        mappingPath = mappingPath.slice(0, -1)
      }
      if (path.startsWith(mappingPath)) {
        path = path.substring(mappingPath.length)
      }
      path = path.replace(/^\//, '')
      
      console.log('[getForwardPath] Final path (fallback):', path)
      return path || '/'
    } catch (e) {
      console.error('[getForwardPath] Error:', e)
      // If URL parsing fails, try to extract path manually
      const forwardDomain = domain.forward_domain.replace(/\/$/, '')
      if (fullUrl.startsWith(forwardDomain)) {
        let path = fullUrl.substring(forwardDomain.length)
        
        // Remove query string
        const queryIndex = path.indexOf('?')
        if (queryIndex >= 0) {
          path = path.substring(0, queryIndex)
        }
        
        // Remove mapping path prefix
        let mappingPath = domain.path
        if (mappingPath.endsWith('/*')) {
          mappingPath = mappingPath.slice(0, -1)
        }
        if (path.startsWith(mappingPath)) {
          path = path.substring(mappingPath.length)
        }
        path = path.replace(/^\//, '')
        
        console.log('[getForwardPath] Final path (error fallback):', path)
        return path || '/'
      }
      console.error('[getForwardPath] All extraction methods failed')
    }
    
    return 'N/A'
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
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forward Path</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Created At</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">{log.id}</td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {log.method}
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-4">
                    <div className="max-w-md truncate text-xs md:text-sm text-gray-700" title={getForwardPath(log.toCUrl)}>
                      {getForwardPath(log.toCUrl)}
                    </div>
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
                    <div className="flex gap-2 items-center">
                      {log.toCUrl && (
                        <button
                          onClick={() => setSelectedCurl(log.toCUrl)}
                          className="text-blue-600 hover:text-blue-800 text-sm md:text-base"
                        >
                          View cURL
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedLog(log)
                          setShowResponseHeaders(false) // Reset collapse state when opening new log
                          setShowResponseBody(true) // Default open for body
                        }}
                        className="text-green-600 hover:text-green-800 text-sm md:text-base"
                      >
                        Show
                      </button>
                    </div>
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

      {/* Response Dialog */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold">Response Details</h3>
                  {selectedLog.status && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedLog.status)}`}>
                      {selectedLog.status}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <div className="space-y-4">
                {/* Response Headers - Collapsible */}
                <div>
                  <button
                    onClick={() => setShowResponseHeaders(!showResponseHeaders)}
                    className="flex items-center justify-between w-full text-left mb-2"
                  >
                    <h4 className="text-lg font-semibold">Response Headers</h4>
                    <svg
                      className={`w-5 h-5 transition-transform ${showResponseHeaders ? 'transform rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showResponseHeaders && (
                    <pre className="bg-gray-100 p-4 rounded overflow-x-auto whitespace-pre-wrap break-words" style={{ fontSize: '0.6rem' }}>
                      {JSON.stringify(selectedLog.responseHeaders || {}, null, 2)}
                    </pre>
                  )}
                </div>
                {/* Response Body - Collapsible */}
                <div>
                  <button
                    onClick={() => setShowResponseBody(!showResponseBody)}
                    className="flex items-center justify-between w-full text-left mb-2"
                  >
                    <h4 className="text-lg font-semibold">Response Body</h4>
                    <svg
                      className={`w-5 h-5 transition-transform ${showResponseBody ? 'transform rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showResponseBody && (
                    <pre className="bg-gray-100 p-4 rounded overflow-x-auto whitespace-pre-wrap break-words" style={{ fontSize: '0.6rem' }}>
                      {selectedLog.responseBody 
                        ? (typeof selectedLog.responseBody === 'string' 
                            ? selectedLog.responseBody 
                            : JSON.stringify(selectedLog.responseBody, null, 2))
                        : 'No response body'}
                    </pre>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApiLogs

