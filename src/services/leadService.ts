import api from '@/utils/api';
import { ApiResponse, Lead, PaginationQuery } from '@/types';

export interface CreateLeadData {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  country?: string;
  message?: string;
  formType?: string;
}

export const leadService = {
  async getAll(params?: PaginationQuery): Promise<{ data: Lead[]; pagination: any }> {
    const response = await api.get<ApiResponse<Lead[]>>('/getall-leads', { params });
    return { data: response.data.data!, pagination: response.data.pagination };
  },

  async getById(id: string): Promise<Lead> {
    const response = await api.get<ApiResponse<Lead>>(`/get-leads/${id}`);
    return response.data.data!;
  },

  async create(data: CreateLeadData): Promise<Lead> {
    const response = await api.post<ApiResponse<Lead>>('/create-lead', data);
    return response.data.data!;
  },

  async update(id: string, data: Partial<Pick<Lead, 'status'>>): Promise<Lead> {
    const response = await api.put<ApiResponse<Lead>>(`/update-leads/${id}`, data);
    return response.data.data!;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/delete-leads/${id}`);
  },
};
