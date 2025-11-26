import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { apiLogService } from '../services/apiLogService'
import { mappingDomainService } from '../services/mappingDomainService'
import { mockResponseService } from '../services/mockResponseService'
import { useError } from '../contexts/ErrorContext'
import { useAuth } from '../contexts/AuthContext'
import { connectSocket, disconnectSocket, joinDomainRoom, leaveDomainRoom, getSocket } from '../services/socketService'

function ApiLogs() {
  const { domainId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [logs, setLogs] = useState([])
  const [domain, setDomain] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCurl, setSelectedCurl] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)
  const [showResponseHeaders, setShowResponseHeaders] = useState(false)
  const [showResponseBody, setShowResponseBody] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [mockResponses, setMockResponses] = useState({}) // Map logId -> mockResponse
  const [selectedMockLog, setSelectedMockLog] = useState(null) // Log selected for mock dialog
  const [mockFormData, setMockFormData] = useState({
    name: '',
    statusCode: '',
    delay: '',
    headers: JSON.stringify({ "Content-Type": "application/json" }, null, 2),
    body: '',
    state: 'Active'
  })
  const [mockFormLoading, setMockFormLoading] = useState(false)
  const { showError } = useError()
  const { permissions } = useAuth()

  // Check if user has permission for mocks-advance (or is admin with /*)
  const hasMocksAdvancePermission = permissions.some(perm => perm.includes('/mocks-advance/') || perm === '/*')

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
      const offset = (page - 1) * limit
      const response = await apiLogService.getByDomainId(domainId, { limit, offset })
      const logsData = response.data?.logs || []
      setLogs(Array.isArray(logsData) ? logsData : [])
      setTotal(response.data?.total || 0)
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to load API logs')
      setLogs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDomain()
  }, [domainId])

  useEffect(() => {
    fetchLogs()
  }, [domainId, page, limit])

  // Fetch mock responses for all logs (optimized: batch request)
  useEffect(() => {
    const fetchMockResponses = async () => {
      if (!domain || logs.length === 0) return
      
      try {
        // Collect all path/method pairs from logs
        const pathMethodMap = new Map() // key: "path::method", value: { path, method, logIds: [] }
        
        logs.forEach(log => {
          let path = getForwardPath(log.toCUrl)
          if (path && path !== 'N/A') {
            // Normalize path: remove leading slash, but keep '/' for root
            path = path.replace(/^\//, '')
            if (path === '') {
              path = '/'
            }
            
            const key = `${path}::${log.method}`
            if (!pathMethodMap.has(key)) {
              pathMethodMap.set(key, {
                path,
                method: log.method,
                logIds: []
              })
            }
            pathMethodMap.get(key).logIds.push(log.id)
          }
        })

        // Convert to array and remove duplicates (already handled by Map)
        const paths = Array.from(pathMethodMap.values())
        
        if (paths.length === 0) {
          setMockResponses({})
          return
        }

        // Get latest mock regardless of state to show change state button
        const response = await mockResponseService.getByPaths(domainId, paths, true)
        const mockResponsesMap = response.data?.mockResponses || {}
        
        // Map mock responses back to log IDs
        const mockMap = {}
        pathMethodMap.forEach(({ path, method, logIds }, key) => {
          const mockKey = `${path}::${method}`
          const mockResponse = mockResponsesMap[mockKey]
          if (mockResponse) {
            // Assign the same mock response to all logs with this path/method
            logIds.forEach(logId => {
              mockMap[logId] = mockResponse
            })
          }
        })
        
        setMockResponses(mockMap)
      } catch (error) {
        console.error('Failed to fetch mock responses:', error)
        // On error, set empty map instead of failing silently
        setMockResponses({})
      }
    }
    
    fetchMockResponses()
  }, [logs, domain, domainId])

  useEffect(() => {
    // Connect to socket and join domain room
    const socket = connectSocket()
    
    // Listen for new API logs - only add if on page 1
    const handleNewLog = (data) => {
      if (data.log) {
        const logDomainId = parseInt(data.log.domain_id)
        const currentDomainId = parseInt(domainId)
        
        if (logDomainId === currentDomainId) {
          // Only add new log if we're on page 1
          if (page === 1) {
            // Add new log to the beginning of the list
            setLogs(prevLogs => {
              // Check if log already exists to avoid duplicates
              const exists = prevLogs.some(log => log.id === data.log.id)
              if (exists) {
                return prevLogs
              }
              // Add new log at the beginning and limit to current limit
              const newLogs = [data.log, ...prevLogs].slice(0, limit)
              // Update total count
              setTotal(prevTotal => prevTotal + 1)
              return newLogs
            })
          } else {
            // Just update total count if not on page 1
            setTotal(prevTotal => prevTotal + 1)
          }
        } else {
          
        }
      } else {
        console.warn('[ApiLogs] Received event without log data')
      }
    }

    socket.on('new-api-log', handleNewLog)
    
    // Join domain room after socket is ready
    const handleConnect = () => {
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
  }, [domainId, page, limit])

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value)
    setLimit(newLimit)
    setPage(1) // Reset to page 1 when changing limit
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
    // Scroll to top when changing page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalPages = Math.ceil(total / limit)

  const handleCopyCurl = async (e) => {
    e?.stopPropagation()
    e?.preventDefault()
    
    if (!selectedCurl) {
      showError('No cURL command to copy')
      return
    }

    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(selectedCurl)
        alert('cURL copied to clipboard!')
        return
      }

      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = selectedCurl
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        const successful = document.execCommand('copy')
        if (successful) {
          alert('cURL copied to clipboard!')
        } else {
          throw new Error('execCommand failed')
        }
      } finally {
        document.body.removeChild(textArea)
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      showError('Failed to copy to clipboard. Please copy manually.')
    }
  }

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-800'
    if (status >= 300 && status < 400) return 'bg-yellow-100 text-yellow-800'
    if (status >= 400) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  // Filter out CORS headers (access-control-*)
  const filterCorsHeaders = (headers) => {
    if (!headers || typeof headers !== 'object') {
      return {}
    }
    const filtered = {}
    for (const [key, value] of Object.entries(headers)) {
      // Skip headers that start with "access-control-" (case insensitive)
      if (!key.toLowerCase().startsWith('access-control-')) {
        filtered[key] = value
      }
    }
    return filtered
  }


  // Extract full URL from cURL command
  const getFullUrl = (curlCommand) => {
    if (!curlCommand) {
      return null
    }
    
    // Normalize the cURL command: remove line continuation backslashes and extra whitespace
    const normalizedCurl = curlCommand.replace(/\\\s*\n\s*/g, ' ').replace(/\s+/g, ' ')
    
    // Method 1: Try to find URL in quoted strings
    const quotedUrlPattern = /"((?:https?:\/\/[^"]+))"/g
    let match
    let lastQuotedUrl = null
    while ((match = quotedUrlPattern.exec(normalizedCurl)) !== null) {
      if (match[1].startsWith('http://') || match[1].startsWith('https://')) {
        lastQuotedUrl = match[1]
      }
    }
    if (lastQuotedUrl) {
      return lastQuotedUrl
    }
    
    // Method 2: If not found in quoted strings, try to find URL directly
    const directUrlMatch = normalizedCurl.match(/(https?:\/\/[^\s"']+)/)
    if (directUrlMatch) {
      return directUrlMatch[1]
    }
    
    // Method 3: Try to find URL as the last argument
    const tokens = normalizedCurl.split(/\s+/)
    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i].replace(/^["']|["']$/g, '')
      if (token.startsWith('http://') || token.startsWith('https://')) {
        return token
      }
    }
    
    return null
  }

  // Extract full URL without query string (origin + pathname)
  const getFullUrlWithoutQuery = (curlCommand) => {
    const full = getFullUrl(curlCommand)
    if (!full) return null
    try {
      const url = new URL(full)
      return `${url.origin}${url.pathname}`
    } catch (e) {
      // Fallback if URL constructor fails
      return full.split('?')[0]
    }
  }

  // Extract forward path from cURL command (path only, not full URL)
  // The cURL already contains the forward path without the mapping prefix
  // Example: from "https://forward-domain.com/api/transaction-service/reward-360/GetMemberProfileAsync"
  // => returns "api/transaction-service/reward-360/GetMemberProfileAsync"
  const getForwardPath = (curlCommand) => {
    if (!curlCommand) {
      return 'N/A'
    }
    if (!domain) {
      return 'N/A'
    }
    // Extract URL from cURL command - match quoted strings that contain http
    // Handle both single-line and multi-line cURL commands
    let fullUrl = null
    
    // Normalize the cURL command: remove line continuation backslashes and extra whitespace
    // This helps handle multi-line cURL commands
    const normalizedCurl = curlCommand.replace(/\\\s*\n\s*/g, ' ').replace(/\s+/g, ' ')
    
    // Method 1: Try to find URL in quoted strings (most common case)
    // Match quoted strings that contain http:// or https://
    // Use a more robust regex that handles query strings with special characters
    const quotedUrlPattern = /"((?:https?:\/\/[^"]+))"/g
    let match
    let lastQuotedUrl = null
    while ((match = quotedUrlPattern.exec(normalizedCurl)) !== null) {
      if (match[1].startsWith('http://') || match[1].startsWith('https://')) {
        lastQuotedUrl = match[1]
      }
    }
    if (lastQuotedUrl) {
      fullUrl = lastQuotedUrl
    }
    
    // Method 2: If not found in quoted strings, try to find URL directly (unquoted)
    if (!fullUrl) {
      // Find URL that starts with http:// or https:// and continues until space, quote, or end
      const directUrlMatch = normalizedCurl.match(/(https?:\/\/[^\s"']+)/)
      if (directUrlMatch) {
        fullUrl = directUrlMatch[1]
      }
    }
    
    // Method 3: Try to find URL as the last argument (common pattern in cURL)
    if (!fullUrl) {
      // Split by spaces and find the last token that looks like a URL
      const tokens = normalizedCurl.split(/\s+/)
      for (let i = tokens.length - 1; i >= 0; i--) {
        const token = tokens[i].replace(/^["']|["']$/g, '') // Remove surrounding quotes
        if (token.startsWith('http://') || token.startsWith('https://')) {
          fullUrl = token
          break
        }
      }
    }
    
    if (!fullUrl) {
      return 'N/A'
    }
    
    try {
      // Parse URL to get pathname
      const url = new URL(fullUrl)
      let path = url.pathname
      
      // Remove query string if it's still in pathname (shouldn't be, but just in case)
      const queryIndex = path.indexOf('?')
      if (queryIndex >= 0) {
        path = path.substring(0, queryIndex)
      }
      
      // The forward path in cURL already has the mapping prefix removed by curlGenerator.js
      // So we just need to extract the path and remove leading slash
      // Remove leading slash to get relative path (e.g., /api/... => api/...)
      path = path.replace(/^\//, '')
      
      // Return the path, or '/' if empty
      return path || '/'
    } catch (e) {
      console.error('[getForwardPath] Error parsing URL:', e)
      
      // Fallback: try to extract path manually
      const forwardDomain = domain.forward_domain.replace(/\/$/, '')
      if (fullUrl.startsWith(forwardDomain)) {
        let path = fullUrl.substring(forwardDomain.length)
        
        // Remove query string
        const queryIndex = path.indexOf('?')
        if (queryIndex >= 0) {
          path = path.substring(0, queryIndex)
        }
        
        // Remove leading slash
        path = path.replace(/^\//, '')
        
        return path || '/'
      }
      
      console.error('[getForwardPath] All extraction methods failed')
      return 'N/A'
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  // Handle quick state change - cycle through states: Active -> Forward -> Disable -> Active
  const handleQuickChangeState = async (log) => {
    let path = getForwardPath(log.toCUrl)
    if (!path || path === 'N/A') {
      showError('Cannot determine path for this log')
      return
    }
    
    // Normalize path: remove leading slash, but keep '/' for root
    path = path.replace(/^\//, '')
    if (path === '') {
      path = '/'
    }

    try {
      // Get current mock to know current state
      const currentMock = mockResponses[log.id]
      if (!currentMock) {
        showError('No mock found for this log')
        return
      }

      // Determine next state: Active -> Forward -> Disable -> Active
      let newState
      if (currentMock.state === 'Active') {
        newState = 'Forward'
      } else if (currentMock.state === 'Forward') {
        newState = 'Disable'
      } else {
        newState = 'Active'
      }

      // Update the mock state
      await mockResponseService.update(currentMock.id, {
        state: newState
      })
      
      // Fetch updated mock by ID to get latest state (regardless of state)
      const updatedMockResponse = await mockResponseService.getById(currentMock.id)
      if (updatedMockResponse.data?.mockResponse) {
        // Update mock in state with new state
        setMockResponses(prev => ({
          ...prev,
          [log.id]: updatedMockResponse.data.mockResponse
        }))
      } else {
        // If fetch fails, update manually
        setMockResponses(prev => ({
          ...prev,
          [log.id]: { ...currentMock, state: newState }
        }))
      }
      
      // Refresh logs to update mock button state
      fetchLogs()
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to change mock state')
    }
  }

  // Handle mock button click
  const handleMockClick = (log) => {
    let path = getForwardPath(log.toCUrl)
    if (!path || path === 'N/A') {
      showError('Cannot determine path for this log')
      return
    }
    
    // Normalize path: remove leading slash, but keep '/' for root
    path = path.replace(/^\//, '')
    if (path === '') {
      path = '/'
    }

    const existingMock = mockResponses[log.id]
    
    // Load form data from log or existing mock
    // Filter out CORS headers before displaying
    const defaultHeaders = { "Content-Type": "application/json" }
    let headersToShow = existingMock?.headers 
      ? filterCorsHeaders(existingMock.headers)
      : log.responseHeaders 
      ? filterCorsHeaders(log.responseHeaders)
      : defaultHeaders
    
    // If headers are empty after filtering, use default headers
    if (Object.keys(headersToShow).length === 0) {
      headersToShow = defaultHeaders
    }
    
    setMockFormData({
      name: existingMock?.name !== null && existingMock?.name !== undefined ? existingMock.name : '',
      statusCode: existingMock?.status_code?.toString() || log.status?.toString() || '200',
      delay: existingMock?.delay?.toString() || log.duration?.toString() || '0',
      headers: JSON.stringify(headersToShow, null, 2),
      body: existingMock?.body
        ? (typeof existingMock.body === 'string' ? existingMock.body : JSON.stringify(existingMock.body, null, 2))
        : log.responseBody
        ? (typeof log.responseBody === 'string' ? log.responseBody : JSON.stringify(log.responseBody, null, 2))
        : '',
      state: existingMock?.state || 'Active'
    })
    
    setSelectedMockLog(log)
  }

  // Handle mock form submit
  const handleMockSubmit = async (saveMore = false) => {
    if (!selectedMockLog || !domain) return

    try {
      setMockFormLoading(true)
      let path = getForwardPath(selectedMockLog.toCUrl)
      if (!path || path === 'N/A') {
        showError('Cannot determine path for this log')
        return
      }
      
      // Normalize path: remove leading slash, but keep '/' for root
      path = path.replace(/^\//, '')
      if (path === '') {
        path = '/'
      }

      // Parse JSON fields
      let headers = {}
      let body = null
      
      try {
        headers = mockFormData.headers ? JSON.parse(mockFormData.headers) : {}
      } catch (e) {
        showError('Invalid JSON format for headers')
        setMockFormLoading(false)
        return
      }

      try {
        if (mockFormData.body.trim()) {
          body = JSON.parse(mockFormData.body)
        }
      } catch (e) {
        // If body is not JSON, treat as string
        body = mockFormData.body
      }

      const existingMock = mockResponses[selectedMockLog.id]
      
      if (saveMore) {
        // Save More: Disable all existing mocks with same path and method, then create new one
        // This creates a NEW mock response, not updating the existing one
        await mockResponseService.disableByPathAndMethod(parseInt(domainId), path, selectedMockLog.method)
        
        // Create new mock (always create, never update)
        await mockResponseService.create({
          domain_id: parseInt(domainId),
          name: mockFormData.name.trim() || '', // Use name from form or empty string
          path,
          method: selectedMockLog.method,
          status_code: parseInt(mockFormData.statusCode),
          delay: parseInt(mockFormData.delay) || 0,
          headers,
          body,
          state: 'Active' // Always Active for new mock
        })
      } else if (existingMock) {
        // Update existing mock (normal Save)
        await mockResponseService.update(existingMock.id, {
          name: mockFormData.name.trim() || '', // Update name
          status_code: parseInt(mockFormData.statusCode),
          delay: parseInt(mockFormData.delay) || 0,
          headers,
          body,
          state: mockFormData.state
        })
      } else {
        // Create new mock (first time creating)
        await mockResponseService.create({
          domain_id: parseInt(domainId),
          name: mockFormData.name.trim() || '', // Use name from form or empty string
          path,
          method: selectedMockLog.method,
          status_code: parseInt(mockFormData.statusCode),
          delay: parseInt(mockFormData.delay) || 0,
          headers,
          body,
          state: mockFormData.state
        })
      }

      // Refresh mock responses
      const response = await mockResponseService.getByPath(domainId, path, selectedMockLog.method)
      if (response.data?.mockResponse) {
        setMockResponses(prev => ({
          ...prev,
          [selectedMockLog.id]: response.data.mockResponse
        }))
      }

      // Close dialog after successful save (both Save and Save More)
      setSelectedMockLog(null)
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to save mock response')
    } finally {
      setMockFormLoading(false)
    }
  }

  return (
    <div>
      {/* Title with Tabs */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-4">
          {domain?.forward_domain || 'Loading...'}
        </h2>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => navigate(`/mapping-domain/${domainId}/logs`, { state: location.state })}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                location.pathname.includes('/logs')
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Logs
            </button>
            <button
              onClick={() => navigate(`/mapping-domain/${domainId}/mocks`, { state: location.state })}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                location.pathname.includes('/mocks') && !location.pathname.includes('/mocks-advance')
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Mocks
            </button>
            {hasMocksAdvancePermission && (
              <button
                onClick={() => navigate(`/mapping-domain/${domainId}/mocks-advance`, { state: location.state })}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  location.pathname.includes('/mocks-advance')
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Mocks-Advance
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Pagination Controls - Top */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700 dark:text-gray-300">Items per page:</label>
          <select
            value={limit}
            onChange={handleLimitChange}
            className="px-3 py-1.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {logs.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, total)} of {total} logs
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
                <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Method</th>
                <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Forward Path</th>
                <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Mock</th>
                <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Duration</th>
                <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase hidden md:table-cell">Created At</th>
                <th className="px-2 md:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap text-gray-900 dark:text-white text-sm">{log.id}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                      {log.method}
                    </span>
                  </td>
                  <td 
                    className="px-2 md:px-3 py-2 cursor-pointer relative"
                    onClick={() => {
                      setSelectedLog(log)
                      setShowResponseHeaders(false)
                      setShowResponseBody(true)
                    }}
                  >
                    <div 
                      className="text-xs md:text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors overflow-hidden group relative"
                      title={getForwardPath(log.toCUrl)}
                      style={{
                        direction: 'rtl',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'right'
                      }}
                    >
                      <span style={{ direction: 'ltr', unicodeBidi: 'embed' }}>
                        {getForwardPath(log.toCUrl)}
                      </span>
                      <div 
                        className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg p-2 max-w-md whitespace-normal break-words text-xs"
                        style={{ minWidth: '200px' }}
                      >
                        {getForwardPath(log.toCUrl)}
                      </div>
                    </div>
                  </td>
                  <td 
                    className="px-2 md:px-3 py-2 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMockClick(log)
                        }}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          mockResponses[log.id]
                            ? mockResponses[log.id].state === 'Active'
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                              : mockResponses[log.id].state === 'Disable'
                              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800'
                              : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {mockResponses[log.id] ? mockResponses[log.id].state : 'Mock'}
                      </button>
                      {mockResponses[log.id] && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleQuickChangeState(log)
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          title={`Change state: ${mockResponses[log.id]?.state === 'Active' ? 'Active → Forward' : mockResponses[log.id]?.state === 'Forward' ? 'Forward → Disable' : 'Disable → Active'}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">
                    {log.status && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.status >= 200 && log.status < 300 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : log.status >= 300 && log.status < 400
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                          : log.status >= 400
                          ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                      }`}>
                        {log.status}
                      </span>
                    )}
                  </td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap text-gray-900 dark:text-white text-sm">
                    {log.duration !== null && log.duration !== undefined ? (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        log.duration < 500
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : log.duration < 1000
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}>
                        {log.duration < 1000 ? `${log.duration}ms` : `${(log.duration / 1000).toFixed(2)}s`}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">N/A</span>
                    )}
                  </td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap hidden md:table-cell text-gray-900 dark:text-white text-sm">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                  </td>
                  <td 
                    className="px-2 md:px-3 py-2 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex gap-2 items-center">
                      {log.toCUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCurl(log.toCUrl)
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs md:text-sm"
                        >
                          View cURL
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedLog(log)
                          setShowResponseHeaders(false) // Reset collapse state when opening new log
                          setShowResponseBody(true) // Default open for body
                        }}
                        className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-xs md:text-sm"
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
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">No API logs found</div>
        )}
      </div>

      {/* Pagination Controls - Bottom */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              First
            </button>
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1.5 text-sm border dark:border-gray-600 rounded transition ${
                      page === pageNum
                        ? 'bg-blue-500 dark:bg-blue-600 text-white border-blue-500 dark:border-blue-600'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* cURL Dialog */}
      {selectedCurl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCurl(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">cURL Command</h3>
                <button
                  onClick={() => setSelectedCurl(null)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl transition"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded text-sm overflow-x-auto whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
                {selectedCurl}
              </pre>
            </div>
            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setSelectedCurl(null)}
                className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded hover:bg-gray-600 dark:hover:bg-gray-700 transition"
              >
                Close
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyCurl(e)
                }}
                className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Response Dialog */}
      {selectedLog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">Response Details</h3>
                  {selectedLog.status && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedLog.status >= 200 && selectedLog.status < 300 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : selectedLog.status >= 300 && selectedLog.status < 400
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        : selectedLog.status >= 400
                        ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                    }`}>
                      {selectedLog.status}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl transition"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <div className="space-y-4">
                {/* Full Path (no query, non-clickable) */}
                {selectedLog.toCUrl && (
                  <div className="mb-4 pb-4 border-b dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Path
                    </label>
                    {(() => {
                      const fullUrl = getFullUrlWithoutQuery(selectedLog.toCUrl)
                      if (fullUrl) {
                        return (
                          <div className="break-all text-sm font-mono text-gray-800 dark:text-gray-200">
                            {fullUrl}
                          </div>
                        )
                      }
                      return (
                        <span className="text-gray-500 dark:text-gray-400 text-sm">N/A</span>
                      )
                    })()}
                  </div>
                )}
                {/* Response Headers - Collapsible */}
                <div>
                  <button
                    onClick={() => setShowResponseHeaders(!showResponseHeaders)}
                    className="flex items-center justify-between w-full text-left mb-2 text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition"
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
                    <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-x-auto whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100" style={{ fontSize: '0.6rem' }}>
                      {JSON.stringify(selectedLog.responseHeaders || {}, null, 2)}
                    </pre>
                  )}
                </div>
                {/* Response Body - Collapsible */}
                <div>
                  <button
                    onClick={() => setShowResponseBody(!showResponseBody)}
                    className="flex items-center justify-between w-full text-left mb-2 text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition"
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
                    <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-x-auto whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100" style={{ fontSize: '0.6rem' }}>
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
            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded hover:bg-gray-600 dark:hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mock Response Dialog */}
      {selectedMockLog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Mock Response</h3>
                <button
                  onClick={() => setSelectedMockLog(null)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl transition"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <div className="space-y-4">
                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State
                  </label>
                  <select
                    value={mockFormData.state}
                    onChange={(e) => setMockFormData({ ...mockFormData, state: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="Active">Active</option>
                    <option value="Forward">Forward</option>
                    <option value="Disable">Disable</option>
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={mockFormData.name}
                    onChange={(e) => setMockFormData({ ...mockFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="Optional name for this mock"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Optional field, leave empty if not needed
                  </p>
                </div>

                {/* Status Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status Code
                  </label>
                  <input
                    type="number"
                    value={mockFormData.statusCode}
                    onChange={(e) => setMockFormData({ ...mockFormData, statusCode: e.target.value })}
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
                    value={mockFormData.delay}
                    onChange={(e) => setMockFormData({ ...mockFormData, delay: e.target.value })}
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
                    value={mockFormData.headers}
                    onChange={(e) => setMockFormData({ ...mockFormData, headers: e.target.value })}
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
                    value={mockFormData.body}
                    onChange={(e) => setMockFormData({ ...mockFormData, body: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-mono text-sm"
                    rows={12}
                    style={{ maxHeight: '300px', overflowY: 'auto' }}
                    placeholder='{"message": "Hello World"}'
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setSelectedMockLog(null)}
                className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded hover:bg-gray-600 dark:hover:bg-gray-700 transition"
                disabled={mockFormLoading}
              >
                Cancel
              </button>
              {mockResponses[selectedMockLog?.id] && (
                <button
                  onClick={() => handleMockSubmit(true)}
                  className="px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={mockFormLoading}
                >
                  {mockFormLoading ? 'Saving...' : 'Save More'}
                </button>
              )}
              <button
                onClick={() => handleMockSubmit(false)}
                className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={mockFormLoading}
              >
                {mockFormLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApiLogs

