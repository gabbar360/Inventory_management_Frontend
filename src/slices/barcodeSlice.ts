import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { barcodeService } from '@/services/barcodeService';

interface BoxDetail {
  id: number;
  barcode: string;
  productId: number;
  purchaseOrderId?: number | null;
  inwardInvoiceId?: number | null;
  boxIndex: number;
  totalBoxes: number;
  packPerBox: number;
  packPerPiece: number;
  totalPcs: number;
  status: string;
  color?: string | null;
  brand?: string | null;
  product: any;
  purchaseOrder?: any;
  inwardInvoice?: any;
  stockBatch?: any;
  batchCode?: string | null;
  mfgDate?: string | null;
}

interface BarcodeState {
  boxes: BoxDetail[];
  currentBox: BoxDetail | null;
  loading: boolean;
  error: string | null;
}

const initialState: BarcodeState = {
  boxes: [],
  currentBox: null,
  loading: false,
  error: null,
};

export const fetchBarcodesForPrint = createAsyncThunk(
  'barcodes/fetchForPrint',
  async ({ source, id }: { source: string; id: string | number }, { rejectWithValue }) => {
    try {
      return await barcodeService.getBarcodesForPrint(source, id);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch barcodes';
      return rejectWithValue(message);
    }
  }
);

export const lookupBarcode = createAsyncThunk(
  'barcodes/lookup',
  async (barcode: string, { rejectWithValue }) => {
    try {
      return await barcodeService.lookupBarcode(barcode);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Barcode not found';
      return rejectWithValue(message);
    }
  }
);

export const scanBarcode = createAsyncThunk(
  'barcodes/scan',
  async (
    { barcode, flow, locationId, customerId }: { barcode: string; flow: string; locationId?: number; customerId?: number },
    { rejectWithValue }
  ) => {
    try {
      return await barcodeService.scanBarcode(barcode, flow, locationId, customerId);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to scan barcode';
      return rejectWithValue(message);
    }
  }
);

const barcodeSlice = createSlice({
  name: 'barcodes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearBoxes: (state) => {
      state.boxes = [];
      state.currentBox = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Barcodes for Print
      .addCase(fetchBarcodesForPrint.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBarcodesForPrint.fulfilled, (state, action) => {
        state.loading = false;
        state.boxes = action.payload;
      })
      .addCase(fetchBarcodesForPrint.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Lookup Barcode
      .addCase(lookupBarcode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(lookupBarcode.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBox = action.payload;
      })
      .addCase(lookupBarcode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Scan Barcode
      .addCase(scanBarcode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(scanBarcode.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBox = action.payload.box;
      })
      .addCase(scanBarcode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearBoxes } = barcodeSlice.actions;
export default barcodeSlice.reducer;
