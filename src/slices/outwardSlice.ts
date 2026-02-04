import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  outwardService,
  OutwardInvoiceFormData,
} from '@/services/outwardService';
import { OutwardInvoice, PaginationQuery } from '@/types';

interface OutwardState {
  invoices: OutwardInvoice[];
  currentInvoice: OutwardInvoice | null;
  pagination: any;
  loading: boolean;
  error: string | null;
}

const initialState: OutwardState = {
  invoices: [],
  currentInvoice: null,
  pagination: null,
  loading: false,
  error: null,
};

export const fetchOutwardInvoices = createAsyncThunk(
  'outward/fetchAll',
  async (params?: PaginationQuery) => {
    return await outwardService.getAll(params);
  }
);

export const fetchOutwardInvoiceById = createAsyncThunk(
  'outward/fetchById',
  async (id: string) => {
    return await outwardService.getById(id);
  }
);

export const createOutwardInvoice = createAsyncThunk(
  'outward/create',
  async (data: OutwardInvoiceFormData) => {
    return await outwardService.create(data);
  }
);

export const updateOutwardInvoice = createAsyncThunk(
  'outward/update',
  async ({ id, data }: { id: string; data: OutwardInvoiceFormData }) => {
    return await outwardService.update(id, data);
  }
);

export const deleteOutwardInvoice = createAsyncThunk(
  'outward/delete',
  async (id: string) => {
    await outwardService.delete(id);
    return id;
  }
);

const outwardSlice = createSlice({
  name: 'outward',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentInvoice: (state) => {
      state.currentInvoice = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOutwardInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOutwardInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchOutwardInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || 'Failed to fetch outward invoices';
      })
      .addCase(fetchOutwardInvoiceById.fulfilled, (state, action) => {
        state.currentInvoice = action.payload;
      })
      .addCase(createOutwardInvoice.fulfilled, (state, action) => {
        state.invoices.push(action.payload);
      })
      .addCase(updateOutwardInvoice.fulfilled, (state, action) => {
        const index = state.invoices.findIndex(
          (i) => i.id === action.payload.id
        );
        if (index !== -1) {
          state.invoices[index] = action.payload;
        }
      })
      .addCase(deleteOutwardInvoice.fulfilled, (state, action) => {
        state.invoices = state.invoices.filter((i) => i.id !== action.payload);
      });
  },
});

export const { clearError, clearCurrentInvoice } = outwardSlice.actions;
export default outwardSlice.reducer;
