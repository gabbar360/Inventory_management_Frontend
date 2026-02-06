import api from '@/utils/api';
import { ApiResponse, Product, PaginationQuery } from '@/types';

export interface ProductFormData {
  name: string;
  grade?: string;
  categoryId: string;
}

export const productService = {
  async getAll(
    params?: PaginationQuery
  ): Promise<{ data: Product[]; pagination: any }> {
    const response = await api.get<ApiResponse<Product[]>>('/products', {
      params,
    });
    return {
      data: response.data.data!,
      pagination: response.data.pagination,
    };
  },

  async getById(id: string): Promise<Product> {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data.data!;
  },

  async create(data: ProductFormData): Promise<Product> {
    const response = await api.post<ApiResponse<Product>>('/products', data);
    return response.data.data!;
  },

  async update(id: string, data: Partial<ProductFormData>): Promise<Product> {
    const response = await api.put<ApiResponse<Product>>(
      `/products/${id}`,
      data
    );
    return response.data.data!;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },
};
