// Base API client for BorgDash
import axios, { AxiosResponse, AxiosError } from 'axios';

// API Configuration - Use relative URLs for single-container deployment
// This works from any hostname/IP since frontend and backend are on same origin
const API_BASE_URL = '/api';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    } else if (error.response && error.response.status === 404) {
      // Not found
      console.warn('Resource not found:', error.config?.url);
    } else if (error.response && error.response.status >= 500) {
      // Server error
      console.error('Server error:', error.response?.data);
    }
    return Promise.reject(error);
  }
);

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

// Generic API methods
export const api = {
  get: <T>(url: string): Promise<T> => 
    apiClient.get<T>(url).then(response => response.data),
  
  post: <T>(url: string, data?: any): Promise<T> =>
    apiClient.post<T>(url, data).then(response => response.data),
  
  put: <T>(url: string, data?: any): Promise<T> =>
    apiClient.put<T>(url, data).then(response => response.data),
  
  delete: <T>(url: string): Promise<T> =>
    apiClient.delete<T>(url).then(response => response.data),
};