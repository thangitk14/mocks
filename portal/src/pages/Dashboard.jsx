import { useAuth } from '../contexts/AuthContext'

function Dashboard() {
  const { user } = useAuth()
  const profile = user?.user;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">User information</h3>
          <div className="space-y-2 text-gray-700">
            <p><span className="font-medium">Name:</span> {profile?.name || 'N/A'}</p>
            <p><span className="font-medium">Username:</span> {profile?.username || 'N/A'}</p>
            <p><span className="font-medium">ID:</span> {profile?.id || 'N/A'}</p>
          </div>
        </div>
        
        {user?.roles && user.roles.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Your roles</h3>
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <span
                  key={role.id}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {role.name} ({role.code})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

