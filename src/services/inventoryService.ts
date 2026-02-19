import api from '@/utils/api';
import { ApiResponse, StockBatch } from '@/types';

export interface StockSummary {
  productId: string;
  productName: string;
  categoryName: string;
  totalBoxes: number;
  totalPacks: number;
  totalPcs: number;
  totalValue: number;
  stockValue: number;
  locations: {
    locationId: string;
    locationName: string;
    boxes: number;
    packs?: number;
    pcs: number;
    value: number;
  }[];
}

export const inventoryService = {
  async getStockSummary(locationId?: string): Promise<StockSummary[]> {
    const response = await api.get<ApiResponse<StockSummary[]>>(
      '/inventory/stock-summary',
      {
        params: { locationId },
      }
    );
    return response.data.data!;
  },

  async getAvailableStock(
    productId: string,
    locationId?: string
  ): Promise<StockBatch[]> {
    const response = await api.get<ApiResponse<StockBatch[]>>(
      '/inventory/available-stock',
      {
        params: { productId, locationId },
      }
    );
    return response.data.data!;
  },
};
