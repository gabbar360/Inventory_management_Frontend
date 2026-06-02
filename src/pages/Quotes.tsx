import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Download, Loader2,
  MoreVertical, ShoppingCart, FileText, Package,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchQuotes,
  deleteQuote,
  downloadQuotePDF,
  convertQuoteToInvoice,
} from '@/slices/quoteSlice';
import { convertQuoteToSalesOrder } from '@/slices/salesOrderSlice';
import { fetchAvailableStock } from '@/slices/inventorySlice';
import { Quote, QuoteItem, StockBatch } from '@/types';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import PageHeader from '@/components/PageHeader';
import QuoteForm from '@/components/forms/QuoteForm';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const getStatusBadge = (status: string) => {
  const statusConfig = {
    draft:    { bg: 'bg-gray-100',   text: 'text-gray-800',  label: 'Draft' },
    sent:     { bg: 'bg-blue-100',   text: 'text-blue-800',  label: 'Sent' },
    accepted: { bg: 'bg-green-100',  text: 'text-green-800', label: 'Accepted' },
    rejected: { bg: 'bg-red-100',    text: 'text-red-800',   label: 'Rejected' },
    expired:  { bg: 'bg-yellow-100', text: 'text-yellow-800',label: 'Expired' },
  };
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Quotes: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { quotes, loading, error, pagination } = useAppSelector(
    (state) => state.quotes
  ) as { quotes: Quote[]; loading: boolean; error: string | null; pagination: any };

  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const [convertingId, setConvertingId] = useState<string | number | null>(null);
  const [convertingInvoiceId] = useState<string | number | null>(null);
  const [actionModalQuote, setActionModalQuote] = useState<Quote | null>(null);
  const [invoiceModalQuote, setInvoiceModalQuote] = useState<Quote | null>(null);
  const [batchSelections, setBatchSelections] = useState<Record<string, { stockBatchId: string; saleUnit: string }>>({});
  const [stockCache, setStockCache] = useState<Record<string, StockBatch[]>>({});
  const [stockLoading, setStockLoading] = useState(false);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    dispatch(fetchQuotes({ search, startDate, endDate, page: currentPage, limit: pageSize }));
  }, [dispatch, search, startDate, endDate, currentPage, pageSize]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // When editing via route param, find quote from list
  useEffect(() => {
    if (id && quotes.length > 0) {
      const found = quotes.find((q) => q.id.toString() === id);
      if (found) setEditingQuote(found);
    }
  }, [id, quotes]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

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

  // ── Navigation handlers (Product-module flow) ──
  const handleAddQuote = () => navigate('/quotes/add');
  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    navigate(`/quotes/edit/${quote.id}`);
  };

  const handleFormClose = () => {
    navigate('/quotes');
    setEditingQuote(null);
    dispatch(fetchQuotes({ search, startDate, endDate, page: currentPage, limit: pageSize }));
  };

  const handleDelete = async (quote: Quote) => {
    if (window.confirm(`Are you sure you want to delete quote "${quote.quoteNo}"?`)) {
      try {
        await dispatch(deleteQuote(quote.id)).unwrap();
        toast.success('Quote deleted successfully');
      } catch {
        // Error handled by Redux
      }
    }
  };

  const [salesModalQuote, setSalesModalQuote] = useState<Quote | null>(null);

  const openSalesModal = (quote: Quote) => {
    setSalesModalQuote(quote);
  };

  const closeSalesModal = () => {
    setSalesModalQuote(null);
  };

  const confirmConvertToSalesOrder = async () => {
    if (!salesModalQuote) return;
    setConvertingId(salesModalQuote.id);
    try {
      await dispatch(convertQuoteToSalesOrder(salesModalQuote.id)).unwrap();
      toast.success(`Sales Order created from ${salesModalQuote.quoteNo}`);
      navigate('/sales-orders');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to convert');
    } finally {
      setConvertingId(null);
      closeSalesModal();
    }
  };

  // Original handler replaced with modal opener
  const handleConvertToSalesOrder = (quote: Quote) => {
    openSalesModal(quote);
  };

  const openInvoiceModal = async (quote: Quote) => {
    setInvoiceModalQuote(quote);
    setBatchSelections({});
    setStockCache({});
    setStockLoading(true);
    const items = quote.items || [];
    const uniqueProductIds = [...new Set(items.map((i: QuoteItem) => i.productId.toString()))];
    const results = await Promise.all(
      uniqueProductIds.map((pid) => dispatch(fetchAvailableStock({ productId: pid })).unwrap())
    );
    const cache: Record<string, StockBatch[]> = {};
    uniqueProductIds.forEach((pid, idx) => { cache[pid] = results[idx]; });
    setStockCache(cache);
    setStockLoading(false);
  };

  const handleInvoiceSubmit = async () => {
    if (!invoiceModalQuote) return;
    const items = invoiceModalQuote.items || [];
    for (const item of items) {
      if (!batchSelections[item.id]?.stockBatchId) {
        toast.error(`Please select stock batch for: ${item.product?.name || item.productId}`);
        return;
      }
    }
    const itemsPayload = items.map((item: QuoteItem) => ({
      quoteItemId: item.id,
      stockBatchId: batchSelections[item.id].stockBatchId,
      saleUnit: batchSelections[item.id].saleUnit,
    }));
    setSubmittingInvoice(true);
    try {
      await dispatch(convertQuoteToInvoice({ id: invoiceModalQuote.id, items: itemsPayload })).unwrap();
      toast.success(`Invoice created from ${invoiceModalQuote.quoteNo}`);
      setInvoiceModalQuote(null);
      navigate('/outward');
    } catch (e: any) {
      toast.error(e?.message || e || 'Failed to convert to invoice');
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handleDownloadPDF = async (quote: Quote) => {
    setDownloadingId(quote.id.toString());
    try {
      await dispatch(downloadQuotePDF(quote.id)).unwrap();
      toast.success('PDF downloaded successfully');
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const columns = [
    { key: 'quoteNo', title: 'Quote No', sortable: true },
    { key: 'customer.name', title: 'Customer', render: (_: any, record: Quote) => record.customer?.name || '-' },
    { key: 'quoteDate', title: 'Quote Date', render: (value: string) => formatDate(value) },
    { key: 'expiryDate', title: 'Expiry Date', render: (value: string) => formatDate(value) },
    { key: 'totalAmount', title: 'Amount', render: (value: number) => `₹${value?.toFixed(2) || '0.00'}` },
    { key: 'status', title: 'Status', render: (value: string) => getStatusBadge(value) },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Quote) => (
        <div className="flex gap-1 sm:gap-2 items-center">
          <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(record)} title="Download PDF" disabled={downloadingId === record.id.toString()}>
            {downloadingId === record.id.toString() ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <Download className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEditQuote(record)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(record)} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </Button>
          {/* Action Trigger Button */}
          <Button variant="ghost" size="sm" onClick={() => setActionModalQuote(record)} title="More options">
            {(convertingId === record.id || convertingInvoiceId === record.id)
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <MoreVertical className="h-4 w-4" />}
          </Button>
        </div>
      ),
    },
  ];

  // ── Show form if in add/edit mode (like Products.tsx) ──
  if (id || window.location.pathname.includes('/add')) {
    return (
      <div className="space-y-3 animate-fadeIn">
        {/* Odoo-style Breadcrumb + Control Bar */}
        <div className="bg-white border border-gray-200 rounded px-3 py-1.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="hover:text-primary-600 cursor-pointer" onClick={handleFormClose}>Quotes</span>
            <span>/</span>
            <span className="font-semibold text-gray-700">
              {editingQuote ? editingQuote.quoteNo : 'New Quote'}
            </span>
          </div>
        </div>
        {/* QuoteForm handles its own Save/Discard buttons */}
        <div className="bg-white border border-gray-200 rounded shadow-md p-4 max-w-5xl mx-auto">
          <QuoteForm quote={editingQuote || undefined} onClose={handleFormClose} />
        </div>
      </div>
    );
  }

  // ── List View ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <PageHeader
        title="Quotes"
        searchPlaceholder="Search quotes..."
        onSearch={(value) => debouncedSearch(value)}
        actions={[
          { label: 'Add Quote', icon: <Plus className="h-4 w-4" />, onClick: handleAddQuote, variant: 'primary' as const },
        ]}
      />

      {/* Date Filter */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" />
            </div>
            <Button onClick={() => handleDateFilter(startDate, endDate)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
              Apply Filter
            </Button>
            {(startDate || endDate) && (
              <Button onClick={clearDateFilter} variant="outline" className="w-full sm:w-auto">Clear</Button>
            )}
          </div>
          {(startDate || endDate) && (
            <div className="mt-2 text-xs text-gray-600">Showing data from {startDate || 'start'} to {endDate || 'end'}</div>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <Table data={quotes} columns={columns} loading={loading} />

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Items per page:</span>
            <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, pagination?.total || 0)} of {pagination?.total || 0} quotes
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading} className="flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination?.totalPages || 1 }, (_, i) => i + 1).map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  disabled={loading}>{page}</button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(pagination?.totalPages || 1, currentPage + 1))}
              disabled={currentPage === (pagination?.totalPages || 1) || loading} className="flex items-center gap-1">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Convert to Invoice Modal */}
      <Modal isOpen={!!invoiceModalQuote} onClose={() => setInvoiceModalQuote(null)}
        title={`Convert ${invoiceModalQuote?.quoteNo} to Invoice`} size="xl">
        {invoiceModalQuote && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
              Customer: <span className="font-semibold">{invoiceModalQuote.customer?.name}</span>
              &nbsp;&bull;&nbsp; Quote Date: <span className="font-semibold">{formatDate(invoiceModalQuote.quoteDate)}</span>
            </div>
            {stockLoading ? (
              <div className="flex items-center justify-center py-10 gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-gray-500">Loading stock batches...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {(invoiceModalQuote.items || []).map((item: QuoteItem) => {
                  const batches: StockBatch[] = stockCache[item.productId.toString()] || [];
                  const sel = batchSelections[item.id] || { stockBatchId: '', saleUnit: 'box' };
                  return (
                    <div key={item.id} className="border border-gray-200 rounded p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-semibold text-gray-900 text-sm">
                          {item.product?.name || `Product #${item.productId}`}
                          {item.product?.grade && <span className="text-xs text-gray-500 font-normal ml-1">({item.product.grade})</span>}
                          {item.product?.sku && <span className="text-xs text-gray-500 font-normal ml-2">[{item.product.sku}]</span>}
                        </span>
                        <span className="ml-auto text-sm font-medium text-gray-700">Qty: {item.quantity} {item.unit}</span>
                        <span className="text-sm font-medium text-gray-700">Rate: ₹{item.rate}</span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-500 pl-6 italic">{item.description}</p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Stock Batch <span className="text-red-500">*</span></label>
                          {batches.length === 0 ? (
                            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">No stock available</div>
                          ) : (
                            <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={sel.stockBatchId}
                              onChange={(e) => setBatchSelections(prev => ({ ...prev, [item.id]: { ...sel, stockBatchId: e.target.value } }))}>
                              <option value="">Select batch...</option>
                              {batches.map((b: StockBatch) => (
                                <option key={b.id} value={b.id}>
                                  {(b as any).location?.name} — {(b as any).vendor?.name} | Boxes: {b.remainingBoxes} | Packs: {b.remainingPacks} | Pcs: {b.remainingPcs}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Sale Unit</label>
                          <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={sel.saleUnit}
                            onChange={(e) => setBatchSelections(prev => ({ ...prev, [item.id]: { ...sel, saleUnit: e.target.value } }))}>
                            <option value="box">Box</option>
                            <option value="pack">Pack</option>
                            <option value="piece">Piece</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <Button variant="outline" onClick={() => setInvoiceModalQuote(null)}>Cancel</Button>
              <Button onClick={handleInvoiceSubmit} loading={submittingInvoice} disabled={stockLoading}>
                Create Invoice
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Convert to Sales Order Confirmation Modal */}
      <Modal isOpen={!!salesModalQuote} onClose={closeSalesModal} title="Convert to Sales Order" size="sm">
        {salesModalQuote && (
          <div className="space-y-4 p-4">
            <p>Are you sure you want to convert quote <strong>{salesModalQuote.quoteNo}</strong> to a Sales Order?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeSalesModal}>Cancel</Button>
              <Button onClick={confirmConvertToSalesOrder} loading={convertingId === salesModalQuote.id}>Convert</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Action Modal */}
      <Modal isOpen={!!actionModalQuote} onClose={() => setActionModalQuote(null)}
        title={`Actions - ${actionModalQuote?.quoteNo}`} size="sm">
        {actionModalQuote && (
          <div className="space-y-3 p-1">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors border border-gray-100 font-medium"
              onClick={() => {
                const q = actionModalQuote;
                setActionModalQuote(null);
                handleConvertToSalesOrder(q);
              }}
            >
              <ShoppingCart className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <div className="font-semibold text-gray-900">Convert to Sales Order</div>
                <div className="text-xs text-gray-500">Create a new sales order from this quote</div>
              </div>
            </button>

            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors border border-gray-100 font-medium"
              onClick={() => {
                const q = actionModalQuote;
                setActionModalQuote(null);
                openInvoiceModal(q);
              }}
            >
              <FileText className="h-5 w-5 text-blue-600" />
              <div className="text-left">
                <div className="font-semibold text-gray-900">Convert to Invoice</div>
                <div className="text-xs text-gray-500">Generate an outward invoice for this quote</div>
              </div>
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Quotes;
