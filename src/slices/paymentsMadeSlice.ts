import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  paymentsMadeService,
  PaymentMadeFormData,
} from '@/services/paymentsMadeService';
import { PaymentMade, PaginationQuery } from '@/types';

interface PaymentsMadeState {
  payments: PaymentMade[];
  currentPayment: PaymentMade | null;
  pagination: any;
  loading: boolean;
  error: string | null;
}

const initialState: PaymentsMadeState = {
  payments: [],
  currentPayment: null,
  pagination: null,
  loading: false,
  error: null,
};

export const fetchPaymentsMade = createAsyncThunk(
  'paymentsMade/fetchAll',
  async (params?: PaginationQuery & { vendorId?: string; paymentMode?: string }) => {
    return await paymentsMadeService.getAll(params);
  }
);

export const fetchPaymentMadeById = createAsyncThunk(
  'paymentsMade/fetchById',
  async (id: string | number) => {
    return await paymentsMadeService.getById(id);
  }
);

export const createPaymentMade = createAsyncThunk(
  'paymentsMade/create',
  async (data: PaymentMadeFormData) => {
    return await paymentsMadeService.create(data);
  }
);

export const updatePaymentMade = createAsyncThunk(
  'paymentsMade/update',
  async ({ id, data }: { id: string | number; data: PaymentMadeFormData }) => {
    return await paymentsMadeService.update(id, data);
  }
);

export const deletePaymentMade = createAsyncThunk(
  'paymentsMade/delete',
  async (id: string | number) => {
    await paymentsMadeService.delete(id);
    return id;
  }
);

const paymentsMadeSlice = createSlice({
  name: 'paymentsMade',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentPayment: (state) => {
      state.currentPayment = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPaymentsMade.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentsMade.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPaymentsMade.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch payments made';
      })
      .addCase(fetchPaymentMadeById.fulfilled, (state, action) => {
        state.currentPayment = action.payload;
      })
      .addCase(createPaymentMade.fulfilled, (state, action) => {
        state.payments.push(action.payload);
      })
      .addCase(updatePaymentMade.fulfilled, (state, action) => {
        const index = state.payments.findIndex(
          (p) => p.id === action.payload.id
        );
        if (index !== -1) {
          state.payments[index] = action.payload;
        }
      })
      .addCase(deletePaymentMade.fulfilled, (state, action) => {
        state.payments = state.payments.filter((p) => p.id !== action.payload);
      });
  },
});

export const { clearError, clearCurrentPayment } = paymentsMadeSlice.actions;
export default paymentsMadeSlice.reducer;
