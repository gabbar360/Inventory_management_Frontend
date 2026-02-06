import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { vendorService, VendorFormData } from '@/services/vendorService';
import { Vendor, PaginationQuery } from '@/types';

interface VendorState {
  vendors: Vendor[];
  currentVendor: Vendor | null;
  pagination: any;
  loading: boolean;
  error: string | null;
}

const initialState: VendorState = {
  vendors: [],
  currentVendor: null,
  pagination: null,
  loading: false,
  error: null,
};

export const fetchVendors = createAsyncThunk(
  'vendors/fetchAll',
  async (params?: PaginationQuery) => {
    return await vendorService.getAll(params);
  }
);

export const fetchVendorById = createAsyncThunk(
  'vendors/fetchById',
  async (id: string) => {
    return await vendorService.getById(id);
  }
);

export const createVendor = createAsyncThunk(
  'vendors/create',
  async (data: VendorFormData) => {
    return await vendorService.create(data);
  }
);

export const updateVendor = createAsyncThunk(
  'vendors/update',
  async ({ id, data }: { id: string; data: Partial<VendorFormData> }) => {
    return await vendorService.update(id, data);
  }
);

export const deleteVendor = createAsyncThunk(
  'vendors/delete',
  async (id: string) => {
    await vendorService.delete(id);
    return id;
  }
);

const vendorSlice = createSlice({
  name: 'vendors',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentVendor: (state) => {
      state.currentVendor = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.loading = false;
        state.vendors = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch vendors';
      })
      .addCase(fetchVendorById.fulfilled, (state, action) => {
        state.currentVendor = action.payload;
      })
      .addCase(createVendor.fulfilled, (state, action) => {
        state.vendors.push(action.payload);
      })
      .addCase(updateVendor.fulfilled, (state, action) => {
        const index = state.vendors.findIndex(
          (v) => v.id === action.payload.id
        );
        if (index !== -1) {
          state.vendors[index] = action.payload;
        }
      })
      .addCase(deleteVendor.fulfilled, (state, action) => {
        state.vendors = state.vendors.filter((v) => v.id !== action.payload);
      });
  },
});

export const { clearError, clearCurrentVendor } = vendorSlice.actions;
export default vendorSlice.reducer;
