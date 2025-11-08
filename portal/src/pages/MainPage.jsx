import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import LeftNavigator from '../components/LeftNavigator'

function MainPage() {
  const [showNavigation, setShowNavigation] = useState(true)

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex relative">
        {showNavigation && (
          <div className="relative">
            <LeftNavigator onToggle={() => setShowNavigation(false)} />
          </div>
        )}
        {!showNavigation && (
          <button
            onClick={() => setShowNavigation(!showNavigation)}
            className="fixed top-16 left-0 z-40 bg-gray-700 text-white px-3 py-2 rounded-r-md hover:bg-gray-600 transition-all duration-300 shadow-lg"
            aria-label="Show Navigation"
          >
            ▶
          </button>
        )}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainPage
