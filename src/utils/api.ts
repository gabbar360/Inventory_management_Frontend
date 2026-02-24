import axios, { AxiosResponse } from 'axios';
import { ApiResponse } from '@/types';


const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect on /auth/me or /auth/login failure
      if (!error.config?.url?.includes('/auth/me') && !error.config?.url?.includes('/auth/login')) {
        window.location.href = '/login';
      }
    }

    // Extract error message from response
    const errorMessage = error.response?.data?.error || error.response?.data?.message || 'An error occurred';
    
    // Return error with message for handling in components
    return Promise.reject(errorMessage);
  }
);

export default api;
