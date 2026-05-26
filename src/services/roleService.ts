import api from '../utils/api';

export const roleService = {
  getAllRoles: async (page = 1, limit = 10, search = '') => {
    const response = await api.get('/roles', {
      params: { page, limit, search }
    });
    return response.data.data;
  },

  getRoleById: async (id) => {
    const response = await api.get(`/roles/${id}`);
    return response.data.data;
  },

  createRole: async (roleData) => {
    const response = await api.post('/roles', roleData);
    return response.data.data;
  },

  updateRole: async (id, roleData) => {
    const response = await api.put(`/roles/${id}`, roleData);
    return response.data.data;
  },

  deleteRole: async (id) => {
    const response = await api.delete(`/roles/${id}`);
    return response.data.data;
  }
};
