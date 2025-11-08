import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import LeftNavigator from '../components/LeftNavigator'

function MainPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex">
        <LeftNavigator />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainPage
