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
    const response = await api.get(`/barcodes/print/${source}/${id}`);
    return response.data.data || [];
  },

  lookupBarcode: async (barcode: string): Promise<BoxDetail> => {
    const response = await api.get(`/barcodes/lookup/${barcode}`);
    return response.data.data;
  },

  scanBarcode: async (barcode: string, flow: string, locationId?: number, customerId?: number) => {
    const response = await api.post('/barcodes/scan', {
      barcode,
      flow,
      locationId,
      customerId,
    });
    return response.data.data;
  },
};
