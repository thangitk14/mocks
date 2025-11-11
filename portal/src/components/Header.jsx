import { useAuth } from '../contexts/AuthContext'

function Header({ onToggleNav }) {
  const { user } = useAuth()

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md h-16 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onToggleNav}
          className="md:hidden text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white p-2"
          aria-label="Toggle Navigation"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg md:text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        {user && (
          <span className="text-sm md:text-base text-gray-600 dark:text-gray-300 hidden sm:inline">
            Hello, {user?.user?.name || user?.user?.username}
          </span>
        )}
      </div>
    </header>
  )
}

export default Header

