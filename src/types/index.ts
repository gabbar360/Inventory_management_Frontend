export interface User {
  id: string;
  email: string;
  name: string;
  roleId?: number;
  role?: {
    id: number;
    name: string;
    isSuperAdmin?: boolean;
  };
  permissions?: string[];
  createdAt: string;
}

export interface MenuItem {
  id: number;
  name: string;
  path: string | null;
  icon: string | null;
  order: number;
  permissionId?: number | null;
  isActive?: boolean;
  permission?: { id: number; slug: string; name: string } | null;
  subMenus?: SubMenuItem[];
  children?: MenuItem[]; // Sidebar structure mapping
  type?: 'main' | 'sub'; // Unified list type
  parentId?: number | null; // UI mapping compatibility
  parent?: MenuItem | null; // UI mapping compatibility
}

export interface SubMenuItem {
  id: number;
  name: string;
  path: string;
  icon: string | null;
  order: number;
  menuItemId: number;
  permissionId?: number | null;
  isActive?: boolean;
  permission?: { id: number; slug: string; name: string } | null;
  menuItem?: MenuItem;
  type?: 'main' | 'sub'; // Unified list type
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
  code: string;
  sku?: string;
  upc?: string;
  grade?: string;
  description?: string;
  categoryId: string;
  unit: string;
  specifications?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderLevel?: number;
  weight?: number;
  dimensions?: string;
  isPerishable?: boolean;
  shelfLife?: number;
  storageCondition?: string;
  barcode?: string;
  qrCode?: string;
  isActive?: boolean;
  color?: string;
  brand?: string;
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
  state?: string;
  gstNumber?: string;
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
  shippingAddress?: string;
  gstNumber?: string;
  state?: string;
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
  parentItemId?: string;
  boxes: number;
  packPerBox: number;
  packPerPiece: number;
  totalPacks: number;
  totalPcs: number;
  unit?: string;
  ratePerBox: number;
  ratePerPack: number;
  ratePerPcs: number;
  gstAmount: number;
  totalCost: number;
  batchCode?: string;
  mfgDate?: string;
  color?: string;
  brand?: string;
  product?: Product;
  subItems?: InwardItem[];
  // Legacy fields for backward compatibility
  pcsPerBox?: number;
}

export interface InwardInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  vendorId: string;
  locationId: string;
  expense: number;
  totalCost: number;
  purchaseOrderId?: string;
  amountPaid?: number;
  createdAt: string;
  updatedAt: string;
  vendor?: Vendor;
  location?: Location;
  items?: InwardItem[];
  paymentsApplied?: PaymentMadeInvoice[];
}

export interface OutwardItem {
  id: string;
  productId: string;
  stockBatchId: string;
  locationId: string;
  saleUnit: 'box' | 'pack' | 'piece';
  quantity: number;
  ratePerUnit: number;
  totalCost: number;
  description?: string;
  product?: Product;
  stockBatch?: StockBatch;
  location?: Location;
}

export interface PaymentReceipt {
  id: number;
  receiptNo: string;
  outwardInvoiceId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutwardInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  customerId: string;
  saleType: 'export' | 'domestic';
  expense: number;
  totalCost: number;
  adjustment?: number;
  amountReceived?: number;
  referenceNo?: string;
  shippingCharge?: number;
  discount?: number;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  items?: OutwardItem[];
  paymentReceipts?: PaymentReceipt[];
  paymentsApplied?: PaymentReceivedInvoice[];
}

export interface StockBatch {
  id: string;
  productId: string;
  vendorId: string;
  locationId: string;
  inwardDate: string;
  boxes: number;
  packPerBox: number;
  packPerPiece: number;
  totalPacks: number;
  totalPcs: number;
  remainingBoxes: number;
  remainingPacks: number;
  remainingPcs: number;
  costPerBox: number;
  costPerPack: number;
  costPerPcs: number;
  batchCode?: string;
  mfgDate?: string;
  inwardInvoiceId?: number | string | null;
  createdAt: string;
  updatedAt: string;
  product?: Product;
  vendor?: Vendor;
  location?: Location;
  // Legacy fields for backward compatibility
  pcsPerBox?: number;
}

export interface DashboardKPIs {
  totalStockValue: number;
  totalRevenue: number;
  totalPurchase: number;
  totalCOGS: number;
  totalExpenses: number;
  inwardExpenses: number;
  outwardExpenses: number;
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

export interface StockSummary {
  productId: string;
  productName: string;
  categoryName: string;
  totalBoxes: number;
  totalPacks: number;
  totalPcs: number;
  stockValue: number;
  lastInwardDate?: string;
}

export interface Sample {
  id: string;
  sampleNo: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  sentBy: string;
  sampleType: 'domestic' | 'export';
  kitPrice: number;
  trackingNumber?: string;
  dispatchMethod: 'courier' | 'hand_delivery' | 'transport';
  sentDate: string;
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  source?: 'website' | 'manual';
  paymentId?: string;
  orderId?: string;
  userType?: 'company' | 'customer';
  gstNumber?: string;
  panNumber?: string;
  createdAt: string;
  updatedAt: string;
  items?: SampleItem[];
}

export interface SampleItem {
  id: string;
  sampleId: string;
  productId: string;
  quantity: number;
  unit: 'box' | 'pack' | 'piece';
  product?: {
    name: string;
    grade?: string;
  };
}

export interface Quote {
  id: string;
  quoteNo: string;
  customerId: string;
  customer?: Customer;
  quoteDate: string;
  expiryDate: string;
  totalAmount: number;
  discount: number;
  tax: number;
  shippingCharge?: number;
  notes?: string;
  termsAndConditions?: string;
  billToDetails?: string;
  shipToDetails?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  updatedAt: string;
  items?: QuoteItem[];
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unit: string;
  rate: number;
  description?: string;
}

export interface SalesOrderItem {
  id: string;
  salesOrderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unit: string;
  rate: number;
  taxRate: number;
  amount: number;
  description?: string;
}

export interface SalesOrder {
  id: string;
  orderNo: string;
  quoteId?: string;
  quote?: { quoteNo: string };
  customerId: string;
  customer?: Customer;
  orderDate: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  saleType: 'domestic' | 'export';
  totalAmount: number;
  notes?: string;
  reference?: string;
  referenceBy?: string;
  expectedShipmentDate?: string;
  placeOfSupply?: string;
  deliveryMethod?: string;
  adjustment?: number;
  amountReceived?: number;
  shippingCharge?: number;
  discount?: number;
  createdAt: string;
  updatedAt: string;
  items?: SalesOrderItem[];
  dispatch?: OrderDispatch;
}

export interface OrderDispatch {
  id: number;
  dispatchNo: string;
  salesOrderId: number;
  salesOrder?: SalesOrder;
  dispatchDate: string;
  status: 'pending' | 'dispatched' | 'in_transit' | 'delivered' | 'cancelled';
  shippingMethod: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  shippingCountry: string;
  weight?: number;
  dimensions?: string;
  packageCount: number;
  shippingCost: number;
  insuranceAmount: number;
  notes?: string;
  toTheOrder?: boolean;
  courierName?: string;
  courierPhone?: string;
  truckNumber?: string;
  driverName?: string;
  driverPhone?: string;
  airlineCode?: string;
  flightNumber?: string;
  containerNumber?: string;
  vesselName?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  country?: string;
  message?: string;
  formType: string;
  source: 'website' | 'manual';
  status: 'new' | 'contacted' | 'converted' | 'rejected';
  createdAt: string;
  updatedAt: string;
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
  startDate?: string;
  endDate?: string;
  source?: string;
}

export interface PurchaseOrderItem {
  id?: string;
  purchaseOrderId?: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    code: string;
    unit: string;
    grade?: string;
    category?: {
      name: string;
      gstRate: number;
    };
  };
  quantity: number;
  unit: string;
  rate: number;
  taxRate: number;
  amount: number;
  description?: string;
  boxes?: number;
  packPerBox?: number;
  packPerPiece?: number;
  totalPacks?: number;
  totalPcs?: number;
  ratePerBox?: number;
  ratePerPack?: number;
  ratePerPcs?: number;
  gstAmount?: number;
  totalCost?: number;
  batchCode?: string;
  mfgDate?: string;
  color?: string;
  brand?: string;
  subItems?: PurchaseOrderItem[];
}

export interface PurchaseOrder {
  id: string;
  poNo: string;
  vendorId: string;
  vendor?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  poDate: string;
  expectedDeliveryDate?: string;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  totalAmount: number;
  notes?: string;
  reference?: string;
  adjustment?: number;
  shippingCharge?: number;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseOrderItem[];
}

export interface BoxDetail {
  id: number;
  barcode: string;
  productId: number;
  stockBatchId?: number;
  purchaseOrderId?: number;
  inwardInvoiceId?: number;
  outwardInvoiceId?: number;
  boxIndex: number;
  totalBoxes: number;
  packPerBox: number;
  packPerPiece: number;
  totalPcs: number;
  status: 'expected' | 'inwarded' | 'outwarded';
  color?: string | null;
  brand?: string | null;
  createdAt: string;
  updatedAt: string;
  product?: Product;
}

export interface PaymentReceived {
  id: number;
  paymentNumber: string;
  customerId: number;
  customer?: Customer;
  amount: number;
  date: string;
  paymentMode: string;
  referenceNumber?: string;
  depositTo: string;
  bankCharges?: number;
  taxRate?: number;
  notes?: string;
  transactionType: 'invoice_payment' | 'customer_advance' | 'credit_application';
  unusedAmount: number;
  createdAt: string;
  updatedAt: string;
  invoices?: PaymentReceivedInvoice[];
}

export interface PaymentReceivedInvoice {
  id: number;
  paymentReceivedId: number;
  invoiceId: number;
  amountApplied: number;
  invoice?: OutwardInvoice;
}

export interface PaymentMade {
  id: number;
  paymentNumber: string;
  vendorId: number;
  vendor?: Vendor;
  amount: number;
  date: string;
  paymentMode: string;
  referenceNumber?: string;
  paidThrough: string;
  bankCharges?: number;
  notes?: string;
  transactionType: 'bill_payment' | 'vendor_advance' | 'credit_application';
  unusedAmount: number;
  createdAt: string;
  updatedAt: string;
  invoices?: PaymentMadeInvoice[];
}

export interface PaymentMadeInvoice {
  id: number;
  paymentMadeId: number;
  invoiceId: number;
  amountApplied: number;
  invoice?: InwardInvoice;
}