import api from '@/utils/api';
import { ApiResponse, InwardInvoice, PaginationQuery } from '@/types';

export interface InwardItemFormData {
  productId: string;
  boxes: number;
  packPerBox: number;
  packPerPiece: number;
  ratePerBox: number;
}

export interface InwardInvoiceFormData {
  invoiceNo: string;
  date: string;
  vendorId: string;
  locationId: string;
  items: InwardItemFormData[];
}

export const inwardService = {
  async getAll(
    params?: PaginationQuery
  ): Promise<{ data: InwardInvoice[]; pagination: any }> {
    const response = await api.get<ApiResponse<InwardInvoice[]>>('/getall-inward', {
      params,
    });
    return {
      data: response.data.data!,
      pagination: response.data.pagination,
    };
  },

  async getById(id: string): Promise<InwardInvoice> {
    const response = await api.get<ApiResponse<InwardInvoice>>(`/get-inward/${id}`);
    return response.data.data!;
  },

  async create(data: InwardInvoiceFormData): Promise<InwardInvoice> {
    const response = await api.post<ApiResponse<InwardInvoice>>(
      '/add-inward',
      data
    );
    return response.data.data!;
  },

  async update(
    id: string,
    data: InwardInvoiceFormData
  ): Promise<InwardInvoice> {
    const response = await api.put<ApiResponse<InwardInvoice>>(
      `/update-inward/${id}`,
      data
    );
    return response.data.data!;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/delete-inward/${id}`);
  },
};
