import { useAuth } from '../contexts/AuthContext'

function Header({ onToggleNav }) {
  const { user, logout } = useAuth()

  return (
    <header className="bg-white shadow-md h-16 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onToggleNav}
          className="md:hidden text-gray-600 hover:text-gray-800 p-2"
          aria-label="Toggle Navigation"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg md:text-2xl font-bold text-gray-800">Portal System</h1>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        {user && (
          <>
            <span className="text-sm md:text-base text-gray-600 hidden sm:inline">
              Hello, {user?.user?.name || user?.user?.username}
            </span>
            <button
              onClick={logout}
              className="px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  )
}

export default Header

