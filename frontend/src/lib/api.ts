import axios from 'axios';

// Set base URL - will be proxied through Vite config
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
export const isDemoMode = import.meta.env.VITE_USE_DEMO_DATA !== 'false';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 2500,
});

// Add request interceptor for auth token
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (token && !config.url?.includes('/auth/')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for token refresh on 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh token endpoint
        const response = await axiosInstance.post('/auth/refresh');
        const { token } = response.data;

        // Update auth token for future requests
        localStorage.setItem('token', token);

        // Retry original request with new token
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh token failed, logout user
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Dispatch logout from zustand store if available
        originalRequest._retry = true; // Prevent infinite loop
        throw refreshError;
      }
    }

    return Promise.reject(error);
  }
);

// Export axiosInstance as named export for use in other modules
export { axiosInstance };

// Default export also for convenience
export default axiosInstance;