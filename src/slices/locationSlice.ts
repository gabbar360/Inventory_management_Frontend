import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { locationService, LocationFormData } from '@/services/locationService';
import { Location, PaginationQuery } from '@/types';

interface LocationState {
  locations: Location[];
  currentLocation: Location | null;
  pagination: any;
  loading: boolean;
  error: string | null;
}

const initialState: LocationState = {
  locations: [],
  currentLocation: null,
  pagination: null,
  loading: false,
  error: null,
};

export const fetchLocations = createAsyncThunk(
  'locations/fetchAll',
  async (params?: PaginationQuery) => {
    return await locationService.getAll(params);
  }
);

export const fetchLocationById = createAsyncThunk(
  'locations/fetchById',
  async (id: string) => {
    return await locationService.getById(id);
  }
);

export const createLocation = createAsyncThunk(
  'locations/create',
  async (data: LocationFormData) => {
    return await locationService.create(data);
  }
);

export const updateLocation = createAsyncThunk(
  'locations/update',
  async ({ id, data }: { id: string; data: Partial<LocationFormData> }) => {
    return await locationService.update(id, data);
  }
);

export const deleteLocation = createAsyncThunk(
  'locations/delete',
  async (id: string) => {
    await locationService.delete(id);
    return id;
  }
);

const locationSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentLocation: (state) => {
      state.currentLocation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch locations';
      })
      .addCase(fetchLocationById.fulfilled, (state, action) => {
        state.currentLocation = action.payload;
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        state.locations.push(action.payload);
      })
      .addCase(updateLocation.fulfilled, (state, action) => {
        const index = state.locations.findIndex(
          (l) => l.id === action.payload.id
        );
        if (index !== -1) {
          state.locations[index] = action.payload;
        }
      })
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.locations = state.locations.filter(
          (l) => l.id !== action.payload
        );
      });
  },
});

export const { clearError, clearCurrentLocation } = locationSlice.actions;
export default locationSlice.reducer;
