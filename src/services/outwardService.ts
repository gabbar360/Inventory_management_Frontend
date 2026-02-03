import api from './api';
import { ApiResponse, OutwardInvoice, PaginationQuery } from '@/types';

export interface OutwardItemFormData {
  productId: string;
  stockBatchId: string;
  saleUnit: 'box' | 'piece';
  quantity: number;
  ratePerUnit: number;
}

export interface OutwardInvoiceFormData {
  invoiceNo: string;
  date: string;
  customerId: string;
  locationId: string;
  saleType: 'export' | 'domestic';
  expense: number;
  items: OutwardItemFormData[];
}

export const outwardService = {
  async getAll(params?: PaginationQuery): Promise<{ data: OutwardInvoice[]; pagination: any }> {
    const response = await api.get<ApiResponse<OutwardInvoice[]>>('/outward', { params });
    return {
      data: response.data.data!,
      pagination: response.data.pagination,
    };
  },

  async getById(id: string): Promise<OutwardInvoice> {
    const response = await api.get<ApiResponse<OutwardInvoice>>(`/outward/${id}`);
    return response.data.data!;
  },

  async create(data: OutwardInvoiceFormData): Promise<OutwardInvoice> {
    const response = await api.post<ApiResponse<OutwardInvoice>>('/outward', data);
    return response.data.data!;
  },

  async update(id: string, data: OutwardInvoiceFormData): Promise<OutwardInvoice> {
    const response = await api.put<ApiResponse<OutwardInvoice>>(`/outward/${id}`, data);
    return response.data.data!;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/outward/${id}`);
  },
};