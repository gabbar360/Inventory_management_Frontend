import api from '@/utils/api';
import { ApiResponse, Vendor, PaginationQuery } from '@/types';

export interface VendorFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export const vendorService = {
  async getAll(
    params?: PaginationQuery
  ): Promise<{ data: Vendor[]; pagination: any }> {
    const response = await api.get<ApiResponse<Vendor[]>>('/vendors', {
      params,
    });
    return {
      data: response.data.data!,
      pagination: response.data.pagination,
    };
  },

  async getById(id: string): Promise<Vendor> {
    const response = await api.get<ApiResponse<Vendor>>(`/vendors/${id}`);
    return response.data.data!;
  },

  async create(data: VendorFormData): Promise<Vendor> {
    const response = await api.post<ApiResponse<Vendor>>('/vendors', data);
    return response.data.data!;
  },

  async update(id: string, data: Partial<VendorFormData>): Promise<Vendor> {
    const response = await api.put<ApiResponse<Vendor>>(`/vendors/${id}`, data);
    return response.data.data!;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/vendors/${id}`);
  },
};
