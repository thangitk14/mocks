import axios from 'axios'

// Auto-detect API URL: use env variable, or use service domain, or fallback to localhost
const getApiBaseURL = () => {
  // If VITE_API_BASE_URL is explicitly set, use it
  if (import.meta.env.VITE_API_BASE_URL) {
    console.log('[API] Using VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL)
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // In production, use service domain (sv.thangvnnc.io.vn)
  if (import.meta.env.MODE === 'production') {
    const protocol = window.location.protocol
    // Use service domain for API calls
    const serviceDomain = import.meta.env.VITE_SERVICE_DOMAIN || 'sv.thangvnnc.io.vn'
    const apiUrl = `${protocol}//${serviceDomain}`
    console.log('[API] Production mode - using service domain:', apiUrl)
    return apiUrl
  }
  
  // Development fallback
  console.log('[API] Development mode - using https://sv.thangvnnc.io.vn')
  return 'https://sv.thangvnnc.io.vn'
}

const apiBaseURL = getApiBaseURL()
console.log('[API] Initialized with baseURL:', apiBaseURL, 'Mode:', import.meta.env.MODE)

const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Log request for debugging
    if (import.meta.env.MODE === 'development' || import.meta.env.DEV) {
      console.log('[API Request]', config.method?.toUpperCase(), config.url, {
        baseURL: config.baseURL,
        data: config.data
      })
    }
    return config
  },
  (error) => {
    console.error('[API Request Error]', error)
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    // Log response for debugging
    if (import.meta.env.MODE === 'development' || import.meta.env.DEV) {
      console.log('[API Response]', response.config.method?.toUpperCase(), response.config.url, {
        status: response.status,
        data: response.data
      })
    }
    return response
  },
  (error) => {
    // Log error for debugging
    console.error('[API Error]', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      baseURL: error.config?.baseURL
    })
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

