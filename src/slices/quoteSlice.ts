import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { quoteService } from '../services/quoteService';
import { Quote } from '@/types';

export const fetchQuotes = createAsyncThunk(
  'quotes/fetchQuotes',
  async (filters?: any) => {
    return await quoteService.getQuotes(filters);
  }
);

export const fetchQuoteById = createAsyncThunk(
  'quotes/fetchQuoteById',
  async (id: string) => {
    const response = await quoteService.getQuoteById(id);
    return response.data || response;
  }
);

export const createQuote = createAsyncThunk(
  'quotes/createQuote',
  async (data: any) => {
    return await quoteService.createQuote(data);
  }
);

export const updateQuote = createAsyncThunk(
  'quotes/updateQuote',
  async ({ id, data }: { id: string; data: any }) => {
    return await quoteService.updateQuote(id, data);
  }
);

export const deleteQuote = createAsyncThunk(
  'quotes/deleteQuote',
  async (id: string) => {
    await quoteService.deleteQuote(id);
    return id;
  }
);

export const downloadQuotePDF = createAsyncThunk(
  'quotes/downloadQuotePDF',
  async (id: string) => {
    const blob = await quoteService.downloadQuotePDF(id);
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quote-${id}.pdf`;
    link.setAttribute('type', 'application/pdf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return id;
  }
);

interface QuoteState {
  quotes: Quote[];
  currentQuote: Quote | null;
  loading: boolean;
  downloadingPDF: boolean;
  error: string | null;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
  };
}

const initialState: QuoteState = {
  quotes: [],
  currentQuote: null,
  loading: false,
  downloadingPDF: false,
  error: null,
};

const quoteSlice = createSlice({
  name: 'quotes',
  initialState,
  reducers: {
    clearCurrentQuote: (state) => {
      state.currentQuote = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuotes.fulfilled, (state, action) => {
        state.loading = false;
        state.quotes = action.payload;
      })
      .addCase(fetchQuotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch quotes';
      })
      .addCase(fetchQuoteById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuoteById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentQuote = action.payload;
      })
      .addCase(fetchQuoteById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch quote';
      })
      .addCase(createQuote.fulfilled, (state, action) => {
        state.quotes.push(action.payload);
      })
      .addCase(updateQuote.fulfilled, (state, action) => {
        const index = state.quotes.findIndex((q) => q.id === action.payload.id);
        if (index !== -1) {
          state.quotes[index] = action.payload;
        }
        state.currentQuote = action.payload;
      })
      .addCase(deleteQuote.fulfilled, (state, action) => {
        state.quotes = state.quotes.filter((q) => q.id !== action.payload);
      })
      .addCase(downloadQuotePDF.pending, (state) => {
        state.downloadingPDF = true;
        state.error = null;
      })
      .addCase(downloadQuotePDF.fulfilled, (state) => {
        state.downloadingPDF = false;
      })
      .addCase(downloadQuotePDF.rejected, (state, action) => {
        state.downloadingPDF = false;
        state.error = action.error.message || 'Failed to download PDF';
      });
  },
});

export const { clearCurrentQuote } = quoteSlice.actions;
export default quoteSlice.reducer;
