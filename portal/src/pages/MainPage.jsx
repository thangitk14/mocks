import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import LeftNavigator from '../components/LeftNavigator'

function MainPage() {
  const [showNavigation, setShowNavigation] = useState(false)

  // Auto-hide navigation on mobile by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowNavigation(true)
      } else {
        setShowNavigation(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 flex flex-col overflow-hidden">
      <Header onToggleNav={() => setShowNavigation(!showNavigation)} />
      <div className="flex relative flex-1 overflow-hidden">
        {/* Navigation overlay for mobile, sidebar for desktop */}
        {showNavigation && (
          <>
            {/* Backdrop for mobile */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={() => setShowNavigation(false)}
            />
            {/* Navigation */}
            <div className="fixed md:relative inset-y-0 left-0 z-50 md:z-auto h-full overflow-hidden">
              <LeftNavigator onToggle={() => setShowNavigation(false)} />
            </div>
          </>
        )}
        {/* Show navigation button when hidden - only on desktop */}
        {!showNavigation && (
          <button
            onClick={() => setShowNavigation(!showNavigation)}
            className="hidden md:block fixed top-16 left-0 z-40 bg-gray-700 text-white px-3 py-2 rounded-r-md hover:bg-gray-600 transition-all duration-300 shadow-lg"
            aria-label="Show Navigation"
          >
            ▶
          </button>
        )}
        <main className="flex-1 p-4 md:p-6 w-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainPage
