import api from './api';
import { ApiResponse, DashboardKPIs, RevenueChartData, TopProduct, TopCustomer } from '@/types';

export const dashboardService = {
  async getKPIs(period: 'week' | 'month' | 'year' = 'month'): Promise<DashboardKPIs> {
    const response = await api.get<ApiResponse<DashboardKPIs>>('/dashboard/kpis', {
      params: { period },
    });
    return response.data.data!;
  },

  async getRevenueChart(period: 'week' | 'month' | 'year' = 'month'): Promise<RevenueChartData[]> {
    const response = await api.get<ApiResponse<RevenueChartData[]>>('/dashboard/revenue-chart', {
      params: { period },
    });
    return response.data.data!;
  },

  async getTopProducts(limit: number = 10): Promise<TopProduct[]> {
    const response = await api.get<ApiResponse<TopProduct[]>>('/dashboard/top-products', {
      params: { limit },
    });
    return response.data.data!;
  },

  async getTopCustomers(limit: number = 10): Promise<TopCustomer[]> {
    const response = await api.get<ApiResponse<TopCustomer[]>>('/dashboard/top-customers', {
      params: { limit },
    });
    return response.data.data!;
  },

  async getInventoryAlerts(): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/dashboard/inventory-alerts');
    return response.data.data!;
  },
};