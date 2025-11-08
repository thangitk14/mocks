import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function LeftNavigator({ onToggle }) {
  const { hasPermission } = useAuth()

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      permission: null, // No permission required
    },
    {
      path: '/roles',
      label: 'Roles',
      permission: '/roles/*',
    },
    {
      path: '/role-user',
      label: 'RoleUser',
      permission: '/role_user/*',
    },
    {
      path: '/users',
      label: 'Users',
      permission: '/users/*',
    },
  ]

  const visibleItems = navItems.filter((item) =>
    !item.permission || hasPermission(item.permission)
  )

  return (
    <nav className="w-64 md:w-64 bg-gray-800 text-white min-h-screen p-4 relative shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg md:text-xl font-bold">Navigation</h2>
        <button
          onClick={onToggle}
          className="md:hidden text-gray-300 hover:text-white hover:bg-gray-700 px-2 py-1 rounded transition"
          aria-label="Hide Navigation"
        >
          ×
        </button>
        <button
          onClick={onToggle}
          className="hidden md:block text-gray-300 hover:text-white hover:bg-gray-700 px-2 py-1 rounded transition"
          aria-label="Hide Navigation"
        >
          ◀
        </button>
      </div>
      <ul className="space-y-2">
        {visibleItems.map((item) => (
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
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default LeftNavigator

