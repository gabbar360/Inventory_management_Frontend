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
  async getStockSummary(page?: number, limit?: number, locationId?: string, search?: string): Promise<{ data: StockSummary[]; lowStockItems: any[]; globalStats: any; pagination: any }> {
    const response = await api.get<any>(
      '/inventory/stock-summary',
      {
        params: { page, limit, locationId, search },
      }
    );
    return {
      data: response.data.data,
      lowStockItems: response.data.lowStockItems,
      globalStats: response.data.globalStats,
      pagination: response.data.pagination
    };
  },

  async getAvailableStock(
    productId: string,
    locationId?: string,
    includeIds?: string[]
  ): Promise<StockBatch[]> {
    const response = await api.get<ApiResponse<StockBatch[]>>(
      '/inventory/available-stock',
      {
        params: { productId, locationId, includeIds },
      }
    );
    return response.data.data!;
  },
};
