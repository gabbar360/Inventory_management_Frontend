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
    const response = await api.get<ApiResponse<Customer[]>>('/customers', {
      params,
    });
    return {
      data: response.data.data!,
      pagination: response.data.pagination,
    };
  },

  async getById(id: string): Promise<Customer> {
    const response = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
    return response.data.data!;
  },

  async create(data: CustomerFormData): Promise<Customer> {
    const response = await api.post<ApiResponse<Customer>>('/customers', data);
    return response.data.data!;
  },

  async update(id: string, data: Partial<CustomerFormData>): Promise<Customer> {
    const response = await api.put<ApiResponse<Customer>>(
      `/customers/${id}`,
      data
    );
    return response.data.data!;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/customers/${id}`);
  },
};
