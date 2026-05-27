import api from '@/utils/api';
import { PurchaseOrder } from '@/types';

export const purchaseOrderService = {
  getAll: async (params?: any) => {
    const response = await api.get('/purchase-orders', { params });
    return response.data;
  },

  getById: async (id: string | number) => {
    const response = await api.get(`/purchase-orders/${id}`);
    return response.data.data;
  },

  create: async (data: any): Promise<PurchaseOrder> => {
    const response = await api.post('/purchase-orders', data);
    return response.data.data;
  },

  update: async (id: string | number, data: any): Promise<PurchaseOrder> => {
    const response = await api.put(`/purchase-orders/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string | number) => {
    await api.delete(`/purchase-orders/${id}`);
  },

  downloadPDF: async (id: string | number): Promise<Blob> => {
    const response = await api.get(`/purchase-orders/${id}/pdf`, { responseType: 'blob' });
    return response.data;
  },
};
