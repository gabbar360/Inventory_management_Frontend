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
  profitLossData: any[];
  profitLossLoading: boolean;
  profitLossError: string | null;
  productWiseProfitLossData: any[];
  productWiseProfitLossLoading: boolean;
  productWiseProfitLossError: string | null;
}

const initialState: OutwardState = {
  invoices: [],
  currentInvoice: null,
  pagination: null,
  loading: false,
  error: null,
  profitLossData: [],
  profitLossLoading: false,
  profitLossError: null,
  productWiseProfitLossData: [],
  productWiseProfitLossLoading: false,
  productWiseProfitLossError: null,
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

export const fetchProfitLossData = createAsyncThunk(
  'outward/fetchProfitLossData',
  async ({ startDate, endDate }: { startDate?: string; endDate?: string }) => {
    return await outwardService.getProfitLossData(startDate, endDate);
  }
);

export const generateProfitLossPDF = createAsyncThunk(
  'outward/generateProfitLossPDF',
  async ({ startDate, endDate }: { startDate?: string; endDate?: string }) => {
    const blob = await outwardService.generateProfitLossPDF(startDate, endDate);
    return blob;
  }
);

export const generateInvoicePDF = createAsyncThunk(
  'outward/generateInvoicePDF',
  async (id: string) => {
    const blob = await outwardService.generatePDF(id);
    return blob;
  }
);

export const generateSingleInvoiceProfitLossPDF = createAsyncThunk(
  'outward/generateSingleInvoiceProfitLossPDF',
  async (invoiceId: string) => {
    const blob = await outwardService.generateSingleInvoiceProfitLossPDF(invoiceId);
    return blob;
  }
);

export const fetchProductWiseProfitLossData = createAsyncThunk(
  'outward/fetchProductWiseProfitLossData',
  async ({ startDate, endDate }: { startDate?: string; endDate?: string }) => {
    return await outwardService.getProductWiseProfitLossData(startDate, endDate);
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
      })
      .addCase(fetchProfitLossData.pending, (state) => {
        state.profitLossLoading = true;
        state.profitLossError = null;
      })
      .addCase(fetchProfitLossData.fulfilled, (state, action) => {
        state.profitLossLoading = false;
        state.profitLossData = action.payload;
      })
      .addCase(fetchProfitLossData.rejected, (state, action) => {
        state.profitLossLoading = false;
        state.profitLossError =
          action.error.message || 'Failed to fetch profit-loss data';
      })
      .addCase(generateProfitLossPDF.pending, (state) => {
        state.profitLossLoading = true;
        state.profitLossError = null;
      })
      .addCase(generateProfitLossPDF.fulfilled, (state) => {
        state.profitLossLoading = false;
      })
      .addCase(generateProfitLossPDF.rejected, (state, action) => {
        state.profitLossLoading = false;
        state.profitLossError =
          action.error.message || 'Failed to generate PDF';
      })
      .addCase(generateInvoicePDF.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateInvoicePDF.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(generateInvoicePDF.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to generate PDF';
      })
      .addCase(generateSingleInvoiceProfitLossPDF.pending, (state) => {
        state.profitLossLoading = true;
        state.profitLossError = null;
      })
      .addCase(generateSingleInvoiceProfitLossPDF.fulfilled, (state) => {
        state.profitLossLoading = false;
      })
      .addCase(generateSingleInvoiceProfitLossPDF.rejected, (state, action) => {
        state.profitLossLoading = false;
        state.profitLossError = action.error.message || 'Failed to generate PDF';
      })
      .addCase(fetchProductWiseProfitLossData.pending, (state) => {
        state.productWiseProfitLossLoading = true;
        state.productWiseProfitLossError = null;
      })
      .addCase(fetchProductWiseProfitLossData.fulfilled, (state, action) => {
        state.productWiseProfitLossLoading = false;
        state.productWiseProfitLossData = action.payload;
      })
      .addCase(fetchProductWiseProfitLossData.rejected, (state, action) => {
        state.productWiseProfitLossLoading = false;
        state.productWiseProfitLossError =
          action.error.message || 'Failed to fetch product-wise profit-loss data';
      });
  },
});

export const { clearError, clearCurrentInvoice } = outwardSlice.actions;
export default outwardSlice.reducer;
