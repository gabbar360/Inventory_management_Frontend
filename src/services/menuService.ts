import api from '@/utils/api';
import { ApiResponse, MenuItem } from '@/types';

export const menuService = {
  /**
   * Fetch dynamic permission-filtered sidebar menus from the database
   */
  async getSidebarMenu(): Promise<MenuItem[]> {
    const response = await api.get<ApiResponse<{ menu: MenuItem[] }>>('/menus/sidebar');
    return response.data.data!.menu;
  },

  async getAllMenus(): Promise<MenuItem[]> {
    const response = await api.get<ApiResponse<{ menus: MenuItem[] }>>('/menus');
    return response.data.data!.menus;
  },

  async createMenu(menuData: any): Promise<MenuItem> {
    const response = await api.post<ApiResponse<{ menu: MenuItem }>>('/menus', menuData);
    return response.data.data!.menu;
  },

  async updateMenu(id: number, menuData: any): Promise<MenuItem> {
    const response = await api.put<ApiResponse<{ menu: MenuItem }>>(`/menus/${id}`, menuData);
    return response.data.data!.menu;
  },

  async deleteMenu(id: number): Promise<void> {
    await api.delete(`/menus/${id}`);
  },
};

export default menuService;
