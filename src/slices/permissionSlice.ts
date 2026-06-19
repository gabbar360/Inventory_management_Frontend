import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { permissionService } from '../services/permissionService';

export interface Permission {
  id: number;
  slug: string;
  name: string;
  module: string;
  action: string;
}

interface PermissionState {
  allPermissions: Permission[];
  rolePermissions: Permission[];
  loading: boolean;
  error: string | null;
}

const initialState: PermissionState = {
  allPermissions: [],
  rolePermissions: [],
  loading: false,
  error: null,
};

// Async Thunk to fetch all master permissions
export const fetchMasterPermissions = createAsyncThunk(
  'permissions/fetchMasterPermissions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await permissionService.getAllPermissions();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch master permissions list');
    }
  }
);

// Async Thunk to fetch permissions linked to a role
export const fetchRolePermissions = createAsyncThunk(
  'permissions/fetchRolePermissions',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await permissionService.getRolePermissions(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch role permissions');
    }
  }
);

// Async Thunk to synchronize role permissions
export const syncRolePermissions = createAsyncThunk(
  'permissions/syncRolePermissions',
  async ({ id, permissionIds }: { id: number; permissionIds: number[] }, { rejectWithValue }) => {
    try {
      const response = await permissionService.updateRolePermissions(id, permissionIds);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to synchronize role permissions');
    }
  }
);

const permissionSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    clearPermissionError: (state) => {
      state.error = null;
    },
    resetPermissionState: (state) => {
      state.allPermissions = [];
      state.rolePermissions = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Master Permissions
      .addCase(fetchMasterPermissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMasterPermissions.fulfilled, (state, action) => {
        state.loading = false;
        state.allPermissions = action.payload;
      })
      .addCase(fetchMasterPermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch permissions list';
      })

      // Fetch Role Permissions
      .addCase(fetchRolePermissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRolePermissions.fulfilled, (state, action) => {
        state.loading = false;
        state.rolePermissions = action.payload;
      })
      .addCase(fetchRolePermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch role permissions';
      })

      // Sync Role Permissions
      .addCase(syncRolePermissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(syncRolePermissions.fulfilled, (state, action) => {
        state.loading = false;
        state.rolePermissions = action.payload;
      })
      .addCase(syncRolePermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to sync role permissions';
      });
  },
});

export const { clearPermissionError, resetPermissionState } = permissionSlice.actions;
export default permissionSlice.reducer;
