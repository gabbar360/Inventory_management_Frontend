import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { customerService, CustomerFormData } from '@/services/customerService';
import { Customer, PaginationQuery } from '@/types';

interface CustomerState {
  customers: Customer[];
  currentCustomer: Customer | null;
  pagination: any;
  loading: boolean;
  error: string | null;
}

const initialState: CustomerState = {
  customers: [],
  currentCustomer: null,
  pagination: null,
  loading: false,
  error: null,
};

export const fetchCustomers = createAsyncThunk(
  'customers/fetchAll',
  async (params?: PaginationQuery) => {
    return await customerService.getAll(params);
  }
);

export const fetchCustomerById = createAsyncThunk(
  'customers/fetchById',
  async (id: string) => {
    return await customerService.getById(id);
  }
);

export const createCustomer = createAsyncThunk(
  'customers/create',
  async (data: CustomerFormData) => {
    return await customerService.create(data);
  }
);

export const updateCustomer = createAsyncThunk(
  'customers/update',
  async ({ id, data }: { id: string; data: Partial<CustomerFormData> }) => {
    return await customerService.update(id, data);
  }
);

export const deleteCustomer = createAsyncThunk(
  'customers/delete',
  async (id: string) => {
    await customerService.delete(id);
    return id;
  }
);

const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentCustomer: (state) => {
      state.currentCustomer = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch customers';
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.currentCustomer = action.payload;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.customers.push(action.payload);
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        const index = state.customers.findIndex(
          (c) => c.id === action.payload.id
        );
        if (index !== -1) {
          state.customers[index] = action.payload;
        }
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.customers = state.customers.filter(
          (c) => c.id !== action.payload
        );
      });
  },
});

export const { clearError, clearCurrentCustomer } = customerSlice.actions;
export default customerSlice.reducer;
