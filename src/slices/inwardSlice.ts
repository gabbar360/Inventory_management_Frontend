import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { inwardService, InwardInvoiceFormData } from '@/services/inwardService';
import { InwardInvoice, PaginationQuery } from '@/types';

interface InwardState {
  invoices: InwardInvoice[];
  currentInvoice: InwardInvoice | null;
  pagination: any;
  loading: boolean;
  error: string | null;
}

const initialState: InwardState = {
  invoices: [],
  currentInvoice: null,
  pagination: null,
  loading: false,
  error: null,
};

export const fetchInwardInvoices = createAsyncThunk(
  'inward/fetchAll',
  async (params?: PaginationQuery) => {
    return await inwardService.getAll(params);
  }
);

export const fetchInwardInvoiceById = createAsyncThunk(
  'inward/fetchById',
  async (id: string) => {
    return await inwardService.getById(id);
  }
);

export const createInwardInvoice = createAsyncThunk(
  'inward/create',
  async (data: InwardInvoiceFormData) => {
    return await inwardService.create(data);
  }
);

export const updateInwardInvoice = createAsyncThunk(
  'inward/update',
  async ({ id, data }: { id: string; data: InwardInvoiceFormData }) => {
    return await inwardService.update(id, data);
  }
);

export const deleteInwardInvoice = createAsyncThunk(
  'inward/delete',
  async (id: string) => {
    await inwardService.delete(id);
    return id;
  }
);

const inwardSlice = createSlice({
  name: 'inward',
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
      .addCase(fetchInwardInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInwardInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchInwardInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inward invoices';
      })
      .addCase(fetchInwardInvoiceById.fulfilled, (state, action) => {
        state.currentInvoice = action.payload;
      })
      .addCase(createInwardInvoice.fulfilled, (state, action) => {
        state.invoices.push(action.payload);
      })
      .addCase(updateInwardInvoice.fulfilled, (state, action) => {
        const index = state.invoices.findIndex(
          (i) => i.id === action.payload.id
        );
        if (index !== -1) {
          state.invoices[index] = action.payload;
        }
      })
      .addCase(deleteInwardInvoice.fulfilled, (state, action) => {
        state.invoices = state.invoices.filter((i) => i.id !== action.payload);
      });
  },
});

export const { clearError, clearCurrentInvoice } = inwardSlice.actions;
export default inwardSlice.reducer;
