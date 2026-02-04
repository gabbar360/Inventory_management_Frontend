import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { inventoryService, StockSummary } from '@/services/inventoryService';
import { StockBatch } from '@/types';

interface InventoryState {
  stockSummary: StockSummary[];
  availableStock: StockBatch[];
  loading: boolean;
  error: string | null;
}

const initialState: InventoryState = {
  stockSummary: [],
  availableStock: [],
  loading: false,
  error: null,
};

export const fetchStockSummary = createAsyncThunk(
  'inventory/fetchStockSummary',
  async (locationId?: string) => {
    return await inventoryService.getStockSummary(locationId);
  }
);

export const fetchAvailableStock = createAsyncThunk(
  'inventory/fetchAvailableStock',
  async ({
    productId,
    locationId,
  }: {
    productId: string;
    locationId?: string;
  }) => {
    return await inventoryService.getAvailableStock(productId, locationId);
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
        state.stockSummary = action.payload;
      })
      .addCase(fetchStockSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch stock summary';
      })
      .addCase(fetchAvailableStock.fulfilled, (state, action) => {
        state.availableStock = action.payload;
      });
  },
});

export const { clearError, clearAvailableStock } = inventorySlice.actions;
export default inventorySlice.reducer;
