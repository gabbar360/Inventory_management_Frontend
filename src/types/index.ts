export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  hsnCode: string;
  gstRate: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

export interface Product {
  id: string;
  name: string;
  grade?: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  category?: {
    name: string;
    hsnCode: string;
    gstRate: number;
  };
  _count?: {
    inwardItems: number;
    outwardItems: number;
  };
}

export interface Vendor {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    inwardInvoices: number;
  };
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    outwardInvoices: number;
  };
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    inwardInvoices: number;
    outwardInvoices: number;
    stockBatches: number;
  };
}

export interface InwardItem {
  id: string;
  productId: string;
  boxes: number;
  pcsPerBox: number;
  totalPcs: number;
  ratePerBox: number;
  ratePerPcs: number;
  gstAmount: number;
  totalCost: number;
  product?: Product;
}

export interface InwardInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  vendorId: string;
  locationId: string;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  vendor?: Vendor;
  location?: Location;
  items?: InwardItem[];
}

export interface OutwardItem {
  id: string;
  productId: string;
  stockBatchId: string;
  saleUnit: 'box' | 'piece';
  quantity: number;
  ratePerUnit: number;
  totalCost: number;
  product?: Product;
  stockBatch?: StockBatch;
}

export interface OutwardInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  customerId: string;
  locationId: string;
  saleType: 'export' | 'domestic';
  expense: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  location?: Location;
  items?: OutwardItem[];
}

export interface StockBatch {
  id: string;
  productId: string;
  vendorId: string;
  locationId: string;
  inwardDate: string;
  boxes: number;
  pcsPerBox: number;
  totalPcs: number;
  remainingBoxes: number;
  remainingPcs: number;
  costPerBox: number;
  costPerPcs: number;
  createdAt: string;
  updatedAt: string;
  product?: Product;
  vendor?: Vendor;
  location?: Location;
}

export interface DashboardKPIs {
  totalStockValue: number;
  totalRevenue: number;
  totalPurchase: number;
  totalCOGS: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
}

export interface RevenueChartData {
  date: string;
  revenue: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  categoryName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface TopCustomer {
  customerId: string;
  customerName: string;
  customerCode: string;
  totalOrders: number;
  totalRevenue: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}