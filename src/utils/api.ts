import axios, { AxiosResponse } from 'axios';
import { ApiResponse } from '@/types';
import { store } from '@/store/store';
import { refreshToken as refreshTokenAction } from '@/slices/authSlice';


const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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
  async (error) => {
    const originalRequest = error.config;

    // Don't retry for these endpoints
    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh-token')
    ) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'An error occurred';
      return Promise.reject(errorMessage);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('🔄 Access token expired, refreshing...');
        await store.dispatch(refreshTokenAction()).unwrap();
        console.log('✅ Token refreshed successfully');
        processQueue(null, null);
        return api(originalRequest);
      } catch (refreshError) {
        console.log('❌ Token refresh failed, logging out');
        processQueue(refreshError, null);
        // Clear auth state and redirect
        if (!originalRequest.url?.includes('/auth/me')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Extract error message from response
    const errorMessage = error.response?.data?.error || error.response?.data?.message || 'An error occurred';
    
    // Return error with message for handling in components
    return Promise.reject(errorMessage);
  }
);

export default api;
