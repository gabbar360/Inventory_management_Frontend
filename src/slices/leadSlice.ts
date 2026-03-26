import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { leadService } from '@/services/leadService';
import { Lead, PaginationQuery } from '@/types';

interface LeadState {
  leads: Lead[];
  pagination: any;
  loading: boolean;
  error: string | null;
}

const initialState: LeadState = {
  leads: [],
  pagination: null,
  loading: false,
  error: null,
};

export const fetchLeads = createAsyncThunk(
  'leads/fetchAll',
  async (params?: PaginationQuery) => {
    return await leadService.getAll(params);
  }
);

export const updateLead = createAsyncThunk(
  'leads/update',
  async ({ id, data }: { id: string; data: Partial<Pick<Lead, 'status'>> }) => {
    return await leadService.update(id, data);
  }
);

export const deleteLead = createAsyncThunk(
  'leads/delete',
  async (id: string) => {
    await leadService.delete(id);
    return id;
  }
);

const leadSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeads.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.loading = false;
        state.leads = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchLeads.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch leads';
      })
      .addCase(updateLead.fulfilled, (state, action) => {
        const index = state.leads.findIndex((l) => l.id === action.payload.id);
        if (index !== -1) state.leads[index] = action.payload;
      })
      .addCase(deleteLead.fulfilled, (state, action) => {
        state.leads = state.leads.filter((l) => l.id !== action.payload);
      });
  },
});

export const { clearError } = leadSlice.actions;
export default leadSlice.reducer;
