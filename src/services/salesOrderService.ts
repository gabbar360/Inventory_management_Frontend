import api from '@/utils/api';
import { SalesOrder } from '@/types';

export const salesOrderService = {
  getAll: async (params?: any) => {
    const response = await api.get('/sales-orders', { params });
    return response.data;
  },

  getById: async (id: string | number) => {
    const response = await api.get(`/sales-orders/${id}`);
    return response.data.data;
  },

  create: async (data: any): Promise<SalesOrder> => {
    const response = await api.post('/sales-orders', data);
    return response.data.data;
  },

  update: async (id: string | number, data: any): Promise<SalesOrder> => {
    const response = await api.put(`/sales-orders/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string | number) => {
    await api.delete(`/sales-orders/${id}`);
  },

  convertFromQuote: async (quoteId: string | number): Promise<SalesOrder> => {
    const response = await api.post(`/sales-orders/convert-from-quote/${quoteId}`);
    return response.data.data;
  },

  convertSalesOrderToInvoice: async (id: string | number, items: { salesOrderItemId: string; stockBatchId: string; saleUnit: string }[]): Promise<any> => {
    const response = await api.post(`/sales-orders/${id}/convert-to-invoice`, { items });
    return response.data.data;
  },

  downloadPDF: async (id: string | number): Promise<Blob> => {
    const response = await api.get(`/sales-orders/${id}/pdf`, { responseType: 'blob' });
    return response.data;
  },
};
