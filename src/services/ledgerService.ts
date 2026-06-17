import api from '@/utils/api';
import { ApiResponse, Vendor, Customer } from '@/types';

export interface LedgerTransaction {
  id: string;
  date: string;
  refNo: string;
  type: string;
  details: string;
  debit: number;
  credit: number;
  balance: number;
  createdAt: string;
}

export interface VendorLedgerData {
  vendor: Vendor;
  openingBalance: number;
  transactions: LedgerTransaction[];
  totalCredit: number;
  totalDebit: number;
  closingBalance: number;
}

export interface CustomerLedgerData {
  customer: Customer;
  openingBalance: number;
  transactions: LedgerTransaction[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

export const ledgerService = {
  async getVendorLedger(
    vendorId: string | number,
    params?: { startDate?: string; endDate?: string }
  ): Promise<VendorLedgerData> {
    const response = await api.get<ApiResponse<VendorLedgerData>>(
      `/get-vendors/${vendorId}/ledger`,
      { params }
    );
    return response.data.data!;
  },

  async downloadVendorLedgerPDF(
    vendorId: string | number,
    params?: { startDate?: string; endDate?: string }
  ): Promise<Blob> {
    const response = await api.get(`/get-vendors/${vendorId}/ledger/pdf`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  async getCustomerLedger(
    customerId: string | number,
    params?: { startDate?: string; endDate?: string }
  ): Promise<CustomerLedgerData> {
    const response = await api.get<ApiResponse<CustomerLedgerData>>(
      `/get-customers/${customerId}/ledger`,
      { params }
    );
    return response.data.data!;
  },

  async downloadCustomerLedgerPDF(
    customerId: string | number,
    params?: { startDate?: string; endDate?: string }
  ): Promise<Blob> {
    const response = await api.get(`/get-customers/${customerId}/ledger/pdf`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
