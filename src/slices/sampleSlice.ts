import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { sampleService } from '@/services/sampleService';
import { Sample, PaginationQuery } from '@/types';

interface SampleState {
  samples: Sample[];
  currentSample: Sample | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: SampleState = {
  samples: [],
  currentSample: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
};

export const fetchSamples = createAsyncThunk(
  'samples/fetchAll',
  async (params: PaginationQuery) => {
    const response = await sampleService.getAll(params);
    return response;
  }
);

export const fetchSampleById = createAsyncThunk(
  'samples/fetchById',
  async (id: string) => {
    const response = await sampleService.getById(id);
    return response;
  }
);

export const createSample = createAsyncThunk(
  'samples/create',
  async (data: Partial<Sample>) => {
    const response = await sampleService.create(data);
    return response;
  }
);

export const updateSample = createAsyncThunk(
  'samples/update',
  async ({ id, data }: { id: string; data: Partial<Sample> }) => {
    const response = await sampleService.update(id, data);
    return response;
  }
);

export const deleteSample = createAsyncThunk(
  'samples/delete',
  async (id: string) => {
    await sampleService.delete(id);
    return id;
  }
);

const sampleSlice = createSlice({
  name: 'samples',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSamples.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSamples.fulfilled, (state, action) => {
        state.loading = false;
        state.samples = action.payload.data || [];
        state.pagination = action.payload.pagination || initialState.pagination;
      })
      .addCase(fetchSamples.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch samples';
      })
      .addCase(createSample.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.data) {
          state.samples.unshift(action.payload.data);
        }
      })
      .addCase(updateSample.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.data) {
          const index = state.samples.findIndex(s => s.id === action.payload.data.id);
          if (index !== -1) {
            state.samples[index] = action.payload.data;
          }
        }
      })
      .addCase(deleteSample.fulfilled, (state, action) => {
        state.samples = state.samples.filter((s) => s.id !== action.payload);
      });
  },
});

export const { clearError } = sampleSlice.actions;
export default sampleSlice.reducer;
