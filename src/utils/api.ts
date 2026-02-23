import axios, { AxiosResponse } from 'axios';
import { ApiResponse } from '@/types';
import toast from 'react-hot-toast';

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
      // Don't redirect on /auth/me failure
      if (!error.config?.url?.includes('/auth/me')) {
        window.location.href = '/login';
      }
    }

    // Don't show toast for /auth/me failures
    if (!error.config?.url?.includes('/auth/me')) {
      const message = error.response?.data?.error || 'An error occurred';
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;
