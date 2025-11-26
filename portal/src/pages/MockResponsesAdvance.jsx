import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { mockResponseService } from '../services/mockResponseService'
import { mockGroupService } from '../services/mockGroupService'
import { mockGroupResponseService } from '../services/mockGroupResponseService'
import { mappingDomainService } from '../services/mappingDomainService'
import { useError } from '../contexts/ErrorContext'
import { useAuth } from '../contexts/AuthContext'

function MockResponsesAdvance() {
  const { domainId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [mockResponses, setMockResponses] = useState([])
  const [mockGroups, setMockGroups] = useState([])
  const [expandedGroups, setExpandedGroups] = useState({})
  const [groupMockResponses, setGroupMockResponses] = useState({})
  const [groupStates, setGroupStates] = useState({})
  const [domain, setDomain] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedMock, setSelectedMock] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupFormData, setGroupFormData] = useState({ name: '' })
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    method: 'GET',
    statusCode: '200',
    delay: '0',
    headers: JSON.stringify({ "Content-Type": "application/json" }, null, 2),
    body: '',
    state: 'Active'
  })
  const [formLoading, setFormLoading] = useState(false)
  const { showError } = useError()
  const { permissions } = useAuth()

  const hasMocksAdvancePermission = permissions.some(perm => perm.includes('/mocks-advance/') || perm === '/*')

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

  const fetchMockGroups = async () => {
    if (!domainId) {
      console.warn('fetchMockGroups: domainId is missing')
      setMockGroups([])
      return
    }

    try {
      const response = await mockGroupService.getAll(domainId)
      const groups = response.data?.mockGroups || []
      // Filter groups to ensure they belong to current domain (double check)
      const filteredGroups = groups.filter(group => group.domain_id === parseInt(domainId))
      setMockGroups(filteredGroups)

      // Fetch state for each group (use filteredGroups)
      const states = {}
      await Promise.all(
        filteredGroups.map(async (group) => {
          try {
            const stateResponse = await mockGroupService.getGroupState(group.id)
            states[group.id] = stateResponse.data?.state || 'InActive'
          } catch (error) {
            states[group.id] = 'InActive'
          }
        })
      )
      setGroupStates(states)
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to load mock groups')
      setMockGroups([])
    }
  }

  const fetchGroupMockResponses = async (groupId) => {
    try {
      const response = await mockGroupService.getById(groupId)
      setGroupMockResponses(prev => ({
        ...prev,
        [groupId]: response.data?.mockResponses || []
      }))
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to load group mock responses')
    }
  }

  useEffect(() => {
    fetchDomain()
    fetchMockResponses()
    fetchMockGroups()
  }, [domainId])

  const toggleGroupExpansion = async (groupId) => {
    const isExpanding = !expandedGroups[groupId]
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: isExpanding
    }))

    if (isExpanding && !groupMockResponses[groupId]) {
      await fetchGroupMockResponses(groupId)
    }
  }

  const handleAddGroup = () => {
    setGroupFormData({ name: '' })
    setSelectedGroup(null)
    setShowGroupForm(true)
  }

  const handleEditGroup = (group) => {
    setGroupFormData({ name: group.name })
    setSelectedGroup(group)
    setShowGroupForm(true)
  }

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Are you sure you want to delete group "${group.name}"?`)) {
      return
    }

    try {
      await mockGroupService.delete(group.id)
      fetchMockGroups()
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to delete mock group')
    }
  }

  const handleGroupFormSubmit = async () => {
    try {
      setFormLoading(true)

      if (!groupFormData.name.trim()) {
        showError('Group name is required')
        setFormLoading(false)
        return
      }

      if (selectedGroup) {
        await mockGroupService.update(selectedGroup.id, { name: groupFormData.name.trim() })
      } else {
        await mockGroupService.create({ name: groupFormData.name.trim(), domain_id: parseInt(domainId) })
      }

      setShowGroupForm(false)
      setSelectedGroup(null)
      fetchMockGroups()
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to save mock group')
    } finally {
      setFormLoading(false)
    }
  }

  const handleRemoveFromGroup = async (groupId, mockResponseId) => {
    if (!window.confirm('Are you sure you want to remove this mock from the group?')) {
      return
    }

    try {
      await mockGroupResponseService.deleteByGroupAndMockResponse(groupId, mockResponseId)
      await fetchGroupMockResponses(groupId)

      // Refresh group state after removing mock
      const stateResponse = await mockGroupService.getGroupState(groupId)
      setGroupStates(prev => ({
        ...prev,
        [groupId]: stateResponse.data?.state || 'InActive'
      }))
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to remove mock from group')
    }
  }

  const handleAddToGroup = async (mockResponseId, groupId) => {
    try {
      await mockGroupResponseService.create({
        group_id: groupId,
        mock_response_id: mockResponseId
      })

      if (expandedGroups[groupId]) {
        await fetchGroupMockResponses(groupId)
      }

      // Refresh group state after adding mock
      const stateResponse = await mockGroupService.getGroupState(groupId)
      setGroupStates(prev => ({
        ...prev,
        [groupId]: stateResponse.data?.state || 'InActive'
      }))
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to add mock to group')
    }
  }

  const handleToggleGroupState = async (groupId) => {
    try {
      const response = await mockGroupService.toggleGroupState(groupId)
      const newState = response.data?.state

      // Update group state
      setGroupStates(prev => ({
        ...prev,
        [groupId]: newState
      }))

      // Refresh group mock responses if expanded
      if (expandedGroups[groupId]) {
        await fetchGroupMockResponses(groupId)
      }

      // Refresh all mock responses to reflect state changes
      await fetchMockResponses()
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to toggle group state')
    }
  }

  const handleAdd = () => {
    setFormData({
      name: '',
      path: '',
      method: 'GET',
      statusCode: '200',
      delay: '0',
      headers: JSON.stringify({ "Content-Type": "application/json" }, null, 2),
      body: '',
      state: 'Active'
    })
    setSelectedMock(null)
    setShowForm(true)
  }

  const handleEdit = (mock) => {
    setFormData({
      name: mock.name !== null && mock.name !== undefined ? mock.name : '',
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

  const handleClone = async (mock) => {
    try {
      await mockResponseService.disableByPathAndMethod(mock.domain_id, mock.path, mock.method)

      await mockResponseService.create({
        domain_id: mock.domain_id,
        name: mock.name || '',
        path: mock.path,
        method: mock.method,
        status_code: mock.status_code,
        delay: mock.delay || 0,
        headers: mock.headers || {},
        body: mock.body || null,
        state: 'Active'
      })

      fetchMockResponses()
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to clone mock response')
    }
  }

  const handleQuickChangeState = async (mock) => {
    try {
      let newState
      if (mock.state === 'Active') {
        newState = 'Forward'
      } else if (mock.state === 'Forward') {
        newState = 'Disable'
      } else {
        newState = 'Active'
      }

      await mockResponseService.update(mock.id, {
        state: newState
      })

      fetchMockResponses()
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to change mock state')
    }
  }

  const handleSubmit = async () => {
    try {
      setFormLoading(true)

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
        body = formData.body
      }

      if (selectedMock) {
        await mockResponseService.update(selectedMock.id, {
          name: formData.name.trim() || '',
          status_code: parseInt(formData.statusCode),
          delay: parseInt(formData.delay) || 0,
          headers,
          body,
          state: formData.state
        })
      } else {
        if (!formData.path.trim()) {
          showError('Path is required')
          setFormLoading(false)
          return
        }

        await mockResponseService.create({
          domain_id: parseInt(domainId),
          name: formData.name.trim() || '',
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
      {/* Title with Tabs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
            {domain?.forward_domain || 'Loading...'}
          </h2>
        </div>
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

      {/* Mock Groups Table */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Mock Groups</h3>
          <button
            onClick={handleAddGroup}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            + Add Group
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-12"></th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">State</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {mockGroups.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                    No mock groups found
                  </td>
                </tr>
              ) : (
                mockGroups.map((group) => (
                  <>
                    <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button
                          onClick={() => toggleGroupExpansion(group.id)}
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                        >
                          <svg
                            className={`w-5 h-5 transition-transform ${expandedGroups[group.id] ? 'transform rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-white text-sm">{group.id}</td>
                      <td className="px-3 py-2 text-gray-900 dark:text-white text-sm">{group.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleGroupState(group.id)}
                          className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                            groupStates[group.id] === 'Active'
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                              : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500'
                          }`}
                          title={`Click to toggle state (currently ${groupStates[group.id] || 'InActive'})`}
                        >
                          {groupStates[group.id] || 'InActive'}
                        </button>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => handleEditGroup(group)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs md:text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(group)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs md:text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedGroups[group.id] && (
                      <tr>
                        <td colSpan="5" className="px-8 py-4 bg-gray-50 dark:bg-gray-900">
                          {groupMockResponses[group.id]?.length > 0 ? (
                            <div className="space-y-2">
                              {groupMockResponses[group.id].map((mock) => (
                                <div
                                  key={mock.id}
                                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                                    <div className="text-sm text-gray-900 dark:text-white">
                                      ID: {mock.id}
                                    </div>
                                    <div className="text-sm text-gray-900 dark:text-white truncate">
                                      {mock.name || 'No name'}
                                    </div>
                                    <div className="text-sm text-gray-900 dark:text-white truncate">
                                      {mock.path}
                                    </div>
                                    <div>
                                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                                        {mock.method}
                                      </span>
                                    </div>
                                    <div>
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        mock.state === 'Active'
                                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                          : mock.state === 'Disable'
                                          ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                          : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                                      }`}>
                                        {mock.state}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveFromGroup(group.id, mock.mock_response_id)}
                                    className="ml-4 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                              No mock responses in this group
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mock Responses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Mock Responses</h3>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
          >
            + Add Mock
          </button>
        </div>
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
                      <div className="max-w-md truncate" title={mock.name !== null && mock.name !== undefined && mock.name !== '' ? mock.name : 'No name'}>
                        {mock.name !== null && mock.name !== undefined && mock.name !== '' ? mock.name : 'No name'}
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
                      <div className="flex gap-2 items-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          mock.state === 'Active'
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : mock.state === 'Disable'
                            ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                            : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                        }`}>
                          {mock.state}
                        </span>
                        <button
                          onClick={() => handleQuickChangeState(mock)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          title={`Change state: ${mock.state === 'Active' ? 'Active → Forward' : mock.state === 'Forward' ? 'Forward → Disable' : 'Disable → Active'}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap">
                      <div className="flex gap-2 items-center flex-wrap">
                        <button
                          onClick={() => handleEdit(mock)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs md:text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleClone(mock)}
                          className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-xs md:text-sm"
                        >
                          Clone
                        </button>
                        <button
                          onClick={() => handleDelete(mock)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs md:text-sm"
                        >
                          Delete
                        </button>
                        {mockGroups.length > 0 && (
                          <div className="relative inline-block">
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddToGroup(mock.id, parseInt(e.target.value))
                                  e.target.value = ''
                                }
                              }}
                              className="text-xs px-2 py-1 border border-purple-500 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer"
                              defaultValue=""
                            >
                              <option value="" disabled>Group</option>
                              {mockGroups.map(group => (
                                <option key={group.id} value={group.id}>{group.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Group Form Dialog */}
      {showGroupForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  {selectedGroup ? 'Edit Mock Group' : 'Add Mock Group'}
                </h3>
                <button
                  onClick={() => {
                    setShowGroupForm(false)
                    setSelectedGroup(null)
                  }}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl transition"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ name: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  placeholder="Enter group name"
                />
              </div>
            </div>
            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowGroupForm(false)
                  setSelectedGroup(null)
                }}
                className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded hover:bg-gray-600 dark:hover:bg-gray-700 transition"
                disabled={formLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleGroupFormSubmit}
                className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={formLoading}
              >
                {formLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mock Response Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
                    <option value="Disable">Disable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="Optional name for this mock"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {selectedMock ? 'Name can be edited' : 'Optional field, leave empty if not needed'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Path <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.path}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        path: e.target.value
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

export default MockResponsesAdvance
