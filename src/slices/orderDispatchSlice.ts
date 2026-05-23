import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { orderDispatchService } from '@/services/orderDispatchService';
import { OrderDispatch } from '@/types';

interface OrderDispatchState {
  dispatches: OrderDispatch[];
  currentDispatch: OrderDispatch | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: OrderDispatchState = {
  dispatches: [],
  currentDispatch: null,
  loading: false,
  error: null,
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
};

export const fetchOrderDispatches = createAsyncThunk(
  'orderDispatch/fetchAll',
  async (params: { page?: number; limit?: number; search?: string; status?: string } = {}) => {
    const result = await orderDispatchService.getAll(params);
    return result;
  }
);

export const fetchOrderDispatchById = createAsyncThunk(
  'orderDispatch/fetchById',
  async (id: string | number) => {
    return await orderDispatchService.getById(id);
  }
);

export const fetchDispatchBySalesOrderId = createAsyncThunk(
  'orderDispatch/fetchBySalesOrderId',
  async (salesOrderId: string | number) => {
    return await orderDispatchService.getBySalesOrderId(salesOrderId);
  }
);

export const createOrderDispatch = createAsyncThunk(
  'orderDispatch/create',
  async (data: any) => {
    return await orderDispatchService.create(data);
  }
);

export const updateOrderDispatch = createAsyncThunk(
  'orderDispatch/update',
  async ({ id, data }: { id: string | number; data: any }) => {
    return await orderDispatchService.update(id, data);
  }
);

export const deleteOrderDispatch = createAsyncThunk(
  'orderDispatch/delete',
  async (id: string | number) => {
    await orderDispatchService.delete(id);
    return id;
  }
);

const orderDispatchSlice = createSlice({
  name: 'orderDispatch',
  initialState,
  reducers: {
    clearCurrentDispatch: (state) => {
      state.currentDispatch = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrderDispatches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderDispatches.fulfilled, (state, action) => {
        state.loading = false;
        state.dispatches = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchOrderDispatches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch dispatches';
      })

      .addCase(fetchOrderDispatchById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderDispatchById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDispatch = action.payload as any;
      })
      .addCase(fetchOrderDispatchById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch dispatch';
      })

      .addCase(fetchDispatchBySalesOrderId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDispatchBySalesOrderId.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDispatch = action.payload as any;
      })
      .addCase(fetchDispatchBySalesOrderId.rejected, (state) => {
        state.loading = false;
        state.error = null; // Don't show error if dispatch doesn't exist
      })

      .addCase(createOrderDispatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrderDispatch.fulfilled, (state, action) => {
        state.loading = false;
        state.dispatches.unshift(action.payload as any);
        state.currentDispatch = action.payload as any;
      })
      .addCase(createOrderDispatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create dispatch';
      })

      .addCase(updateOrderDispatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrderDispatch.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.dispatches.findIndex((d) => d.id === (action.payload as any).id);
        if (index !== -1) {
          state.dispatches[index] = action.payload as any;
        }
        state.currentDispatch = action.payload as any;
      })
      .addCase(updateOrderDispatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update dispatch';
      })

      .addCase(deleteOrderDispatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteOrderDispatch.fulfilled, (state, action) => {
        state.loading = false;
        state.dispatches = state.dispatches.filter((d) => d.id !== (action.payload as any));
        if (state.currentDispatch?.id === action.payload) {
          state.currentDispatch = null;
        }
      })
      .addCase(deleteOrderDispatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete dispatch';
      });
  },
});

export const { clearCurrentDispatch, clearError } = orderDispatchSlice.actions;
export default orderDispatchSlice.reducer;
