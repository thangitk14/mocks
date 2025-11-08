import { io } from 'socket.io-client'

// Auto-detect Socket URL: use env variable, or detect from current domain, or fallback to localhost
const getSocketURL = () => {
  // If VITE_API_BASE_URL is explicitly set, use it
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // In production, use current origin (will be proxied by nginx)
  if (import.meta.env.MODE === 'production') {
    return window.location.origin
  }
  
  // Development fallback
  return 'http://localhost:3000'
}

const SOCKET_URL = getSocketURL()

let socket = null

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    socket.on('connect', () => {
      console.log('[Socket] Connected to server:', socket.id)
    })

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server')
    })

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error)
    })
  }

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
    console.log('[Socket] Disconnected')
  }
}

export const joinDomainRoom = (domainId) => {
  if (!socket) {
    console.warn('[Socket] Socket not initialized, cannot join room')
    return
  }
  
  if (socket.connected) {
    socket.emit('join-domain', domainId)
    console.log(`[Socket] Joined domain room: domain-${domainId}`)
  } else {
    // Wait for connection before joining
    socket.once('connect', () => {
      socket.emit('join-domain', domainId)
      console.log(`[Socket] Joined domain room after connection: domain-${domainId}`)
    })
    console.log(`[Socket] Waiting for connection before joining domain-${domainId}`)
  }
}

export const leaveDomainRoom = (domainId) => {
  if (socket && socket.connected) {
    socket.emit('leave-domain', domainId)
    console.log(`[Socket] Left domain room: domain-${domainId}`)
  }
}

export const getSocket = () => {
  return socket
}

