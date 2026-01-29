import api from './api';
import { ApiResponse } from '@/types';

export interface BulkUploadResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}

export const bulkUploadService = {
  async uploadCategories(file: File): Promise<BulkUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<ApiResponse<BulkUploadResult>>('/bulk-upload/categories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data!;
  },

  async uploadProducts(file: File): Promise<BulkUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<ApiResponse<BulkUploadResult>>('/bulk-upload/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data!;
  },

  async uploadVendors(file: File): Promise<BulkUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<ApiResponse<BulkUploadResult>>('/bulk-upload/vendors', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data!;
  },

  async uploadCustomers(file: File): Promise<BulkUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<ApiResponse<BulkUploadResult>>('/bulk-upload/customers', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data!;
  },

  async uploadLocations(file: File): Promise<BulkUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<ApiResponse<BulkUploadResult>>('/bulk-upload/locations', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data!;
  },

  async uploadInward(file: File): Promise<BulkUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<ApiResponse<BulkUploadResult>>('/bulk-upload/inward', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data!;
  },

  async uploadOutward(file: File): Promise<BulkUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<ApiResponse<BulkUploadResult>>('/bulk-upload/outward', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data!;
  },

  async downloadTemplate(type: 'categories' | 'products' | 'vendors' | 'customers' | 'locations' | 'inward' | 'outward'): Promise<Blob> {
    const response = await api.get(`/bulk-upload/template/${type}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportData(type: 'categories' | 'products' | 'vendors' | 'customers' | 'locations' | 'inward' | 'outward'): Promise<Blob> {
    const response = await api.get(`/bulk-upload/export/${type}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};