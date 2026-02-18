import api from '@/utils/api';
import { ApiResponse, Customer, PaginationQuery } from '@/types';

export interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export const customerService = {
  async getAll(
    params?: PaginationQuery
  ): Promise<{ data: Customer[]; pagination: any }> {
    const response = await api.get<ApiResponse<Customer[]>>('/getall-customers', {
      params,
    });
    return {
      data: response.data.data!,
      pagination: response.data.pagination,
    };
  },

  async getById(id: string): Promise<Customer> {
    const response = await api.get<ApiResponse<Customer>>(`/get-customers/${id}`);
    return response.data.data!;
  },

  async create(data: CustomerFormData): Promise<Customer> {
    const response = await api.post<ApiResponse<Customer>>('/add-customers', data);
    return response.data.data!;
  },

  async update(id: string, data: Partial<CustomerFormData>): Promise<Customer> {
    const response = await api.put<ApiResponse<Customer>>(
      `/update-customers/${id}`,
      data
    );
    return response.data.data!;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/delete-customers/${id}`);
  },
};
