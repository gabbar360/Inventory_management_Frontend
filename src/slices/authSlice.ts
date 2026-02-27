import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  authService,
  LoginCredentials,
  RegisterData,
  UpdateProfileData,
} from '@/services/authService';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return response;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: RegisterData) => {
    const response = await authService.register(data);
    return response;
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const logoutAllDevices = createAsyncThunk('auth/logoutAll', async () => {
  await authService.logoutAllDevices();
});

export const checkAuth = createAsyncThunk('auth/checkAuth', async () => {
  const user = await authService.getCurrentUser();
  return user;
});

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: UpdateProfileData) => {
    const user = await authService.updateProfile(data);
    return user;
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string) => {
    await authService.forgotPassword(email);
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, newPassword }: { token: string; newPassword: string }) => {
    await authService.resetPassword(token, newPassword);
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      await authService.refreshToken();
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

export const verifyToken = createAsyncThunk('auth/verifyToken', async () => {
  const result = await authService.verifyToken();
  return result.user;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = null;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Login failed';
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = null;
        state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Registration failed';
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutAllDevices.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutAllDevices.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
      })
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Profile update failed';
      })
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to send reset email';
      })
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to reset password';
      })
      .addCase(refreshToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshToken.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      .addCase(verifyToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(verifyToken.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
