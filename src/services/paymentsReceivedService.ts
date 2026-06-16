import api from '@/utils/api';
import { ApiResponse, PaymentReceived, PaginationQuery } from '@/types';

export interface PaymentReceivedInvoiceInput {
  invoiceId: number;
  amountApplied: number;
}

export interface PaymentReceivedFormData {
  paymentNumber: string;
  customerId: string;
  amount: number;
  date: string;
  paymentMode: string;
  referenceNumber?: string | null;
  depositTo: string;
  bankCharges?: number;
  taxRate?: number;
  notes?: string | null;
  transactionType: 'invoice_payment' | 'customer_advance';
  invoices: PaymentReceivedInvoiceInput[];
}

export const paymentsReceivedService = {
  async getAll(
    params?: PaginationQuery & { customerId?: string; paymentMode?: string }
  ): Promise<{ data: PaymentReceived[]; pagination: any }> {
    const response = await api.get<ApiResponse<PaymentReceived[]>>('/getall-paymentsreceived', {
      params,
    });
    return {
      data: response.data.data!,
      pagination: response.data.pagination,
    };
  },

  async getById(id: string | number): Promise<PaymentReceived> {
    const response = await api.get<ApiResponse<PaymentReceived>>(
      `/paymentsreceived/${id}`
    );
    return response.data.data!;
  },

  async create(data: PaymentReceivedFormData): Promise<PaymentReceived> {
    const response = await api.post<ApiResponse<PaymentReceived>>(
      '/add-paymentsreceived',
      data
    );
    return response.data.data!;
  },

  async update(
    id: string | number,
    data: PaymentReceivedFormData
  ): Promise<PaymentReceived> {
    const response = await api.put<ApiResponse<PaymentReceived>>(
      `/update-paymentsreceived/${id}`,
      data
    );
    return response.data.data!;
  },

  async delete(id: string | number): Promise<void> {
    await api.delete(`/delete-paymentsreceived/${id}`);
  },

  async applyCredits(data: { customerId: number; allocations: { paymentReceivedId: number; invoiceId: number; amountToApply: number }[]; date: string }): Promise<PaymentReceived> {
    const response = await api.post<ApiResponse<PaymentReceived>>('/paymentsreceived/apply-credits', data);
    return response.data.data!;
  },

  async generatePDF(id: string | number): Promise<Blob> {
    const response = await api.get(`/paymentsreceived/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
