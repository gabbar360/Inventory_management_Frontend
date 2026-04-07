import api from '@/utils/api';

export const notificationService = {
  getAll: async (page = 1, limit = 20) => {
    const response = await api.get('/notifications', {
      params: { page, limit },
    });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread/count');
    return response.data;
  },

  markAsRead: async (id: number) => {
    const response = await api.put(`/notifications/${id}/read`, {});
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/read/all', {});
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },

  deleteAll: async () => {
    const response = await api.delete('/notifications/delete/all');
    return response.data;
  },
};
