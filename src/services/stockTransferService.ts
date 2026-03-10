import api from '@/utils/api';
import { ApiResponse } from '@/types';

export const transferStock = async (data: {
  stockBatchId: number;
  toLocationId: number;
  boxes: number;
  packs?: number;
  pieces?: number;
  remarks?: string;
}) => {
  const response = await api.post<ApiResponse<{ message: string; transferNo: string }>>(
    '/transfer',
    data
  );
  return response.data;
};

export const getTransferHistory = async (params?: { page?: number; limit?: number }) => {
  const response = await api.get<ApiResponse<any>>('/history', { params });
  return response.data;
};
