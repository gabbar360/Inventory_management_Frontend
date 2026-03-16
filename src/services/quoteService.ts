import api from '@/utils/api';

export const quoteService = {
  createQuote: async (data: any) => {
    const response = await api.post('/quotes', data);
    return response.data.data || response.data;
  },

  getQuotes: async (filters?: any) => {
    const response = await api.get('/quotes', { params: filters });
    return response.data.data || response.data;
  },

  getQuoteById: async (id: string | number) => {
    const response = await api.get(`/quotes/${id}`);
    return response.data.data || response.data;
  },

  updateQuote: async (id: string | number, data: any) => {
    const response = await api.put(`/quotes/${id}`, data);
    return response.data.data || response.data;
  },

  updateQuoteItems: async (id: string | number, items: any[]) => {
    const response = await api.put(`/quotes/${id}/items`, { items });
    return response.data.data || response.data;
  },

  deleteQuote: async (id: string | number) => {
    const response = await api.delete(`/quotes/${id}`);
    return response.data;
  },

  downloadQuotePDF: async (id: string | number) => {
    const response = await api.get(`/quotes/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
