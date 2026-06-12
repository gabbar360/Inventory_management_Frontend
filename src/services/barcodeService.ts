import api from '@/utils/api';

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

export const barcodeService = {
  getBarcodesForPrint: async (source: string, id: string | number): Promise<BoxDetail[]> => {
    console.log(`[Frontend] Get Barcodes for Print - Source: ${source}, ID: ${id}`);
    try {
      const response = await api.get(`/barcodes/print/${source}/${id}`);
      console.log(`[Frontend] ✅ Got ${response.data.data.length} barcodes`);
      return response.data.data || [];
    } catch (error: any) {
      console.log(`[Frontend] ❌ Error fetching barcodes:`, error.message);
      throw error;
    }
  },

  lookupBarcode: async (barcode: string): Promise<BoxDetail> => {
    console.log(`[Frontend] Lookup Barcode: ${barcode}`);
    try {
      const response = await api.get(`/barcodes/lookup/${barcode}`);
      console.log(`[Frontend] ✅ Lookup successful - Box ID: ${response.data.data?.id}`);
      return response.data.data;
    } catch (error: any) {
      console.log(`[Frontend] ❌ Lookup error:`, error.message);
      throw error;
    }
  },

  scanBarcode: async (barcode: string, flow: string, locationId?: number, customerId?: number) => {
    console.log(`[Frontend] Scan Barcode Request`);
    console.log(`  - Barcode: ${barcode}`);
    console.log(`  - Flow: ${flow}`);
    console.log(`  - LocationId: ${locationId}`);
    console.log(`  - CustomerId: ${customerId}`);
    
    try {
      const response = await api.post('/barcodes/scan', {
        barcode,
        flow,
        locationId,
        customerId,
      });
      
      console.log(`[Frontend] ✅ Scan successful - ${flow}`);
      console.log(`  - Message: ${response.data.data?.message}`);
      console.log(`  - Box Status: ${response.data.data?.box?.status}`);
      return response.data.data;
    } catch (error: any) {
      console.log(`[Frontend] ❌ Scan error:`, error.response?.data?.message || error.message);
      throw error;
    }
  },
};
