import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { inventoryService, StockSummary } from '@/services/inventoryService';
import { StockBatch } from '@/types';

interface InventoryState {
  stockSummary: StockSummary[];
  availableStock: StockBatch[];
  lowStockItems: any[];
  globalStats: {
    totalStockValue: number;
    totalProducts: number;
    lowStockItemsCount: number;
  } | null;
  pagination: any;
  loading: boolean;
  reportDownloading: boolean;
  error: string | null;
}

const initialState: InventoryState = {
  stockSummary: [],
  availableStock: [],
  lowStockItems: [],
  globalStats: null,
  pagination: null,
  loading: false,
  reportDownloading: false,
  error: null,
};

export const fetchStockSummary = createAsyncThunk(
  'inventory/fetchStockSummary',
  async ({ page, limit, locationId, search }: { page?: number; limit?: number; locationId?: string; search?: string } = {}) => {
    return await inventoryService.getStockSummary(page, limit, locationId, search);
  }
);

export const fetchAvailableStock = createAsyncThunk(
  'inventory/fetchAvailableStock',
  async ({
    productId,
    locationId,
    includeIds,
  }: {
    productId: string;
    locationId?: string;
    includeIds?: string[];
  }) => {
    return await inventoryService.getAvailableStock(productId, locationId, includeIds);
  }
);

export const downloadStockReport = createAsyncThunk(
  'inventory/downloadStockReport',
  async ({ locationId, reportType }: { locationId?: string; reportType: 'location' | 'all' }) => {
    const blob = await inventoryService.downloadStockReportPDF(locationId, reportType);
    
    // Open PDF in new window (inline view like quote)
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    return { locationId, reportType };
  }
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearAvailableStock: (state) => {
      state.availableStock = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStockSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStockSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.stockSummary = action.payload?.data || [];
        state.lowStockItems = action.payload?.lowStockItems || [];
        state.globalStats = action.payload?.globalStats || null;
        state.pagination = action.payload?.pagination || null;
      })
      .addCase(fetchStockSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch stock summary';
      })
      .addCase(fetchAvailableStock.fulfilled, (state, action) => {
        state.availableStock = action.payload || [];
      })
      .addCase(downloadStockReport.pending, (state) => {
        state.reportDownloading = true;
        state.error = null;
      })
      .addCase(downloadStockReport.fulfilled, (state) => {
        state.reportDownloading = false;
      })
      .addCase(downloadStockReport.rejected, (state, action) => {
        state.reportDownloading = false;
        state.error = action.error.message || 'Failed to download report';
      });
  },
});

export const { clearError, clearAvailableStock } = inventorySlice.actions;
export default inventorySlice.reducer;
