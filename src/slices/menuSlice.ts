import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { menuService } from '../services/menuService';
import { MenuItem } from '../types';

interface MenuState {
  menuTree: MenuItem[];
  menus: MenuItem[];
  loading: boolean;
  error: string | null;
}

const initialState: MenuState = {
  menuTree: [],
  menus: [],
  loading: false,
  error: null,
};

// Async Thunks
export const fetchSidebarMenu = createAsyncThunk(
  'menu/fetchSidebarMenu',
  async (_, { rejectWithValue }) => {
    try {
      const response = await menuService.getSidebarMenu();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load sidebar menus');
    }
  }
);

export const fetchAllMenus = createAsyncThunk(
  'menu/fetchAllMenus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await menuService.getAllMenus();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load all menus');
    }
  }
);

export const fetchMenuById = createAsyncThunk(
  'menu/fetchMenuById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await menuService.getMenuById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load menu');
    }
  }
);

export const createMenuItem = createAsyncThunk(
  'menu/createMenuItem',
  async (menuData: any, { rejectWithValue, dispatch }) => {
    try {
      const response = await menuService.createMenu(menuData);
      // Reload sidebar to reflect changes immediately
      dispatch(fetchSidebarMenu());
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create menu item');
    }
  }
);

export const updateMenuItem = createAsyncThunk(
  'menu/updateMenuItem',
  async ({ id, data, type }: { id: number; data: any; type?: 'main' | 'sub' }, { rejectWithValue, dispatch }) => {
    try {
      const response = await menuService.updateMenu(id, data);
      // Reload sidebar to reflect changes immediately
      dispatch(fetchSidebarMenu());
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update menu item');
    }
  }
);

export const deleteMenuItem = createAsyncThunk(
  'menu/deleteMenuItem',
  async ({ id, type }: { id: number; type: 'main' | 'sub' }, { rejectWithValue, dispatch }) => {
    try {
      await menuService.deleteMenu(id, type);
      // Reload sidebar to reflect changes immediately
      dispatch(fetchSidebarMenu());
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete menu item');
    }
  }
);

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    clearMenuError: (state) => {
      state.error = null;
    },
    resetMenuState: (state) => {
      state.menuTree = [];
      state.menus = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Sidebar Menu
      .addCase(fetchSidebarMenu.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSidebarMenu.fulfilled, (state, action) => {
        state.loading = false;
        state.menuTree = action.payload;
      })
      .addCase(fetchSidebarMenu.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch sidebar menus';
      })

      // Fetch All Menus
      .addCase(fetchAllMenus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllMenus.fulfilled, (state, action) => {
        state.loading = false;
        state.menus = action.payload;
      })
      .addCase(fetchAllMenus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch all menus';
      })

      // Create Menu Item
      .addCase(createMenuItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMenuItem.fulfilled, (state, action) => {
        state.loading = false;
        state.menus.push(action.payload);
      })
      .addCase(createMenuItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to create menu item';
      })

      // Update Menu Item
      .addCase(updateMenuItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMenuItem.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.menus.findIndex((m) => m.id === action.payload.id);
        if (index !== -1) {
          state.menus[index] = action.payload;
        }
      })
      .addCase(updateMenuItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to update menu item';
      })

      // Delete Menu Item
      .addCase(deleteMenuItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMenuItem.fulfilled, (state, action) => {
        state.loading = false;
        state.menus = state.menus.filter((m) => m.id !== action.payload);
      })
      .addCase(deleteMenuItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to delete menu item';
      });
  },
});

export const { clearMenuError, resetMenuState } = menuSlice.actions;
export default menuSlice.reducer;
