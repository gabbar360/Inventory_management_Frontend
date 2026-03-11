import api from '@/utils/api';
import { Settings } from '@/slices/settingsSlice';

export const settingsService = {
  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data;
  },

  updateSettings: async (data: Partial<Settings>) => {
    const response = await api.put('/settings', data);
    return response.data;
  },
};