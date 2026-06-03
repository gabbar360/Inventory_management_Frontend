import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Eye, Upload, Download, Edit, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchOutwardInvoices,
  fetchOutwardInvoiceById,
  deleteOutwardInvoice,
  clearError,
} from '@/slices/outwardSlice';
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

const Outward: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { invoices, currentInvoice, pagination, loading, error } = useAppSelector((state) => state.outward);

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OutwardInvoice | null>(null);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentTxnId, setPaymentTxnId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    dispatch(fetchOutwardInvoices({ page: currentPage, limit: 10, search, startDate, endDate }));
  }, [dispatch, search, currentPage, startDate, endDate]);

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
    dispatch(fetchOutwardInvoices({ page: currentPage, limit: 10, search, startDate, endDate }));
  };

  const handleFormCancel = () => navigate('/outward');

  const handleDateFilter = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setCurrentPage(1);
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

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
        dispatch(fetchOutwardInvoices({ page: currentPage, limit: 10, search, startDate, endDate }));
      } catch (error) {
        // Error handled by Redux
      }
    }
  };

  const calculateInvoiceBreakdown = (invoice: OutwardInvoice) => {
    let baseCost = 0;
    let gstCost = 0;
    invoice.items?.forEach((item) => {
      const gstRate = item.product?.category?.gstRate || 0;
      const itemBase = item.quantity * item.ratePerUnit;
      baseCost += itemBase;
      gstCost += (itemBase * gstRate) / 100;
    });
    const expense = invoice.expense || 0;
    const adjustment = invoice.adjustment || 0;
    const shippingCharge = invoice.shippingCharge || 0;
    const discount = invoice.discount || 0;
    const amountReceived = invoice.amountReceived || 0;
    const grandTotal = baseCost + gstCost + expense + shippingCharge - adjustment - discount;
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

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Please enter a valid payment amount'); return; }
    const { balanceDue } = calculateInvoiceBreakdown(selectedInvoice);
    if (amount > balanceDue + 0.01) { toast.error(`Payment amount exceeds the outstanding balance of ${formatCurrency(balanceDue)}`); return; }

    setSubmittingPayment(true);
    try {
      await outwardService.recordPayment(selectedInvoice.id.toString(), {
        amount, paymentDate, paymentMethod, transactionId: paymentTxnId, notes: paymentNotes
      });
      toast.success('Payment recorded successfully');
      setPaymentAmount(''); setPaymentTxnId(''); setPaymentNotes(''); setRecordingPayment(false);
      const fullInvoice = await dispatch(fetchOutwardInvoiceById(selectedInvoice.id)).unwrap();
      setSelectedInvoice(fullInvoice);
      dispatch(fetchOutwardInvoices({ page: currentPage, limit: 10, search, startDate, endDate }));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDownloadReceipt = async (receiptId: number, receiptNo: string) => {
    setDownloadingReceiptId(receiptId);
    try {
      const blob = await outwardService.downloadReceiptPDF(receiptId.toString());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${receiptNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Receipt PDF downloaded successfully');
    } catch {
      toast.error('Failed to download receipt');
    } finally {
      setDownloadingReceiptId(null);
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
      key: 'saleType',
      title: 'Type',
      render: (value: string) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${value === 'export' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    { key: 'totalQty', title: 'Qty', render: (_: any, record: any) => record.totalQty || 0 },
    { key: 'totalBoxes', title: 'Boxes', render: (_: any, record: any) => record.totalBoxes || 0 },
    { key: 'baseCost', title: 'Base Cost', render: (_: any, record: OutwardInvoice) => formatCurrency(calculateInvoiceBreakdown(record).baseCost) },
    { key: 'gstCost', title: 'GST', render: (_: any, record: OutwardInvoice) => formatCurrency(calculateInvoiceBreakdown(record).gstCost) },
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
    { key: 'items', title: 'Items', render: (items: any[]) => items?.length || 0 },
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

      {/* Date Filter */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>
            <Button onClick={() => handleDateFilter(startDate, endDate)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
              Apply Filter
            </Button>
            {(startDate || endDate) && (
              <Button onClick={clearDateFilter} variant="outline" className="w-full sm:w-auto">
                Clear
              </Button>
            )}
          </div>
          {(startDate || endDate) && (
            <div className="mt-2 text-xs text-gray-600">
              Showing data from {startDate || 'start'} to {endDate || 'end'}
            </div>
          )}
        </div>
      </div>

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
                    {selectedInvoice.items?.map((item, index) => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment History */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Payment Records
                </h3>
                {calculateInvoiceBreakdown(selectedInvoice).balanceDue > 0.01 && !recordingPayment && (
                  <Button type="button"
                    onClick={() => { setRecordingPayment(true); setPaymentAmount(calculateInvoiceBreakdown(selectedInvoice).balanceDue.toFixed(2)); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded">
                    Record Payment
                  </Button>
                )}
              </div>

              {recordingPayment && (
                <form onSubmit={handleRecordPayment} className="bg-emerald-50/50 border border-emerald-100 rounded p-4 mb-6 space-y-4">
                  <h4 className="text-sm font-semibold text-emerald-800">Record New Payment</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Amount Paid (₹) <span className="text-red-500">*</span></label>
                      <input type="number" step="0.01" min="0.01" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
                      <input type="date" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                      <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                        <option value="UPI">UPI / Scan to Pay</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Transaction Ref ID</label>
                      <input type="text" placeholder="e.g. UPI Txn ID" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white" value={paymentTxnId} onChange={(e) => setPaymentTxnId(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                      <input type="text" placeholder="Internal payment description..." className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-emerald-100">
                    <Button type="button" variant="outline" size="sm" onClick={() => setRecordingPayment(false)} className="text-xs">Cancel</Button>
                    <Button type="submit" loading={submittingPayment} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-1.5 px-4">Save Payment</Button>
                  </div>
                </form>
              )}

              {(!selectedInvoice.paymentReceipts || selectedInvoice.paymentReceipts.length === 0) ? (
                <div className="text-center py-6 border border-dashed border-gray-200 rounded bg-gray-50/50">
                  <p className="text-sm text-gray-500">No payment receipts have been recorded for this invoice yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Receipt No</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Method</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Ref ID</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {(selectedInvoice.paymentReceipts as any[]).map((receipt) => (
                        <tr key={receipt.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">{receipt.receiptNo}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-500">{formatDate(receipt.paymentDate)}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-700">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{receipt.paymentMethod}</span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-500 font-mono text-xs">{receipt.transactionId || '—'}</td>
                          <td className="px-4 py-2.5 text-sm text-right font-bold text-emerald-600">{formatCurrency(receipt.amount)}</td>
                          <td className="px-4 py-2.5 text-sm text-center">
                            <Button variant="ghost" size="sm" onClick={() => handleDownloadReceipt(receipt.id, receipt.receiptNo)} title="Download PDF Receipt" disabled={downloadingReceiptId === receipt.id} className="text-blue-600 hover:text-blue-700 p-1 h-auto">
                              {downloadingReceiptId === receipt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Upload Modal */}
      <BulkUpload
        type="outward"
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={() => dispatch(fetchOutwardInvoices({ page: currentPage, limit: 10, search, startDate, endDate }))}
      />
    </div>
  );
};

export default Outward;
