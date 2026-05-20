import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardService } from '@/services/dashboardService';
import {
  DashboardKPIs,
  RevenueChartData,
  TopProduct,
  TopCustomer,
} from '@/types';

interface DashboardState {
  kpis: DashboardKPIs | null;
  revenueChart: RevenueChartData[];
  topProducts: TopProduct[];
  topCustomers: TopCustomer[];
  inventoryAlerts: any;
  performanceMetrics: any;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  kpis: null,
  revenueChart: [],
  topProducts: [],
  topCustomers: [],
  inventoryAlerts: null,
  performanceMetrics: null,
  loading: false,
  error: null,
};

export const fetchKPIs = createAsyncThunk(
  'dashboard/fetchKPIs',
  async (params: { period?: 'week' | 'month' | 'year'; dateFrom?: string; dateTo?: string } = {}) => {
    const { period = 'month', dateFrom, dateTo } = params;
    return await dashboardService.getKPIs(period, dateFrom, dateTo);
  }
);

export const fetchRevenueChart = createAsyncThunk(
  'dashboard/fetchRevenueChart',
  async (params: { period?: 'week' | 'month' | 'year'; dateFrom?: string; dateTo?: string } = {}) => {
    const { period = 'month', dateFrom, dateTo } = params;
    return await dashboardService.getRevenueChart(period, dateFrom, dateTo);
  }
);

export const fetchTopProducts = createAsyncThunk(
  'dashboard/fetchTopProducts',
  async (params: { limit?: number; dateFrom?: string; dateTo?: string } = {}) => {
    const { limit = 10, dateFrom, dateTo } = params;
    return await dashboardService.getTopProducts(limit, dateFrom, dateTo);
  }
);

export const fetchTopCustomers = createAsyncThunk(
  'dashboard/fetchTopCustomers',
  async (params: { limit?: number; dateFrom?: string; dateTo?: string } = {}) => {
    const { limit = 10, dateFrom, dateTo } = params;
    return await dashboardService.getTopCustomers(limit, dateFrom, dateTo);
  }
);

export const fetchInventoryAlerts = createAsyncThunk(
  'dashboard/fetchInventoryAlerts',
  async () => {
    return await dashboardService.getInventoryAlerts();
  }
);

export const fetchPerformanceMetrics = createAsyncThunk(
  'dashboard/fetchPerformanceMetrics',
  async (params: { period?: 'week' | 'month' | 'year'; dateFrom?: string; dateTo?: string } = {}) => {
    const { period = 'month', dateFrom, dateTo } = params;
    return await dashboardService.getPerformanceMetrics(period, dateFrom, dateTo);
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchKPIs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchKPIs.fulfilled, (state, action) => {
        state.loading = false;
        state.kpis = action.payload;
      })
      .addCase(fetchKPIs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch KPIs';
      })
      .addCase(fetchRevenueChart.fulfilled, (state, action) => {
        state.revenueChart = action.payload;
      })
      .addCase(fetchTopProducts.fulfilled, (state, action) => {
        state.topProducts = action.payload;
      })
      .addCase(fetchTopCustomers.fulfilled, (state, action) => {
        state.topCustomers = action.payload;
      })
      .addCase(fetchInventoryAlerts.fulfilled, (state, action) => {
        state.inventoryAlerts = action.payload;
      })
      .addCase(fetchPerformanceMetrics.fulfilled, (state, action) => {
        state.performanceMetrics = action.payload;
      });
  },
});

export const { clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
