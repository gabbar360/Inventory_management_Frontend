import api from '@/utils/api';
import { Sample, ApiResponse, PaginationQuery } from '@/types';

export const sampleService = {
  getAll: async (params?: PaginationQuery): Promise<ApiResponse<Sample[]>> => {
    const response = await api.get('/getall-samples', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Sample>> => {
    const response = await api.get(`/get-samples/${id}`);
    return response.data;
  },

  create: async (data: Partial<Sample>): Promise<ApiResponse<Sample>> => {
    const response = await api.post('/add-samples', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Sample>): Promise<ApiResponse<Sample>> => {
    const response = await api.put(`/update-samples/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/delete-samples/${id}`);
    return response.data;
  },
};
