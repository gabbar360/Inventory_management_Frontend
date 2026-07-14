import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Eye, Upload, Download, Edit, Trash2, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchOutwardInvoices,
  fetchOutwardInvoiceById,
  deleteOutwardInvoice,
  clearError,
} from '@/slices/outwardSlice';
import { fetchCustomers } from '@/slices/customerSlice';
import { fetchLocations } from '@/slices/locationSlice';
import { bulkUploadService } from '@/services/bulkUploadService';
import { outwardService } from '@/services/outwardService';
import { OutwardInvoice } from '@/types';
import { formatDate, formatCurrency, debounce, cn } from '@/utils';
import Button from '@/components/Button';
import Table from '@/components/Table';
import Modal from '@/components/Modal';
import BulkUpload from '@/components/BulkUpload';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import AddEditOutward from '@/components/AddEditOutward';
import ShareDocumentModal from '@/components/ShareDocumentModal';

const Outward: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { invoices, currentInvoice, pagination, loading, error } = useAppSelector((state) => state.outward);
  const { customers } = useAppSelector((state) => state.customers);
  const { locations } = useAppSelector((state) => state.locations);

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OutwardInvoice | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const [shareInvoice, setShareInvoice] = useState<OutwardInvoice | null>(null);
  const [directScannerOpen, setDirectScannerOpen] = useState(false);
  const [showScanOutwardModal, setShowScanOutwardModal] = useState(false);
  const [selectedScanCustomer, setSelectedScanCustomer] = useState('');
  const [selectedScanLocation, setSelectedScanLocation] = useState('');

  useEffect(() => {
    dispatch(fetchCustomers({ limit: 500 }));
    dispatch(fetchLocations({ limit: 100 }));
  }, [dispatch]);

  const handleDirectOutwardScan = async (barcode: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/v1/barcodes/scan', {
        barcode,
        flow: 'outward',
        customerId: selectedScanCustomer ? parseInt(selectedScanCustomer) : 1,
        locationId: selectedScanLocation ? parseInt(selectedScanLocation) : undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.success) {
        toast.success(response.data.message || "Box outwarded successfully!");
        dispatch(fetchOutwardInvoices({ page: currentPage, limit: 10, search }));
      } else {
        toast.error(response.data?.message || "Failed to scan box.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Scan failed.");
    }
  };

  useEffect(() => {
    dispatch(fetchOutwardInvoices({ page: currentPage, limit: 10, search }));
  }, [dispatch, search, currentPage]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Fetch invoice for edit mode
  useEffect(() => {
    if (id) {
      dispatch(fetchOutwardInvoiceById(id as any));
    }
  }, [id, dispatch]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const handleAddInvoice = () => navigate('/outward/add');
  const handleEditInvoice = (invoice: OutwardInvoice) => navigate(`/outward/edit/${invoice.id}`);

  const handleFormSuccess = () => {
    navigate('/outward');
    dispatch(fetchOutwardInvoices({ page: currentPage, limit: 10, search }));
  };

  const handleFormCancel = () => navigate('/outward');

  const viewInvoice = async (invoice: OutwardInvoice) => {
    try {
      const fullInvoice = await dispatch(fetchOutwardInvoiceById(invoice.id)).unwrap();
      setSelectedInvoice(fullInvoice);
      setViewModalOpen(true);
    } catch (error) {
      console.error('Failed to load invoice:', error);
    }
  };

  const deleteInvoice = async (invoice: OutwardInvoice) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await dispatch(deleteOutwardInvoice(invoice.id)).unwrap();
        toast.success('Outward invoice deleted successfully');
        dispatch(fetchOutwardInvoices({ page: currentPage, limit: 10, search }));
      } catch (error) {
        // Error handled by Redux
      }
    }
  };

  const calculateInvoiceBreakdown = (invoice: OutwardInvoice) => {
    let baseCost = 0;
    let gstCost = 0;
    const allGstRates: number[] = [];
    invoice.items?.forEach((item) => {
      const gstRate = item.product?.category?.gstRate || 0;
      const itemBase = item.quantity * item.ratePerUnit;
      baseCost += itemBase;
      gstCost += (itemBase * gstRate) / 100;
      allGstRates.push(gstRate);
    });
    const expense = invoice.expense || 0;
    const adjustment = invoice.adjustment || 0;
    const shippingCharge = invoice.shippingCharge || 0;
    const discount = invoice.discount || 0;
    const amountReceived = invoice.amountReceived || 0;
    const shippingGstRate = allGstRates.includes(18) ? 18 : allGstRates.includes(5) ? 5 : 0;
    const shippingGstAmt = shippingCharge > 0 ? shippingCharge * (shippingGstRate / 100) : 0;
    const grandTotal = baseCost + gstCost + shippingGstAmt + expense + shippingCharge - adjustment - discount;
    const balanceDue = grandTotal - amountReceived;
    return { baseCost, gstCost, expense, adjustment, shippingCharge, discount, grandTotal, amountReceived, balanceDue };
  };

  const handleExport = async () => {
    try {
      const blob = await bulkUploadService.exportData('outward');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `outward_invoices_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Outward invoices exported successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to export outward invoices');
    }
  };

  const handleDownloadPDF = async (invoice: OutwardInvoice) => {
    setDownloadingId(invoice.id);
    try {
      const blob = await outwardService.generatePDF(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.invoiceNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Invoice PDF downloaded successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };



  const columns = [
    { key: 'invoiceNo', title: 'Invoice No', sortable: true },
    { key: 'date', title: 'Date', render: (value: string) => formatDate(value) },
    {
      key: 'customer.name',
      title: 'Customer',
      sticky: true,
      render: (_: any, record: OutwardInvoice) => (
        <div>
          <div className="font-medium">{record.customer?.name}</div>
          <div className="text-sm text-gray-500">{record.customer?.code}</div>
        </div>
      ),
    },
    {
      key: 'location.name',
      title: 'Locations',
      render: (_: any, record: OutwardInvoice) => {
        const locations = [...new Set(record.items?.map(i => i.location?.name).filter(Boolean))];
        return locations.length > 0 ? locations.join(', ') : '-';
      },
    },
    
    {
      key: 'totalCost',
      title: 'Grand Total',
      render: (_: any, record: OutwardInvoice) => <span className="font-semibold">{formatCurrency(calculateInvoiceBreakdown(record).grandTotal)}</span>,
    },
    {
      key: 'balanceDue',
      title: 'Balance Due',
      render: (_: any, record: OutwardInvoice) => {
        const { balanceDue } = calculateInvoiceBreakdown(record);
        return <span className={cn('font-semibold', balanceDue > 0 ? 'text-red-600' : 'text-gray-900')}>{formatCurrency(balanceDue)}</span>;
      },
    },
    {
      key: 'paymentStatus',
      title: 'Payment Status',
      render: (_: any, record: OutwardInvoice) => {
        const { balanceDue, amountReceived } = calculateInvoiceBreakdown(record);
        let status = 'Unpaid'; let bgClass = 'bg-red-100 text-red-800 border-red-200';
        if (balanceDue <= 0.01) { status = 'Paid'; bgClass = 'bg-green-100 text-green-800 border-green-200'; }
        else if (amountReceived > 0) { status = 'Partially Paid'; bgClass = 'bg-amber-100 text-amber-800 border-amber-200'; }
        return <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', bgClass)}>{status}</span>;
      },
    },
    {
      key: 'grossProfit',
      title: 'Gross Profit',
      render: (_: any, record: any) => (
        <span className={record.grossProfit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{formatCurrency(record.grossProfit || 0)}</span>
      ),
    },
    {
      key: 'grossProfitMargin',
      title: 'Profit Margin',
      render: (_: any, record: any) => (
        <span className={record.grossProfitMargin >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{record.grossProfitMargin?.toFixed(2) || '0.00'}%</span>
      ),
    },
    {
      key: 'items',
      title: 'Items',
      render: (items: any[]) => {
        if (!items) return 0;
        const uniqueProducts = new Set(items.map((i) => i.productId));
        return uniqueProducts.size;
      },
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: OutwardInvoice) => (
        <div className="flex gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => viewInvoice(record)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(record)} title="Download PDF" disabled={downloadingId === record.id}>
            {downloadingId === record.id ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <Download className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShareInvoice(record)} title="Send via Email">
            <Mail className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEditInvoice(record)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => deleteInvoice(record)} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // ── Show form if in add/edit mode (like Products.tsx) ──
  if (id || window.location.pathname.includes('/add')) {
    // Wait for invoice data to load before rendering edit form
    if (id && (!currentInvoice || String(currentInvoice.id) !== String(id))) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <div className="text-xs font-semibold text-gray-500">Loading invoice...</div>
          </div>
        </div>
      );
    }
    return (
      <AddEditOutward
        invoice={id && currentInvoice ? currentInvoice : undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Outwards"
        searchPlaceholder="Search invoices..."
        onSearch={(value) => debouncedSearch(value)}
        actions={[
          { label: 'Bulk Upload', icon: <Upload className="h-4 w-4" />, onClick: () => setBulkUploadOpen(true) },
          { label: 'Export', icon: <Download className="h-4 w-4" />, onClick: handleExport },
          { label: 'Create Invoice', icon: <Plus className="h-4 w-4" />, onClick: handleAddInvoice, variant: 'primary' as const },
        ]}
      />



      <div className="card overflow-x-auto">
        <Table data={invoices} columns={columns} loading={loading} />
        <Pagination
          currentPage={pagination?.page || 1}
          totalPages={pagination?.totalPages || 1}
          total={pagination?.total || 0}
          limit={pagination?.limit || 10}
          onPageChange={setCurrentPage}
          loading={loading}
        />
      </div>

      {shareInvoice && (
        <ShareDocumentModal
          isOpen={!!shareInvoice}
          onClose={() => setShareInvoice(null)}
          docType="invoice"
          docId={shareInvoice.id}
          docLabel={shareInvoice.invoiceNo}
          defaultEmail={shareInvoice.customer?.email || ''}
        />
      )}

      {/* View Invoice Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={`Invoice ${selectedInvoice?.invoiceNo}`}
        size="lg"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700">Date</label><div className="text-gray-900">{formatDate(selectedInvoice.date)}</div></div>
              <div><label className="block text-sm font-medium text-gray-700">Total Cost</label><div className="text-gray-900 font-semibold">{formatCurrency(selectedInvoice.totalCost)}</div></div>
              <div><label className="block text-sm font-medium text-gray-700">Customer</label><div className="text-gray-900">{selectedInvoice.customer?.name} ({selectedInvoice.customer?.code})</div></div>
              <div><label className="block text-sm font-medium text-gray-700">Place of Supply</label><div className="text-gray-900">{selectedInvoice.customer?.state || '—'}</div></div>
              <div><label className="block text-sm font-medium text-gray-700">Sale Type</label><div className="text-gray-900 capitalize">{selectedInvoice.saleType}</div></div>
              <div><label className="block text-sm font-medium text-gray-700">Expense</label><div className="text-gray-900">{formatCurrency(selectedInvoice.expense)}</div></div>
              {(selectedInvoice.shippingCharge ?? 0) > 0 && <div><label className="block text-sm font-medium text-gray-700">Shipping Charge</label><div className="text-gray-900">{formatCurrency(selectedInvoice.shippingCharge ?? 0)}</div></div>}
              {(selectedInvoice.discount ?? 0) > 0 && <div><label className="block text-sm font-medium text-gray-700">Discount</label><div className="text-red-600 font-semibold">- {formatCurrency(selectedInvoice.discount ?? 0)}</div></div>}
              <div><label className="block text-sm font-medium text-gray-700">Adjustment / Rounding</label><div className="text-gray-900">{(selectedInvoice.adjustment ?? 0) > 0 ? '-' : (selectedInvoice.adjustment ?? 0) < 0 ? '+' : ''}{formatCurrency(Math.abs(selectedInvoice.adjustment ?? 0))}</div></div>
              <div><label className="block text-sm font-medium text-gray-700">Grand Total</label><div className="text-gray-900 font-semibold">{formatCurrency(calculateInvoiceBreakdown(selectedInvoice).grandTotal)}</div></div>
              <div><label className="block text-sm font-medium text-gray-700">Amount Received</label><div className="text-emerald-600 font-semibold">{formatCurrency(selectedInvoice.amountReceived || 0)}</div></div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Balance Due</label>
                <div className={cn('font-bold', calculateInvoiceBreakdown(selectedInvoice).balanceDue > 0 ? 'text-red-600' : 'text-gray-900')}>
                  {formatCurrency(calculateInvoiceBreakdown(selectedInvoice).balanceDue)}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(() => {
                      const groupedItemsMap = new Map<string, any>();
                      selectedInvoice.items?.forEach((item) => {
                        const key = `${item.productId}-${item.saleUnit}-${item.ratePerUnit}`;
                        if (groupedItemsMap.has(key)) {
                          const existing = groupedItemsMap.get(key)!;
                          existing.quantity += item.quantity;
                          existing.totalCost += item.totalCost;
                          if (item.description && existing.description && !existing.description.includes(item.description)) {
                            existing.description = `${existing.description}, ${item.description}`;
                          } else if (item.description && !existing.description) {
                            existing.description = item.description;
                          }
                          if (item.location?.name && existing.location?.name && !existing.location.name.includes(item.location.name)) {
                            existing.location.name = `${existing.location.name}, ${item.location.name}`;
                          }
                        } else {
                          groupedItemsMap.set(key, { ...item, location: item.location ? { ...item.location } : undefined });
                        }
                      });
                      const grouped = Array.from(groupedItemsMap.values());
                      return grouped.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <div>
                              {item.product?.name} {item.product?.grade && `(${item.product.grade})`}
                            </div>
                            {item.description && (
                              <div className="text-xs text-gray-400 mt-0.5 italic">
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.product?.sku || '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{item.location?.name || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 capitalize">{item.saleUnit}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.ratePerUnit)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 font-semibold">{formatCurrency(item.totalCost)}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>


          </div>
        )}
      </Modal>

      {/* Bulk Upload Modal */}
      <BulkUpload
        type="outward"
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={() => dispatch(fetchOutwardInvoices({ page: currentPage, limit: 10, search }))}
      />

      {/* Scan Customer & Location Selector Modal */}
      <Modal
        isOpen={showScanOutwardModal}
        onClose={() => setShowScanOutwardModal(false)}
        title="Select Outward Details"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Select Customer <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedScanCustomer}
              onChange={(e) => setSelectedScanCustomer(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-sm outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              <option value="">-- Select Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Select Source Location (Optional)
            </label>
            <select
              value={selectedScanLocation}
              onChange={(e) => setSelectedScanLocation(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-sm outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              <option value="">-- Select Location --</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowScanOutwardModal(false)}
              className="odoo-btn-secondary px-4 h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selectedScanCustomer}
              onClick={() => {
                setShowScanOutwardModal(false);
                setDirectScannerOpen(true);
              }}
              className="odoo-btn-primary px-4 h-8 text-xs font-semibold"
            >
              Start Scanning
            </Button>
          </div>
        </div>
      </Modal>

      <BarcodeScannerModal
        isOpen={directScannerOpen}
        onClose={() => setDirectScannerOpen(false)}
        onScanSuccess={handleDirectOutwardScan}
      />
    </div>
  );
};

export default Outward;