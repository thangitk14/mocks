import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function LeftNavigator() {
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
    <nav className="w-64 bg-gray-800 text-white min-h-screen p-4">
      <h2 className="text-xl font-bold mb-6">Navigation</h2>
      <ul className="space-y-2">
        {visibleItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition ${
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

