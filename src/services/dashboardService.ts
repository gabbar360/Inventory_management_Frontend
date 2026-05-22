import api from '@/utils/api';
import {
  ApiResponse,
  DashboardKPIs,
  RevenueChartData,
  TopProduct,
  TopCustomer,
} from '@/types';

export const dashboardService = {
  async getKPIs(
    period: 'week' | 'month' | 'year' = 'month',
    dateFrom?: string,
    dateTo?: string,
    location?: string,
    category?: string,
    vendor?: string,
    customer?: string
  ): Promise<DashboardKPIs> {
    const response = await api.get<ApiResponse<DashboardKPIs>>(
      '/dashboard/kpis',
      {
        params: { period, dateFrom, dateTo, location, category, vendor, customer },
      }
    );
    return response.data.data!;
  },

  async getRevenueChart(
    period: 'week' | 'month' | 'year' = 'month',
    dateFrom?: string,
    dateTo?: string,
    location?: string,
    category?: string,
    vendor?: string,
    customer?: string
  ): Promise<RevenueChartData[]> {
    const response = await api.get<ApiResponse<RevenueChartData[]>>(
      '/dashboard/revenue-chart',
      {
        params: { period, dateFrom, dateTo, location, category, vendor, customer },
      }
    );
    return response.data.data!;
  },

  async getTopProducts(limit: number = 10, dateFrom?: string, dateTo?: string, location?: string, category?: string, vendor?: string, customer?: string): Promise<TopProduct[]> {
    const response = await api.get<ApiResponse<TopProduct[]>>(
      '/dashboard/top-products',
      {
        params: { limit, dateFrom, dateTo, location, category, vendor, customer },
      }
    );
    return response.data.data!;
  },

  async getTopCustomers(limit: number = 10, dateFrom?: string, dateTo?: string, location?: string, category?: string, vendor?: string, customer?: string): Promise<TopCustomer[]> {
    const response = await api.get<ApiResponse<TopCustomer[]>>(
      '/dashboard/top-customers',
      {
        params: { limit, dateFrom, dateTo, location, category, vendor, customer },
      }
    );
    return response.data.data!;
  },

  async getInventoryAlerts(): Promise<any> {
    const response = await api.get<ApiResponse<any>>(
      '/dashboard/inventory-alerts'
    );
    return response.data.data!;
  },

  async getPerformanceMetrics(
    period: 'week' | 'month' | 'year' = 'month',
    dateFrom?: string,
    dateTo?: string,
    location?: string,
    category?: string,
    vendor?: string,
    customer?: string
  ): Promise<any> {
    const response = await api.get<ApiResponse<any>>(
      '/dashboard/performance-metrics',
      {
        params: { period, dateFrom, dateTo, location, category, vendor, customer },
      }
    );
    return response.data.data!;
  },
};
