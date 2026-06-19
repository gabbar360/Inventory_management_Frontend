import api from '../utils/api';

export const permissionService = {
  /**
   * Fetch all permissions from database
   */
  getAllPermissions: async () => {
    const response = await api.get('/permissions');
    return response.data.data.permissions;
  },

  /**
   * Fetch permissions bound to a specific role ID
   * @param id - Role ID
   */
  getRolePermissions: async (id: number) => {
    const response = await api.get(`/roles/${id}/permissions`);
    return response.data.data.permissions;
  },

  /**
   * Save updated permissions map for a role
   * @param id - Role ID
   * @param permissionIds - Array of checked permission IDs
   */
  updateRolePermissions: async (id: number, permissionIds: number[]) => {
    const response = await api.post(`/roles/${id}/permissions`, { permissionIds });
    return response.data.data.permissions;
  },
};

export default permissionService;
