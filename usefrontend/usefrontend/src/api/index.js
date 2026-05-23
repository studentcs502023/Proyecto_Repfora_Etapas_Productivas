// API Service Layer
// Standardized Axios instance with interceptors for JWT and error handling
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Standardized error handling
api.interceptors.response.use(
  (response) => response.data, // Return only the data part of the response
  (error) => {
    const message = error.response?.data?.message || 'Error de conexión con el servidor';
    
    // Handle 401 Unauthorized (Token expired or invalid)
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Use window.location only if not handled by a router guard elsewhere
      // window.location.href = '/login';
    }

    return Promise.reject({
      message,
      status: error.response?.status,
      errors: error.response?.data?.errors || null
    });
  }
);

export default api;
