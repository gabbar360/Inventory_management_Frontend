import api from '@/utils/api';
import { ApiResponse, Category, PaginationQuery } from '@/types';

export interface CategoryFormData {
  name: string;
  hsnCode: string;
  gstRate: number;
}

export const categoryService = {
  async getAll(
    params?: PaginationQuery
  ): Promise<{ data: Category[]; pagination: any }> {
    const response = await api.get<ApiResponse<Category[]>>('/get-categories', {
      params,
    });
    return {
      data: response.data.data!,
      pagination: response.data.pagination,
    };
  },

  async getById(id: string): Promise<Category> {
    const response = await api.get<ApiResponse<Category>>(`/get-categories/${id}`);
    return response.data.data!;
  },

  async create(data: CategoryFormData): Promise<Category> {
    const response = await api.post<ApiResponse<Category>>('/create-categories', data);
    return response.data.data!;
  },

  async update(id: string, data: Partial<CategoryFormData>): Promise<Category> {
    const response = await api.put<ApiResponse<Category>>(
      `/update-categories/${id}`,
      data
    );
    return response.data.data!;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/delete-categories/${id}`);
  },
};
