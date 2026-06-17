import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  paymentsReceivedService,
  PaymentReceivedFormData,
} from '@/services/paymentsReceivedService';
import { PaymentReceived, PaginationQuery } from '@/types';

interface PaymentsReceivedState {
  payments: PaymentReceived[];
  currentPayment: PaymentReceived | null;
  pagination: any;
  loading: boolean;
  error: string | null;
}

const initialState: PaymentsReceivedState = {
  payments: [],
  currentPayment: null,
  pagination: null,
  loading: false,
  error: null,
};

export const fetchPaymentsReceived = createAsyncThunk(
  'paymentsReceived/fetchAll',
  async (params?: PaginationQuery & { customerId?: string; paymentMode?: string; unusedCreditsOnly?: boolean | string }) => {
    return await paymentsReceivedService.getAll(params);
  }
);

export const fetchPaymentReceivedById = createAsyncThunk(
  'paymentsReceived/fetchById',
  async (id: string | number) => {
    return await paymentsReceivedService.getById(id);
  }
);

export const createPaymentReceived = createAsyncThunk(
  'paymentsReceived/create',
  async (data: PaymentReceivedFormData) => {
    return await paymentsReceivedService.create(data);
  }
);

export const updatePaymentReceived = createAsyncThunk(
  'paymentsReceived/update',
  async ({ id, data }: { id: string | number; data: PaymentReceivedFormData }) => {
    return await paymentsReceivedService.update(id, data);
  }
);

export const deletePaymentReceived = createAsyncThunk(
  'paymentsReceived/delete',
  async (id: string | number) => {
    await paymentsReceivedService.delete(id);
    return id;
  }
);

const paymentsReceivedSlice = createSlice({
  name: 'paymentsReceived',
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
      .addCase(fetchPaymentsReceived.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentsReceived.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPaymentsReceived.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch payments received';
      })
      .addCase(fetchPaymentReceivedById.fulfilled, (state, action) => {
        state.currentPayment = action.payload;
      })
      .addCase(createPaymentReceived.fulfilled, (state, action) => {
        state.payments.push(action.payload);
      })
      .addCase(updatePaymentReceived.fulfilled, (state, action) => {
        const index = state.payments.findIndex(
          (p) => p.id === action.payload.id
        );
        if (index !== -1) {
          state.payments[index] = action.payload;
        }
      })
      .addCase(deletePaymentReceived.fulfilled, (state, action) => {
        state.payments = state.payments.filter((p) => p.id !== action.payload);
      });
  },
});

export const { clearError, clearCurrentPayment } = paymentsReceivedSlice.actions;
export default paymentsReceivedSlice.reducer;
