import api from '../utils/api';

export const roleService = {
  getAllRoles: async (page = 1, limit = 10, search = '') => {
    const response = await api.get('/roles', {
      params: { page, limit, search }
    });
    return response.data.data;
  },

  getRoleById: async (id: number) => {
    const response = await api.get(`/roles/${id}`);
    return response.data.data;
  },

  createRole: async (roleData: any) => {
    const response = await api.post('/roles', roleData);
    return response.data.data;
  },

  updateRole: async (id: number, roleData: any) => {
    const response = await api.put(`/roles/${id}`, roleData);
    return response.data.data;
  },

  deleteRole: async (id: number) => {
    const response = await api.delete(`/roles/${id}`);
    return response.data.data;
  }
};
