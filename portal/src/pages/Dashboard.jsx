import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { mappingDomainService } from '../services/mappingDomainService'
import { useError } from '../contexts/ErrorContext'

function Dashboard() {
  const { user } = useAuth()
  const profile = user?.user
  const navigate = useNavigate()
  const [mappingDomains, setMappingDomains] = useState([])
  const [loading, setLoading] = useState(true)
  const { showError } = useError()

  useEffect(() => {
    fetchMappingDomains()
  }, [])

  const fetchMappingDomains = async () => {
    try {
      setLoading(true)
      const response = await mappingDomainService.getAll()
      const domains = response.data?.mappingDomains || []
      setMappingDomains(domains)
    } catch (error) {
      showError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to load mapping domains')
      setMappingDomains([])
    } finally {
      setLoading(false)
    }
  }

  // Group domains by project_name
  const groupedDomains = mappingDomains.reduce((acc, domain) => {
    const projectName = domain.project_name || 'Other'
    if (!acc[projectName]) {
      acc[projectName] = []
    }
    acc[projectName].push(domain)
    return acc
  }, {})

  const handleDomainClick = (domainId) => {
    navigate(`/mapping-domain/${domainId}/logs`, { state: { from: 'dashboard' } })
  }

  const getStateColor = (state) => {
    return state === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }

  const getForwardStateColor = (forwardState) => {
    if (forwardState === 'AllApi') return 'bg-blue-100 text-blue-800'
    if (forwardState === 'SomeApi') return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-800 dark:text-white">Dashboard</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Mapping Domains */}
        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow">
          <h3 className="text-base md:text-lg font-semibold mb-4 text-gray-800 dark:text-white">Mapping Domains: (https://fw.thangtp.id.vn/*)</h3>
          {loading ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">Loading...</div>
          ) : Object.keys(groupedDomains).length === 0 ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">No mapping domains found</div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {Object.entries(groupedDomains).map(([projectName, domains]) => (
                <div key={projectName} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0">
                  <h4 className="text-sm md:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {projectName}
                  </h4>
                  <div className="space-y-2">
                    {domains.map((domain) => (
                      <div
                        key={domain.id}
                        onClick={() => handleDomainClick(domain.id)}
                        className="p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs md:text-sm font-medium text-gray-900 dark:text-white truncate">
                              https://fw.thangtp.id.vn{domain.path}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
                              → {domain.forward_domain}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 items-end flex-shrink-0">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              domain.state === 'Active' 
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                                : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                            }`}>
                              {domain.state}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              domain.forward_state === 'AllApi'
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                : domain.forward_state === 'SomeApi'
                                ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                            }`}>
                              {domain.forward_state}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Information */}
        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow">
          <div className="mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-semibold mb-2 text-gray-800 dark:text-white">User information</h3>
            <div className="space-y-2 text-gray-700 dark:text-gray-300 text-sm md:text-base">
              <p><span className="font-medium">Name:</span> {profile?.name || 'N/A'}</p>
              <p><span className="font-medium">Username:</span> {profile?.username || 'N/A'}</p>
              <p><span className="font-medium">ID:</span> {profile?.id || 'N/A'}</p>
            </div>
          </div>
          
          {user?.roles && user.roles.length > 0 && (
            <div>
              <h3 className="text-base md:text-lg font-semibold mb-2 text-gray-800 dark:text-white">Your roles</h3>
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <span
                    key={role.id}
                    className="px-2 md:px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs md:text-sm"
                  >
                    {role.name} ({role.code})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard

