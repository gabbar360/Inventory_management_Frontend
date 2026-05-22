import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { salesOrderService } from '@/services/salesOrderService';
import { SalesOrder } from '@/types';

interface SalesOrderState {
  orders: SalesOrder[];
  pagination: any;
  loading: boolean;
  error: string | null;
}

const initialState: SalesOrderState = {
  orders: [],
  pagination: null,
  loading: false,
  error: null,
};

export const fetchSalesOrders = createAsyncThunk('salesOrders/fetchAll', async (params?: any) => {
  return await salesOrderService.getAll(params);
});

export const createSalesOrder = createAsyncThunk('salesOrders/create', async (data: any) => {
  return await salesOrderService.create(data);
});

export const updateSalesOrder = createAsyncThunk('salesOrders/update', async ({ id, data }: { id: string; data: any }) => {
  return await salesOrderService.update(id, data);
});

export const deleteSalesOrder = createAsyncThunk('salesOrders/delete', async (id: string) => {
  await salesOrderService.delete(id);
  return id;
});

export const convertQuoteToSalesOrder = createAsyncThunk('salesOrders/convertFromQuote', async (quoteId: string | number) => {
  return await salesOrderService.convertFromQuote(quoteId);
});

export const convertSalesOrderToInvoice = createAsyncThunk(
  'salesOrders/convertToInvoice',
  async ({ id, items }: { id: string; items: { salesOrderItemId: string; stockBatchId: string; saleUnit: string }[] }, { rejectWithValue }) => {
    try {
      return await salesOrderService.convertSalesOrderToInvoice(id, items);
    } catch (e: any) {
      return rejectWithValue(e?.response?.data?.error || e.message || 'Failed to convert');
    }
  }
);

const salesOrderSlice = createSlice({
  name: 'salesOrders',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalesOrders.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSalesOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchSalesOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch sales orders';
      })
      .addCase(createSalesOrder.fulfilled, (state, action) => { state.orders.unshift(action.payload); })
      .addCase(updateSalesOrder.fulfilled, (state, action) => {
        const idx = state.orders.findIndex((o) => o.id === action.payload.id);
        if (idx !== -1) state.orders[idx] = action.payload;
      })
      .addCase(deleteSalesOrder.fulfilled, (state, action) => {
        state.orders = state.orders.filter((o) => o.id !== action.payload);
      })
      .addCase(convertQuoteToSalesOrder.pending, (state) => { state.loading = true; })
      .addCase(convertQuoteToSalesOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.orders.unshift(action.payload);
      })
      .addCase(convertQuoteToSalesOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to convert quote';
      });
  },
});

export const { clearError } = salesOrderSlice.actions;
export default salesOrderSlice.reducer;
