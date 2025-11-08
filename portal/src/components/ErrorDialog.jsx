import { useError } from '../contexts/ErrorContext'

function ErrorDialog() {
  const { error, hideError } = useError()

  if (!error) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={hideError}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Error</h3>
            <button
              onClick={hideError}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl transition"
            >
              ×
            </button>
          </div>
          <p className="text-gray-700 dark:text-gray-300">{error}</p>
          <div className="mt-6 flex justify-end">
            <button
              onClick={hideError}
              className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorDialog

