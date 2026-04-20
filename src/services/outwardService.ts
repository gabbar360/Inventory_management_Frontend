import api from '@/utils/api';
import { ApiResponse, OutwardInvoice, PaginationQuery } from '@/types';

export interface OutwardItemFormData {
  productId: string;
  stockBatchId: string;
  locationId: string;
  saleUnit: 'box' | 'pack' | 'piece';
  quantity: number;
  ratePerUnit: number;
}

export interface OutwardInvoiceFormData {
  invoiceNo: string;
  date: string;
  customerId: string;
  saleType: 'export' | 'domestic';
  expense: number;
  items: OutwardItemFormData[];
}

export const outwardService = {
  async getAll(
    params?: PaginationQuery
  ): Promise<{ data: OutwardInvoice[]; pagination: any }> {
    const response = await api.get<ApiResponse<OutwardInvoice[]>>('/getall-outward', {
      params,
    });
    return {
      data: response.data.data!,
      pagination: response.data.pagination,
    };
  },

  async getById(id: string): Promise<OutwardInvoice> {
    const response = await api.get<ApiResponse<OutwardInvoice>>(
      `/outward/${id}`
    );
    return response.data.data!;
  },

  async create(data: OutwardInvoiceFormData): Promise<OutwardInvoice> {
    const response = await api.post<ApiResponse<OutwardInvoice>>(
      '/add-outward',
      data
    );
    return response.data.data!;
  },

  async update(
    id: string,
    data: OutwardInvoiceFormData
  ): Promise<OutwardInvoice> {
    const response = await api.put<ApiResponse<OutwardInvoice>>(
      `/update-outward/${id}`,
      data
    );
    return response.data.data!;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/delete-outward/${id}`);
  },

  async generatePDF(id: string): Promise<Blob> {
    const response = await api.get(`/outward/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async getProfitLossData(startDate?: string, endDate?: string): Promise<any[]> {
    const response = await api.get<ApiResponse<any[]>>('/get-outward/reports/profit-loss', {
      params: { startDate, endDate },
    });
    return response.data.data!;
  },

  async generateProfitLossPDF(startDate?: string, endDate?: string): Promise<Blob> {
    const response = await api.get('/reports/profit-loss-pdf', {
      params: { startDate, endDate },
      responseType: 'blob',
    });
    return response.data;
  },

  async generateSingleInvoiceProfitLossPDF(invoiceId: string): Promise<Blob> {
    const response = await api.get(`/reports/profit-loss-pdf/${invoiceId}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
