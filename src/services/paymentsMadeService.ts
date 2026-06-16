import api from '@/utils/api';
import { ApiResponse, PaymentMade, PaginationQuery } from '@/types';

export interface PaymentMadeInvoiceInput {
  invoiceId: number;
  amountApplied: number;
}

export interface PaymentMadeFormData {
  paymentNumber: string;
  vendorId: string;
  amount: number;
  date: string;
  paymentMode: string;
  referenceNumber?: string | null;
  paidThrough: string;
  bankCharges?: number;
  notes?: string | null;
  transactionType: 'bill_payment' | 'vendor_advance';
  invoices: PaymentMadeInvoiceInput[];
}

export const paymentsMadeService = {
  async getAll(
    params?: PaginationQuery & { vendorId?: string; paymentMode?: string }
  ): Promise<{ data: PaymentMade[]; pagination: any }> {
    const response = await api.get<ApiResponse<PaymentMade[]>>('/getall-paymentsmade', {
      params,
    });
    return {
      data: response.data.data!,
      pagination: response.data.pagination,
    };
  },

  async getById(id: string | number): Promise<PaymentMade> {
    const response = await api.get<ApiResponse<PaymentMade>>(
      `/paymentsmade/${id}`
    );
    return response.data.data!;
  },

  async create(data: PaymentMadeFormData): Promise<PaymentMade> {
    const response = await api.post<ApiResponse<PaymentMade>>(
      '/add-paymentsmade',
      data
    );
    return response.data.data!;
  },

  async update(
    id: string | number,
    data: PaymentMadeFormData
  ): Promise<PaymentMade> {
    const response = await api.put<ApiResponse<PaymentMade>>(
      `/update-paymentsmade/${id}`,
      data
    );
    return response.data.data!;
  },

  async delete(id: string | number): Promise<void> {
    await api.delete(`/delete-paymentsmade/${id}`);
  },

  async generatePDF(id: string | number): Promise<Blob> {
    const response = await api.get(`/paymentsmade/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
