import { createContext, useContext, useState } from 'react'

const ErrorContext = createContext()

export function ErrorProvider({ children }) {
  const [error, setError] = useState(null)

  const showError = (message) => {
    setError(message)
  }

  const hideError = () => {
    setError(null)
  }

  return (
    <ErrorContext.Provider value={{ error, showError, hideError }}>
      {children}
    </ErrorContext.Provider>
  )
}

export function useError() {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error('useError must be used within ErrorProvider')
  }
  return context
}

