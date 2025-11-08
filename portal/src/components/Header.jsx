import { useAuth } from '../contexts/AuthContext'

function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="bg-white shadow-md h-16 flex items-center justify-between px-6">
      <h1 className="text-2xl font-bold text-gray-800">Portal System</h1>
      <div className="flex items-center gap-4">
        {user && (
          <>
            <span className="text-gray-600">Xin chào, {user.name || user.username}</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              Đăng xuất
            </button>
          </>
        )}
      </div>
    </header>
  )
}

export default Header

