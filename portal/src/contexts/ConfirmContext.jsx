import { createContext, useContext, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

const ConfirmContext = createContext()

export function ConfirmProvider({ children }) {
  const [confirm, setConfirm] = useState(null)

  const showConfirm = (message, onConfirm, onCancel) => {
    return new Promise((resolve) => {
      setConfirm({
        message,
        onConfirm: () => {
          setConfirm(null)
          if (onConfirm) onConfirm()
          resolve(true)
        },
        onCancel: () => {
          setConfirm(null)
          if (onCancel) onCancel()
          resolve(false)
        },
      })
    })
  }

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={confirm.onCancel}
        />
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider')
  }
  return context
}

