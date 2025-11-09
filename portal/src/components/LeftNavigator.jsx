import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

function LeftNavigator({ onToggle }) {
  const { hasPermission } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      permission: null, // No permission required
    },
    {
      path: '/mapping-domain',
      label: 'MappingDomain',
      permission: '/config/*',
    },
  ]

  const settingsItems = [
    {
      path: '/users',
      label: 'Users',
      permission: '/users/*',
    },
    {
      path: '/roles',
      label: 'Roles',
      permission: '/roles/*',
    },
    {
      path: '/role-user',
      label: 'UserRole',
      permission: '/role_user/*',
    },
    {
      path: '/functions',
      label: 'Functions',
      permission: null, // No permission required
    },
  ]

  const visibleItems = navItems.filter((item) =>
    !item.permission || hasPermission(item.permission)
  )

  const visibleSettingsItems = settingsItems.filter((item) =>
    !item.permission || hasPermission(item.permission)
  )

  // Check if any settings item is active
  const isSettingsActive = visibleSettingsItems.some((item) => {
    const currentPath = location.pathname
    return currentPath === item.path || currentPath.startsWith(item.path + '/')
  })

  // Auto-open settings if one of its items is active
  useEffect(() => {
    if (isSettingsActive) {
      setSettingsOpen(true)
    }
  }, [location.pathname, isSettingsActive])

  return (
    <nav className="w-64 md:w-64 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white h-full p-4 relative shadow-lg flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Navigation</h2>
        <button
          onClick={onToggle}
          className="md:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded transition"
          aria-label="Hide Navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          onClick={onToggle}
          className="hidden md:block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded transition"
          aria-label="Hide Navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
      <ul className="space-y-2 flex-1 overflow-y-auto min-h-0">
        {visibleItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === '/mapping-domain'} // Only exact match for mapping-domain
              onClick={(e) => {
                // Only close navigation on mobile (when window width < 768px)
                if (window.innerWidth < 768) {
                  onToggle()
                }
              }}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition text-sm md:text-base ${
                  isActive
                    ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
        
        {/* Settings Menu with Submenu */}
        {visibleSettingsItems.length > 0 && (
          <li>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`w-full flex items-center justify-between px-4 py-2 rounded transition text-sm md:text-base ${
                isSettingsActive
                  ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>Settings</span>
              <svg
                className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {settingsOpen && (
              <ul className="ml-4 mt-2 space-y-1">
                {visibleSettingsItems.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={(e) => {
                        // Only close navigation on mobile (when window width < 768px)
                        if (window.innerWidth < 768) {
                          onToggle()
                        }
                      }}
                      className={({ isActive }) =>
                        `block px-4 py-2 rounded transition text-sm md:text-base ${
                          isActive
                            ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )}
      </ul>
      {/* Theme Toggle Button at Bottom */}
      <div className="mt-auto pt-4 border-t border-gray-300 dark:border-gray-600 flex-shrink-0">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded transition text-sm md:text-base text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>
    </nav>
  )
}

export default LeftNavigator

