import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { roleService } from '../services/roleService';

export interface Role {
  id: number;
  name: string;
  description?: string;
  isSuperAdmin?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface RoleState {
  roles: Role[];
  currentRole: Role | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const initialState: RoleState = {
  roles: [],
  currentRole: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
};

// Async Thunks
export const fetchRoles = createAsyncThunk(
  'roles/fetchRoles',
  async ({ page = 1, limit = 10, search = '' }: { page?: number; limit?: number; search?: string }, { rejectWithValue }) => {
    try {
      const response = await roleService.getAllRoles(page, limit, search);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch roles');
    }
  }
);

export const fetchRoleById = createAsyncThunk(
  'roles/fetchRoleById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await roleService.getRoleById(id);
      return response.role;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch role');
    }
  }
);

export const createRole = createAsyncThunk(
  'roles/createRole',
  async (roleData: { name: string; description?: string; isSuperAdmin?: boolean; isActive?: boolean }, { rejectWithValue }) => {
    try {
      const response = await roleService.createRole(roleData);
      return response.role;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create role');
    }
  }
);

export const updateRole = createAsyncThunk(
  'roles/updateRole',
  async ({ id, data }: { id: number; data: Partial<Role> }, { rejectWithValue }) => {
    try {
      const response = await roleService.updateRole(id, data);
      return response.role;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update role');
    }
  }
);

export const deleteRole = createAsyncThunk(
  'roles/deleteRole',
  async (id: number, { rejectWithValue }) => {
    try {
      await roleService.deleteRole(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete role');
    }
  }
);

const roleSlice = createSlice({
  name: 'roles',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetRoles: (state) => {
      state.roles = [];
      state.currentRole = null;
      state.error = null;
      state.pagination = {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.roles = action.payload.roles;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchRoleById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoleById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRole = action.payload;
      })
      .addCase(fetchRoleById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRole.fulfilled, (state, action) => {
        state.loading = false;
        state.roles.unshift(action.payload);
      })
      .addCase(createRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateRole.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.roles.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.roles[index] = action.payload;
        }
        if (state.currentRole?.id === action.payload.id) {
          state.currentRole = action.payload;
        }
      })
      .addCase(updateRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.loading = false;
        state.roles = state.roles.filter((r) => r.id !== action.payload);
      })
      .addCase(deleteRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, resetRoles } = roleSlice.actions;
export default roleSlice.reducer;
