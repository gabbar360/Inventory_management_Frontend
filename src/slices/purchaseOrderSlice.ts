import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { purchaseOrderService } from '@/services/purchaseOrderService';
import { PurchaseOrder } from '@/types';

interface PurchaseOrderState {
  orders: PurchaseOrder[];
  pagination: any;
  loading: boolean;
  error: string | null;
}

const initialState: PurchaseOrderState = {
  orders: [],
  pagination: null,
  loading: false,
  error: null,
};

export const fetchPurchaseOrders = createAsyncThunk('purchaseOrders/fetchAll', async (params?: any) => {
  return await purchaseOrderService.getAll(params);
});

export const fetchPurchaseOrderById = createAsyncThunk('purchaseOrders/fetchById', async (id: string) => {
  return await purchaseOrderService.getById(id);
});

export const createPurchaseOrder = createAsyncThunk('purchaseOrders/create', async (data: any) => {
  return await purchaseOrderService.create(data);
});

export const updatePurchaseOrder = createAsyncThunk('purchaseOrders/update', async ({ id, data }: { id: string; data: any }) => {
  return await purchaseOrderService.update(id, data);
});

export const deletePurchaseOrder = createAsyncThunk('purchaseOrders/delete', async (id: string) => {
  await purchaseOrderService.delete(id);
  return id;
});

export const downloadPurchaseOrderPDF = createAsyncThunk('purchaseOrders/downloadPDF', async (id: string | number, { rejectWithValue }) => {
  try {
    const blob = await purchaseOrderService.downloadPDF(id);
    
    if (blob.type !== 'application/pdf') {
      const text = await blob.text();
      return rejectWithValue('Invalid PDF received from server: ' + text.substring(0, 200));
    }
    
    if (blob.size === 0) {
      return rejectWithValue('PDF file is empty');
    }
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
    
    window.URL.revokeObjectURL(url);
    return id;
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to download PDF');
  }
});

const purchaseOrderSlice = createSlice({
  name: 'purchaseOrders',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPurchaseOrders.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPurchaseOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPurchaseOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch purchase orders';
      })
      .addCase(fetchPurchaseOrderById.fulfilled, (state, action) => {
        const idx = state.orders.findIndex((o) => o.id === action.payload.id);
        if (idx !== -1) {
          state.orders[idx] = action.payload;
        }
      })
      .addCase(createPurchaseOrder.fulfilled, (state, action) => { state.orders.unshift(action.payload); })
      .addCase(updatePurchaseOrder.fulfilled, (state, action) => {
        const idx = state.orders.findIndex((o) => o.id === action.payload.id);
        if (idx !== -1) state.orders[idx] = action.payload;
      })
      .addCase(deletePurchaseOrder.fulfilled, (state, action) => {
        state.orders = state.orders.filter((o) => o.id !== action.payload);
      });
  },
});

export const { clearError } = purchaseOrderSlice.actions;
export default purchaseOrderSlice.reducer;
