import api from '@/utils/api';
import { ApiResponse, Location, PaginationQuery } from '@/types';

export interface LocationFormData {
  name: string;
  address?: string;
}

export const locationService = {
  async getAll(
    params?: PaginationQuery
  ): Promise<{ data: Location[]; pagination: any }> {
    const response = await api.get<ApiResponse<Location[]>>('/locations', {
      params,
    });
    return {
      data: response.data.data!,
      pagination: response.data.pagination,
    };
  },

  async getById(id: string): Promise<Location> {
    const response = await api.get<ApiResponse<Location>>(`/locations/${id}`);
    return response.data.data!;
  },

  async create(data: LocationFormData): Promise<Location> {
    const response = await api.post<ApiResponse<Location>>('/locations', data);
    return response.data.data!;
  },

  async update(id: string, data: Partial<LocationFormData>): Promise<Location> {
    const response = await api.put<ApiResponse<Location>>(
      `/locations/${id}`,
      data
    );
    return response.data.data!;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/locations/${id}`);
  },
};
