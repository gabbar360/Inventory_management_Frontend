import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { settingsService } from '@/services/settingsService';

export interface Settings {
  id?: number;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite?: string;
  companyGstin: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  bankAddress: string;
  swiftCode?: string;

  // Number Series
  customerPrefix?: string;
  customerMiddle?: string;
  customerSuffix?: string;
  customerPadding?: number;
  customerCurrent?: number;

  vendorPrefix?: string;
  vendorMiddle?: string;
  vendorSuffix?: string;
  vendorPadding?: number;
  vendorCurrent?: number;

  poPrefix?: string;
  poMiddle?: string;
  poSuffix?: string;
  poPadding?: number;
  poCurrent?: number;

  quotePrefix?: string;
  quoteMiddle?: string;
  quoteSuffix?: string;
  quotePadding?: number;
  quoteCurrent?: number;

  salesOrderPrefix?: string;
  salesOrderMiddle?: string;
  salesOrderSuffix?: string;
  salesOrderPadding?: number;
  salesOrderCurrent?: number;

  invoicePrefix?: string;
  invoiceMiddle?: string;
  invoiceSuffix?: string;
  invoicePadding?: number;
  invoiceCurrent?: number;

  createdAt?: string;
  updatedAt?: string;
}

interface SettingsState {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  settings: null,
  loading: false,
  error: null,
};

export const fetchSettings = createAsyncThunk(
  'settings/fetch',
  async () => {
    const response = await settingsService.getSettings();
    return response;
  }
);

export const updateSettings = createAsyncThunk(
  'settings/update',
  async (data: Partial<Settings>) => {
    const response = await settingsService.updateSettings(data);
    return response;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload.data || action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch settings';
      })
      .addCase(updateSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload.data || action.payload;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update settings';
      });
  },
});

export const { clearError } = settingsSlice.actions;
export default settingsSlice.reducer;