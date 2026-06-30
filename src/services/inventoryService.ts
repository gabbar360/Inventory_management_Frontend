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

  /**
   * Returns ALL stock batches for a product (including exhausted/consumed ones),
   * sorted newest-first. Used for P&L cost-price lookups so historical
   * purchase costs remain accessible even after stock runs out.
   */
  async getCostHistory(productId: string): Promise<Pick<StockBatch, 'id' | 'productId' | 'inwardDate' | 'costPerBox' | 'costPerPack' | 'costPerPcs' | 'packPerBox' | 'packPerPiece' | 'batchCode'>[]> {
    const response = await api.get<ApiResponse<StockBatch[]>>(
      '/inventory/cost-history',
      { params: { productId } }
    );
    return response.data.data!;
  },

  async downloadStockReportPDF(locationId?: string, reportType: 'location' | 'all' = 'all'): Promise<Blob> {
    const params: any = { reportType };
    if (locationId) {
      params.locationId = locationId;
    }
    
    const response = await api.get('/inventory/stock-report/pdf', {
      params,
      responseType: 'blob',
    });
    
    return response.data;
  },
};
