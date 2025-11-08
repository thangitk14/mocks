import { useError } from '../contexts/ErrorContext'

function ErrorDialog() {
  const { error, hideError } = useError()

  if (!error) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-red-600">Lỗi</h3>
            <button
              onClick={hideError}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-gray-700">{error}</p>
          <div className="mt-6 flex justify-end">
            <button
              onClick={hideError}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorDialog

