import api from '@/utils/api';

export interface OrderDispatch {
  id: number;
  dispatchNo: string;
  salesOrderId: number;
  dispatchDate: string;
  status: 'pending' | 'dispatched' | 'in_transit' | 'delivered' | 'cancelled';
  shippingMethod: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  shippingCountry: string;
  weight?: number;
  dimensions?: string;
  packageCount: number;
  shippingCost: number;
  insuranceAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  salesOrder?: any;
}

export const orderDispatchService = {
  getAll: async (params?: any) => {
    const response = await api.get('/order-dispatches', { params });
    return response.data;
  },

  getById: async (id: string | number) => {
    const response = await api.get(`/order-dispatches/${id}`);
    return response.data.data;
  },

  create: async (data: any): Promise<OrderDispatch> => {
    const response = await api.post('/order-dispatches', data);
    return response.data.data;
  },

  update: async (id: string | number, data: any): Promise<OrderDispatch> => {
    const response = await api.put(`/order-dispatches/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string | number) => {
    await api.delete(`/order-dispatches/${id}`);
  },

  getBySalesOrderId: async (salesOrderId: string | number): Promise<OrderDispatch | null> => {
    try {
      const response = await api.get(`/order-dispatches/sales-order/${salesOrderId}`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  downloadPDF: async (id: string | number): Promise<Blob> => {
    const response = await api.get(`/order-dispatches/${id}/pdf`, { responseType: 'blob' });
    return response.data;
  },
};
