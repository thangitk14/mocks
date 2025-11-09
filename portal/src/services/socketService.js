import { io } from 'socket.io-client'

// Auto-detect Socket URL: use env variable, or detect from current domain, or fallback to localhost
const getSocketURL = () => {
  // If VITE_API_BASE_URL is explicitly set, use it
  if (import.meta.env.VITE_API_BASE_URL) {
    console.log('[Socket] Using VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL)
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // In production, try to detect Socket URL from current domain
  if (import.meta.env.MODE === 'production') {
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    
    // Nginx will proxy /socket.io requests to backend service
    // Use same domain and protocol (no port needed)
    const socketUrl = `${protocol}//${hostname}`
    console.log('[Socket] Production mode - detected Socket URL:', socketUrl)
    return socketUrl
  }
  
  // Development fallback
  console.log('[Socket] Development mode - using localhost:3000')
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

