import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Download, Loader2, MoreVertical, ShoppingCart, FileText, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
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
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import QuoteForm from '@/components/forms/QuoteForm';

const Quotes: React.FC = () => {
  const dispatch = useAppDispatch();
  const { quotes, pagination, loading, error } = useAppSelector(
    (state) => state.quotes
  ) as { quotes: Quote[]; pagination: { page: number; totalPages: number; total: number; limit: number }; loading: boolean; error: string | null };

  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const [convertingId, setConvertingId] = useState<string | number | null>(null);
  const [convertingInvoiceId, _setConvertingInvoiceId] = useState<string | number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [invoiceModalQuote, setInvoiceModalQuote] = useState<Quote | null>(null);
  const [batchSelections, setBatchSelections] = useState<Record<string, { stockBatchId: string; saleUnit: string }>>({});
  const [stockCache, setStockCache] = useState<Record<string, StockBatch[]>>({});
  const [stockLoading, setStockLoading] = useState(false);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    dispatch(fetchQuotes({ page: currentPage, limit: 10, search, startDate, endDate }));
  }, [dispatch, search, currentPage, startDate, endDate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

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

  const openModal = (quote?: Quote) => {
    setEditingQuote(quote || null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingQuote(null);
  };

  const handleDelete = async (quote: Quote) => {
    if (window.confirm(`Are you sure you want to delete quote "${quote.quoteNo}"?`)) {
      try {
        await dispatch(deleteQuote(quote.id)).unwrap();
        toast.success('Quote deleted successfully');
      } catch (error) {
        // Error handled by Redux
      }
    }
  };

  const handleConvertToSalesOrder = async (quote: Quote) => {
    if (!window.confirm(`Convert "${quote.quoteNo}" to Sales Order?`)) return;
    setConvertingId(quote.id);
    try {
      await dispatch(convertQuoteToSalesOrder(quote.id)).unwrap();
      toast.success(`Sales Order created from ${quote.quoteNo}`);
      navigate('/sales-orders');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to convert');
    } finally {
      setConvertingId(null);
    }
  };

  const openInvoiceModal = async (quote: Quote) => {
    setInvoiceModalQuote(quote);
    setBatchSelections({});
    setStockCache({});
    setStockLoading(true);
    // Load stock for all items in parallel
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
    // Validate all items have batch selected
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
    } catch (error) {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sent' },
      accepted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Accepted' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      expired: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Expired' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const columns = [
    {
      key: 'quoteNo',
      title: 'Quote No',
      sortable: true,
    },
    {
      key: 'customer.name',
      title: 'Customer',
      render: (_: any, record: Quote) => record.customer?.name || '-',
    },
    {
      key: 'quoteDate',
      title: 'Quote Date',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'expiryDate',
      title: 'Expiry Date',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'totalAmount',
      title: 'Amount',
      render: (value: number) => `₹${value?.toFixed(2) || '0.00'}`,
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Quote) => (
        <div className="flex gap-1 sm:gap-2 items-center">
          <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(record)} title="Download PDF" disabled={downloadingId === record.id.toString()}>
            {downloadingId === record.id.toString()
              ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              : <Download className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openModal(record)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(record)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {/* Three-dot menu */}
          <div className="relative" ref={openMenuId === record.id ? menuRef : null}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpenMenuId(openMenuId === record.id ? null : record.id)}
              title="More options"
            >
              {(convertingId === record.id || convertingInvoiceId === record.id)
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <MoreVertical className="h-4 w-4" />}
            </Button>
            {openMenuId === record.id && (
              <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => { setOpenMenuId(null); handleConvertToSalesOrder(record); }}
                  disabled={convertingId === record.id}
                >
                  <ShoppingCart className="h-4 w-4 text-green-600" />
                  Convert to Sales Order
                </button>
                <button
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => { setOpenMenuId(null); openInvoiceModal(record); }}
                  disabled={convertingInvoiceId === record.id}
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  Convert to Invoice
                </button>
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Quotes"
        searchPlaceholder="Search quotes..."
        onSearch={(value) => debouncedSearch(value)}
        actions={[
          {
            label: 'Add Quote',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => openModal(),
            variant: 'primary' as const,
          },
        ]}
      />

      {/* Date Filter */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <Button
              onClick={() => handleDateFilter(startDate, endDate)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              Apply Filter
            </Button>
            {(startDate || endDate) && (
              <Button
                onClick={clearDateFilter}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Clear
              </Button>
            )}
          </div>
          {(startDate || endDate) && (
            <div className="mt-2 text-sm text-gray-600">
              Showing data from {startDate || 'start'} to {endDate || 'end'}
            </div>
          )}
        </div>
      </div>
      <div className="card overflow-x-auto">
        <Table data={quotes} columns={columns} loading={loading} />

        <Pagination
          currentPage={pagination?.page || 1}
          totalPages={pagination?.totalPages || 1}
          total={pagination?.total || 0}
          limit={pagination?.limit || 10}
          onPageChange={setCurrentPage}
          loading={loading}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingQuote ? 'Edit Quote' : 'Add Quote'}
        size="xl"
      >
        <QuoteForm quote={editingQuote || undefined} onClose={closeModal} />
      </Modal>

      {/* Convert to Invoice Modal */}
      <Modal
        isOpen={!!invoiceModalQuote}
        onClose={() => setInvoiceModalQuote(null)}
        title={`Convert ${invoiceModalQuote?.quoteNo} to Invoice`}
        size="xl"
      >
        {invoiceModalQuote && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
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
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">{item.product?.name || `Product #${item.productId}`}</span>
                        {item.product?.grade && <span className="text-xs text-gray-500">({item.product.grade})</span>}
                        <span className="ml-auto text-sm font-medium text-gray-700">Qty: {item.quantity} {item.unit}</span>
                        <span className="text-sm font-medium text-gray-700">Rate: ₹{item.rate}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Stock Batch <span className="text-red-500">*</span></label>
                          {batches.length === 0 ? (
                            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">No stock available</div>
                          ) : (
                            <select
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={sel.stockBatchId}
                              onChange={(e) => setBatchSelections(prev => ({ ...prev, [item.id]: { ...sel, stockBatchId: e.target.value } }))}
                            >
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
                          <select
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={sel.saleUnit}
                            onChange={(e) => setBatchSelections(prev => ({ ...prev, [item.id]: { ...sel, saleUnit: e.target.value } }))}
                          >
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
    </div>
  );
};

export default Quotes;
