import api from '../utils/api';

export const userService = {
  getAllUsers: async (page = 1, limit = 10, search = '') => {
    const response = await api.get('/users', {
      params: { page, limit, search }
    });
    return response.data.data;
  },

  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data.data;
  },

  changePassword: async (id, newPassword) => {
    const response = await api.post(`/users/${id}/change-password`, { newPassword });
    return response.data.data;
  }
};
