import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Download, Loader2,
  MoreVertical, ShoppingCart, FileText, Package,
  ChevronLeft, ChevronRight, Mail, ChevronDown, ArrowLeft, X, Check, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchQuotes,
  fetchQuoteById,
  deleteQuote,
  downloadQuotePDF,
  convertQuoteToInvoice,
} from '@/slices/quoteSlice';
import { convertQuoteToSalesOrder } from '@/slices/salesOrderSlice';
import { fetchAvailableStock } from '@/slices/inventorySlice';
import { fetchSettings } from '@/slices/settingsSlice';
import { Quote, QuoteItem, StockBatch } from '@/types';
import { formatDate, formatCurrency, cn, debounce } from '@/utils';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import QuoteForm from '@/components/forms/QuoteForm';
import ShareDocumentModal from '@/components/ShareDocumentModal';
import { inventoryService } from '@/services/inventoryService';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const getStatusBadge = (status: string) => {
  const statusConfig = {
    draft: { bg: 'bg-gray-100 border-gray-200', text: 'text-gray-800', label: 'Draft' },
    sent: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Sent' },
    accepted: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Accepted' },
    rejected: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Rejected' },
    expired: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Expired' },
  };
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

// ─── Timeline / Visual Progress Indicator ─────────────────────────────────────

const renderTimeline = (status: string) => {
  const steps = [
    { label: 'Draft', active: true, done: ['sent', 'accepted', 'rejected', 'expired'].includes(status), color: 'blue' },
    { label: 'Sent', active: status === 'sent', done: ['accepted', 'rejected', 'expired'].includes(status), color: 'blue' },
  ];

  if (status === 'rejected') {
    steps.push({ label: 'Rejected', active: true, done: false, color: 'red' });
  } else if (status === 'expired') {
    steps.push({ label: 'Expired', active: true, done: false, color: 'amber' });
  } else {
    steps.push({ label: 'Accepted', active: status === 'accepted', done: false, color: 'green' });
  }

  return (
    <div className="flex items-center w-full max-w-lg mx-auto py-5 px-4 select-none relative">
      {steps.map((step, idx) => (
        <React.Fragment key={step.label}>
          {idx > 0 && (
            <div className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${step.active || step.done ? 'bg-blue-500' : 'bg-gray-250'
              }`} />
          )}
          <div className="flex flex-col items-center relative">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${step.done
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : step.active
                  ? step.color === 'red'
                    ? 'bg-red-500 border-red-500 text-white animate-pulse'
                    : step.color === 'amber'
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>
              {step.done ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="text-xs font-bold">{idx + 1}</span>
              )}
            </div>
            <span className={`text-[10px] font-bold uppercase mt-2 tracking-wider whitespace-nowrap absolute top-7 ${step.done ? 'text-emerald-600' : step.active ? 'text-blue-500' : 'text-gray-400'
              }`}>
              {step.label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Main Page Component ──────────────────────────────────────────────────────

const Quotes: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();

  const { quotes, currentQuote, loading, error, pagination } = useAppSelector(
    (state) => state.quotes
  ) as { quotes: Quote[]; currentQuote: Quote | null; loading: boolean; error: string | null; pagination: any };

  const { settings } = useAppSelector((state) => state.settings);

  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [search, setSearch] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dropdown states
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [sidebarFilterMenuOpen, setSidebarFilterMenuOpen] = useState(false);
  const [convertMenuOpen, setConvertMenuOpen] = useState(false);

  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const sidebarFilterDropdownRef = useRef<HTMLDivElement>(null);
  const convertDropdownRef = useRef<HTMLDivElement>(null);

  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const [convertingId, setConvertingId] = useState<string | number | null>(null);
  const [actionModalQuote, setActionModalQuote] = useState<Quote | null>(null);
  const [invoiceModalQuote, setInvoiceModalQuote] = useState<Quote | null>(null);
  const [batchSelections, setBatchSelections] = useState<Record<string, { stockBatchId: string; saleUnit: string }>>({});
  const [stockCache, setStockCache] = useState<Record<string, StockBatch[]>>({});
  const [stockLoading, setStockLoading] = useState(false);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [shareQuote, setShareQuote] = useState<Quote | null>(null);
  const [salesModalQuote, setSalesModalQuote] = useState<Quote | null>(null);
  const [salesOrderBatchSelections, setSalesOrderBatchSelections] = useState<Record<string, Array<{ id: string; stockBatchId: string; saleUnit: string; quantity: number }>>>({});
  const [salesOrderStockCache, setSalesOrderStockCache] = useState<Record<string, StockBatch[]>>({});
  const [salesOrderStockLoading, setSalesOrderStockLoading] = useState(false);

  // Tab & cost cache states for quote details view panel
  const [activeDetailTab, setActiveDetailTab] = useState<'preview' | 'pl'>('preview');
  const [costCache, setCostCache] = useState<Record<number, { costPerBox: number; costPerPack: number; costPerPcs: number }>>({});
  const [costLoading, setCostLoading] = useState(false);

  const isEditMode = window.location.pathname.includes('/edit');
  const isAddMode = window.location.pathname.includes('/add');
  const isViewMode = id && !isEditMode && !isAddMode;

  // Fetch settings on mount
  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setFilterMenuOpen(false);
      }
      if (sidebarFilterDropdownRef.current && !sidebarFilterDropdownRef.current.contains(event.target as Node)) {
        setSidebarFilterMenuOpen(false);
      }
      if (convertDropdownRef.current && !convertDropdownRef.current.contains(event.target as Node)) {
        setConvertMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Quotes list (larger list for sidebar view, paginated for main list view)
  useEffect(() => {
    if (isViewMode) {
      dispatch(fetchQuotes({ limit: 200, search: sidebarSearch, status: statusFilter === 'all' ? undefined : statusFilter }));
    } else if (!isEditMode && !isAddMode) {
      dispatch(fetchQuotes({ page: currentPage, limit: pageSize, search, status: statusFilter === 'all' ? undefined : statusFilter }));
    }
  }, [dispatch, search, sidebarSearch, statusFilter, currentPage, pageSize, id, isEditMode, isAddMode, isViewMode]);

  // Fetch single quote details
  useEffect(() => {
    if (id && !isAddMode) {
      dispatch(fetchQuoteById(id));
    }
  }, [id, dispatch, isAddMode]);

  // Handle Edit navigation & setup
  useEffect(() => {
    if (id && isEditMode) {
      const found = quotes.find((q) => q.id.toString() === id) || currentQuote;
      if (found && found.id.toString() === id.toString()) {
        setEditingQuote(found);
      }
    }
  }, [id, isEditMode, quotes, currentQuote]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // Reset tab to preview when viewing a different quote
  useEffect(() => {
    setActiveDetailTab('preview');
  }, [id]);

  // Fetch cost prices when activeQuote is loaded in view mode
  useEffect(() => {
    const activeQuote = currentQuote;
    if (!activeQuote?.items) return;

    const fetchCosts = async () => {
      const neededIds = activeQuote.items!
        .map((item) => Number(item.productId))
        .filter((id) => id > 0 && !costCache[id]);

      if (neededIds.length === 0) return;

      setCostLoading(true);
      const newCosts = { ...costCache };
      try {
        await Promise.all(
          neededIds.map(async (id) => {
            try {
              // getCostHistory returns ALL batches (incl. exhausted ones), newest-first
              const batches = await inventoryService.getCostHistory(id.toString());
              if (batches && batches.length > 0) {
                const latest = batches[0]; // already newest-first from API
                newCosts[id] = {
                  costPerBox: Number(latest.costPerBox) || 0,
                  costPerPack: Number(latest.costPerPack) || (Number(latest.costPerBox) / (latest.packPerBox || 1)) || 0,
                  costPerPcs: Number(latest.costPerPcs) || 0,
                };
              } else {
                newCosts[id] = { costPerBox: 0, costPerPack: 0, costPerPcs: 0 };
              }
            } catch (error) {
              console.error(`Error fetching stock for product ${id}:`, error);
              newCosts[id] = { costPerBox: 0, costPerPack: 0, costPerPcs: 0 };
            }
          })
        );
        setCostCache(newCosts);
      } catch (err) {
        console.error('Error fetching costs in view mode:', err);
      } finally {
        setCostLoading(false);
      }
    };

    fetchCosts();
  }, [currentQuote, costCache]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const debouncedSidebarSearch = debounce((value: string) => {
    setSidebarSearch(value);
  });

  // Navigation handlers
  const handleAddQuote = () => navigate('/quotes/add');

  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    navigate(`/quotes/edit/${quote.id}`);
  };

  const handleFormClose = () => {
    if (isEditMode) {
      navigate('/quotes');
    } else if (editingQuote) {
      navigate(`/quotes/${editingQuote.id}`);
    } else {
      navigate('/quotes');
    }
    setEditingQuote(null);
    dispatch(fetchQuotes({ search, page: currentPage, limit: pageSize }));
  };

  const handleDelete = async (quote: Quote) => {
    if (window.confirm(`Are you sure you want to delete quote "${quote.quoteNo}"?`)) {
      try {
        await dispatch(deleteQuote(quote.id)).unwrap();
        toast.success('Quote deleted successfully');
        navigate('/quotes');
      } catch {
        // Error handled by Redux
      }
    }
  };

  const openSalesModal = async (quote: Quote) => {
    setSalesModalQuote(quote);
    setSalesOrderBatchSelections({});
    setSalesOrderStockCache({});
    setSalesOrderStockLoading(true);
    try {
      const items = quote.items || [];
      const uniqueProductIds = [...new Set(items.map((i: QuoteItem) => i.productId.toString()))];
      const results = await Promise.all(
        uniqueProductIds.map((pid) => dispatch(fetchAvailableStock({ productId: pid })).unwrap())
      );
      const cache: Record<string, StockBatch[]> = {};
      uniqueProductIds.forEach((pid, idx) => { cache[pid] = results[idx]; });
      setSalesOrderStockCache(cache);

      // Pre-select first batch with sufficient stock if available, and set default unit
      const initialSelections: Record<string, Array<{ id: string; stockBatchId: string; saleUnit: string; quantity: number }>> = {};
      items.forEach((item) => {
        const batches = cache[item.productId.toString()] || [];
        const defaultUnit = item.unit || 'box';
        // Try to find a batch that can fulfill item.quantity
        const matchingBatch = batches.find((b) => {
          if (defaultUnit === 'box') return b.remainingBoxes >= item.quantity;
          if (defaultUnit === 'pack') return b.remainingPacks >= item.quantity;
          return b.remainingPcs >= item.quantity;
        }) || batches[0];

        initialSelections[item.id] = [{
          id: Math.random().toString(),
          stockBatchId: matchingBatch ? matchingBatch.id.toString() : '',
          saleUnit: defaultUnit,
          quantity: item.quantity,
        }];
      });
      setSalesOrderBatchSelections(initialSelections);
    } catch (err: any) {
      toast.error('Failed to load available stock batches');
    } finally {
      setSalesOrderStockLoading(false);
    }
  };

  const closeSalesModal = () => {
    setSalesModalQuote(null);
  };

  const confirmConvertToSalesOrder = async () => {
    if (!salesModalQuote) return;
    const items = salesModalQuote.items || [];
    
    const itemsPayload: Array<{ quoteItemId?: string | number; productId: string | number; stockBatchId: string | number; saleUnit: string; quantity: number }> = [];

    // Accumulate requested amounts per batch
    const batchRequestedAmounts: Record<string, Record<string, number>> = {};

    for (const item of items) {
      const selections = salesOrderBatchSelections[item.id] || [];
      if (selections.length === 0) {
        toast.error(`Please select at least one stock batch for: ${item.product?.name || item.productId}`);
        return;
      }

      let totalSelectedQty = 0;
      for (const sel of selections) {
        if (!sel.stockBatchId) {
          toast.error(`Please select a stock batch for all rows of: ${item.product?.name || item.productId}`);
          return;
        }
        if (sel.quantity <= 0) {
          toast.error(`Quantity must be greater than 0 for all rows of: ${item.product?.name || item.productId}`);
          return;
        }

        totalSelectedQty += sel.quantity;

        // Accumulate requested amounts per batch
        if (!batchRequestedAmounts[sel.stockBatchId]) {
          batchRequestedAmounts[sel.stockBatchId] = { box: 0, pack: 0, piece: 0 };
        }
        batchRequestedAmounts[sel.stockBatchId][sel.saleUnit] = (batchRequestedAmounts[sel.stockBatchId][sel.saleUnit] || 0) + sel.quantity;

        itemsPayload.push({
          quoteItemId: item.id,
          productId: item.productId,
          stockBatchId: sel.stockBatchId,
          saleUnit: sel.saleUnit,
          quantity: sel.quantity,
        });
      }

      // Check if total selected quantity matches the quote quantity
      if (Math.abs(totalSelectedQty - item.quantity) > 0.001) {
        toast.error(`Total selected quantity (${totalSelectedQty} ${item.unit}) for ${item.product?.name} must equal the requested quantity (${item.quantity} ${item.unit})`);
        return;
      }
    }

    // Check stock availability for all requested batches
    for (const batchId of Object.keys(batchRequestedAmounts)) {
      let foundBatch: StockBatch | undefined;
      for (const pid of Object.keys(salesOrderStockCache)) {
        const batch = salesOrderStockCache[pid]?.find(b => b.id.toString() === batchId);
        if (batch) {
          foundBatch = batch;
          break;
        }
      }

      if (foundBatch) {
        const availBoxes = foundBatch.remainingBoxes - (foundBatch.bookedBoxes || 0);
        const availPacks = foundBatch.remainingPacks - (foundBatch.bookedPacks || 0);
        const availPcs = foundBatch.remainingPcs - (foundBatch.bookedPcs || 0);

        const requested = batchRequestedAmounts[batchId];

        if (requested.box > 0 && requested.box > availBoxes) {
          toast.error(`Insufficient available box stock in batch ${foundBatch.batchCode || foundBatch.id}. Available: ${availBoxes}, Requested: ${requested.box}`);
          return;
        }
        if (requested.pack > 0 && requested.pack > availPacks) {
          toast.error(`Insufficient available pack stock in batch ${foundBatch.batchCode || foundBatch.id}. Available: ${availPacks}, Requested: ${requested.pack}`);
          return;
        }
        if (requested.piece > 0 && requested.piece > availPcs) {
          toast.error(`Insufficient available piece stock in batch ${foundBatch.batchCode || foundBatch.id}. Available: ${availPcs}, Requested: ${requested.piece}`);
          return;
        }
      }
    }

    setConvertingId(salesModalQuote.id);
    try {
      await dispatch(convertQuoteToSalesOrder({ quoteId: salesModalQuote.id, items: itemsPayload })).unwrap();
      toast.success(
        salesModalQuote.status === 'accepted'
          ? `Sales Order updated and stock re-booked from ${salesModalQuote.quoteNo}`
          : `Sales Order created and stock booked from ${salesModalQuote.quoteNo}`
      );
      navigate('/sales-orders');
    } catch (e: any) {
      toast.error(e?.message || e || 'Failed to convert');
    } finally {
      setConvertingId(null);
      closeSalesModal();
    }
  };

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

  // ── Show form if in add/edit mode ──
  if (isEditMode || isAddMode) {
    return (
      <div className="space-y-3 animate-fadeIn">
        {/* Zoho-style Breadcrumb + Control Bar */}
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

  // ─── SPLIT PANE VIEW (View Mode) ──────────────────────────────────────────

  if (isViewMode) {
    const activeQuote = currentQuote;
    const itemsSubtotal = activeQuote?.items ? activeQuote.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0) : 0;

    // Compute P&L Summary for View Mode
    const plSummary = (() => {
      if (!activeQuote?.items) return null;
      let totalSales = 0;
      let totalCOGS = 0;

      const itemsPL = activeQuote.items.map((item) => {
        const qty = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        const costInfo = costCache[Number(item.productId)];
        const unit = item.unit;

        let costPerUnit = 0;
        if (costInfo) {
          if (unit === 'box') costPerUnit = costInfo.costPerBox;
          else if (unit === 'pack') costPerUnit = costInfo.costPerPack;
          else costPerUnit = costInfo.costPerPcs;
        }

        const gstRate = (item as any).taxRate || (item.product?.category?.gstRate) || 0;
        const itemBaseSales = qty * rate;
        const itemGstAmt = (itemBaseSales * gstRate) / 100;
        const itemSales = itemBaseSales + itemGstAmt;
        const itemCOGS = qty * costPerUnit;
        const itemProfit = itemSales - itemCOGS;
        // If no stock data (costPerUnit is 0), margin is unknown — show 0 instead of misleading 100%
        const itemMargin = (costPerUnit === 0 || itemSales === 0) ? 0 : (itemProfit / itemSales) * 100;

        totalSales += itemSales;
        totalCOGS += itemCOGS;

        return {
          ...item,
          costPerUnit,
          itemSales,
          itemCOGS,
          itemProfit,
          itemMargin,
        };
      });

      const discount = Number(activeQuote.discount) || 0;
      const netRevenue = totalSales - discount;
      const netProfit = netRevenue - totalCOGS;
      // If COGS is entirely zero (no stock for any product), overall margin is unknown — show 0
      const netMargin = (totalCOGS === 0 || netRevenue === 0) ? 0 : (netProfit / netRevenue) * 100;

      return {
        itemsPL,
        totalSales,
        totalCOGS,
        discount,
        netRevenue,
        netProfit,
        netMargin,
      };
    })();

    return (
      <div className="flex h-[calc(100vh-80px)] border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm -mt-2">
        {/* LEFT COLUMN: Sidebar Quotes list */}
        <div className="hidden md:flex md:w-[28%] md:min-w-[280px] md:max-w-[340px] border-r border-gray-200 flex-col bg-gray-50/50">

          {/* Sidebar Header */}
          <div className="p-3 border-b border-gray-200 bg-white flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="relative" ref={sidebarFilterDropdownRef}>
                <div
                  onClick={() => setSidebarFilterMenuOpen(!sidebarFilterMenuOpen)}
                  className="flex items-center gap-1 cursor-pointer select-none hover:opacity-85"
                >
                  <span className="text-[13px] font-bold text-gray-800 tracking-tight">
                    {statusFilter === 'all' ? 'All Quotes' : statusFilter.toUpperCase()}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-550" />
                </div>
                {sidebarFilterMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 rounded bg-white shadow-lg ring-1 ring-black ring-opacity-5 border border-gray-200 divide-y divide-gray-100 z-50 animate-fadeIn">
                    <div className="py-1">
                      {['all', 'draft', 'sent', 'accepted', 'rejected', 'expired'].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => { setStatusFilter(filter); setSidebarFilterMenuOpen(false); }}
                          className={cn(
                            "w-full text-left px-4 py-2 text-xs font-semibold hover:bg-gray-100 transition-colors flex items-center justify-between",
                            statusFilter === filter ? "text-blue-500 font-bold" : "text-gray-700"
                          )}
                        >
                          <span>{filter === 'all' ? 'All Quotes' : filter.charAt(0).toUpperCase() + filter.slice(1)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Add Button */}
              <button
                onClick={handleAddQuote}
                className="w-6.5 h-6.5 flex items-center justify-center text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors"
                title="New Quote"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search quotes..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                onChange={(e) => debouncedSidebarSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Sidebar Scrollable Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 bg-white">
            {loading && !quotes.length ? (
              <div className="p-8 text-center text-xs text-gray-450 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span>Loading sidebar...</span>
              </div>
            ) : quotes.length > 0 ? (
              quotes.map((q) => {
                const isActive = id === q.id.toString();
                return (
                  <div
                    key={q.id}
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    className={cn(
                      'p-3 flex flex-col gap-1 cursor-pointer transition-colors border-l-[3px] border-transparent hover:bg-gray-50/70',
                      isActive ? 'bg-blue-50/40 border-blue-500' : ''
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className={cn(
                        "text-[12px] truncate font-bold",
                        isActive ? "text-blue-600" : "text-gray-700"
                      )}>
                        {q.quoteNo}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">{formatDate(q.quoteDate)}</span>
                    </div>
                    <div className="flex justify-between items-end mt-0.5">
                      <span className="text-[11px] text-gray-500 font-semibold truncate max-w-[150px]">{q.customer?.name || '-'}</span>
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-bold text-gray-800">{formatCurrency(q.totalAmount)}</span>
                        <span className={cn(
                          "text-[9px] font-bold uppercase mt-1 px-1 rounded-sm border",
                          q.status === 'accepted' ? 'text-emerald-600 bg-emerald-50/40 border-emerald-100' :
                            q.status === 'draft' ? 'text-gray-500 bg-gray-50 border-gray-100' :
                              q.status === 'sent' ? 'text-blue-600 bg-blue-50/40 border-blue-100' :
                                q.status === 'rejected' ? 'text-red-600 bg-red-50/40 border-red-100' :
                                  'text-amber-600 bg-amber-50/40 border-amber-100' // expired
                        )}>
                          {q.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-gray-450 italic">No quotes found</div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Quote Details Panel */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50/30">
          {!activeQuote ? (
            <div className="flex-1 flex flex-col items-center justify-center p-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="text-xs text-gray-500 font-medium animate-pulse">Loading quotation details...</span>
            </div>
          ) : (
            <>
              {/* Sticky Details Header */}
              <div className="px-4 py-3.5 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-20 shadow-xs flex-shrink-0 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => navigate('/quotes')}
                    className="p-1.5 -ml-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 md:hidden flex-shrink-0"
                    title="Back to List"
                  >
                    <ArrowLeft className="h-5.5 w-5.5" />
                  </button>
                  <h2 className="text-sm sm:text-base font-extrabold text-gray-900 tracking-tight truncate flex items-center gap-1.5">
                    <span>Quote</span>
                    <span className="text-blue-600 font-black">{activeQuote.quoteNo}</span>
                  </h2>
                  <span className="h-4.5 w-px bg-gray-250 mx-1 flex-shrink-0 hidden sm:inline"></span>
                  <div className="hidden sm:inline-block flex-shrink-0">
                    {getStatusBadge(activeQuote.status)}
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Edit */}
                  <button
                    className="h-8 text-xs font-bold px-3 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 rounded text-gray-750 transition-all shadow-3xs"
                    onClick={() => handleEditQuote(activeQuote)}
                  >
                    Edit
                  </button>

                  {/* Download PDF */}
                  <button
                    onClick={() => handleDownloadPDF(activeQuote)}
                    disabled={downloadingId === activeQuote.id.toString()}
                    className="h-8 w-8 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 rounded text-gray-700 flex items-center justify-center transition-all shadow-3xs hidden md:flex"
                    title="Download PDF"
                  >
                    {downloadingId === activeQuote.id.toString() ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </button>

                  {/* Share Document Modal trigger */}
                  <button
                    onClick={() => setShareQuote(activeQuote)}
                    className="h-8 w-8 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 rounded text-gray-700 flex items-center justify-center transition-all shadow-3xs hidden md:flex"
                    title="Send Email"
                  >
                    <Mail className="h-4 w-4" />
                  </button>

                  {/* Convert Options Dropdown */}
                  <div className="relative hidden md:block" ref={convertDropdownRef}>
                    <button
                      onClick={() => setConvertMenuOpen(!convertMenuOpen)}
                      className="h-8 text-xs font-bold px-3 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <span>Convert</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    {convertMenuOpen && (
                      <div className="absolute right-0 mt-1 w-48 rounded bg-white shadow-lg border border-gray-200 divide-y divide-gray-100 z-50 animate-fadeIn">
                        <div className="py-1">
                          <button
                            onClick={() => { setConvertMenuOpen(false); handleConvertToSalesOrder(activeQuote); }}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-gray-50 text-gray-750 flex items-center gap-2"
                          >
                            <ShoppingCart className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Convert to Sales Order</span>
                          </button>
                          <button
                            onClick={() => { setConvertMenuOpen(false); openInvoiceModal(activeQuote); }}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-gray-50 text-gray-750 flex items-center gap-2"
                          >
                            <FileText className="h-3.5 w-3.5 text-blue-500" />
                            <span>Convert to Invoice</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* More actions (Delete) */}
                  <button
                    onClick={() => handleDelete(activeQuote)}
                    className="h-8 text-xs font-bold px-2.5 sm:px-3 text-red-600 hover:text-red-700 border border-gray-300 hover:bg-red-50 rounded transition-all shadow-3xs hidden md:inline-flex"
                    title="Delete Quote"
                  >
                    Delete
                  </button>

                  {/* More actions dropdown/modal trigger (Mobile) */}
                  <button
                    onClick={() => setActionModalQuote(activeQuote)}
                    className="h-8 w-8 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 rounded text-gray-700 flex items-center justify-center transition-all shadow-3xs md:hidden"
                    title="More Actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {/* Close pane */}
                  <button
                    onClick={() => navigate('/quotes')}
                    className="hidden md:flex p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-500 ml-1"
                    title="Close Panel"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="bg-white border-b border-gray-100 p-2.5 flex-shrink-0 shadow-3xs">
                {renderTimeline(activeQuote.status)}
              </div>

              {/* View Tabs */}
              <div className="bg-white border-b border-gray-200 flex px-4 flex-shrink-0">
                <button
                  type="button"
                  className={`py-2 px-4 font-semibold text-xs border-b-2 transition-all ${activeDetailTab === 'preview'
                      ? 'border-blue-500 text-blue-600 font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  onClick={() => setActiveDetailTab('preview')}
                >
                  📄 Quotation Preview
                </button>
                <button
                  type="button"
                  className={`py-2 px-4 font-semibold text-xs border-b-2 transition-all flex items-center gap-1.5 ${activeDetailTab === 'pl'
                      ? 'border-blue-500 text-blue-600 font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  onClick={() => setActiveDetailTab('pl')}
                >
                  📈 P&L Analysis
                </button>
              </div>

              {activeDetailTab === 'preview' ? (
                /* Document Paper Preview Area */
                <div className="flex-1 p-2 sm:p-5 overflow-y-auto">
                  <div className="bg-white border border-gray-250/70 rounded-lg shadow-md p-4 sm:p-6 md:p-10 max-w-4xl mx-auto my-3 min-h-[900px] flex flex-col justify-between">
                    <div>
                      {/* Header */}
                      <div className="flex justify-between items-start border-b border-gray-100 pb-5 mb-5">
                        <div>
                          <h1 className="text-xl md:text-2xl font-black tracking-tight text-emerald-700 uppercase">
                            {settings?.companyName || 'VEGNAR GREENS'}
                          </h1>
                          <p className="text-[10px] text-gray-450 mt-1 uppercase font-bold tracking-wider leading-relaxed whitespace-pre-line">
                            {settings?.companyAddress || 'Vegnar Greens LLP\n757, Food Park, Phase 1, Sector 38\nHSIIDC, Rai, Sonipat, Haryana, 131029'}
                            {settings?.companyGstin && (
                              <>
                                <br />GSTIN: {settings.companyGstin}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <h2 className="text-lg md:text-xl font-black tracking-wider text-gray-300 uppercase">QUOTATION</h2>
                          <div className="text-xs text-gray-650 mt-3.5 space-y-1.5 font-semibold">
                            <div>
                              <span className="text-gray-400 font-bold uppercase text-[9px] mr-1.5">Quote No:</span>
                              <span className="text-gray-900 font-extrabold">{activeQuote.quoteNo}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 font-bold uppercase text-[9px] mr-1.5">Date:</span>
                              <span className="text-gray-900">{formatDate(activeQuote.quoteDate)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 font-bold uppercase text-[9px] mr-1.5">Expiry:</span>
                              <span className="text-gray-900">{formatDate(activeQuote.expiryDate)}</span>
                            </div>
                            {(activeQuote as any).reference && (
                              <div>
                                <span className="text-gray-400 font-bold uppercase text-[9px] mr-1.5">Reference:</span>
                                <span className="text-gray-900">{(activeQuote as any).reference}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Address Section */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 mb-6">
                        <div>
                          <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To</h3>
                          <div className="text-xs text-gray-800 font-semibold space-y-1">
                            <div className="font-extrabold text-gray-950 text-sm">{activeQuote.customer?.name}</div>
                            {activeQuote.customer?.email && <div className="text-gray-500 font-medium">Email: {activeQuote.customer.email}</div>}
                            {activeQuote.customer?.phone && <div className="text-gray-500 font-medium">Phone: {activeQuote.customer.phone}</div>}
                            {activeQuote.customer?.address && (
                              <div className="text-gray-550 italic font-medium leading-relaxed mt-1">
                                {activeQuote.customer.address}
                              </div>
                            )}
                            {activeQuote.customer?.gstNumber && (
                              <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wide mt-1.5 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-150 inline-block">
                                GSTIN: {activeQuote.customer.gstNumber}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Ship To</h3>
                          <div className="text-xs text-gray-800 font-semibold space-y-1">
                            <div className="font-extrabold text-gray-955 text-sm">{activeQuote.customer?.name}</div>
                            {activeQuote.customer?.shippingAddress ? (
                              <div className="text-gray-550 italic font-medium leading-relaxed mt-1">
                                {activeQuote.customer.shippingAddress}
                              </div>
                            ) : activeQuote.customer?.address ? (
                              <div className="text-gray-550 italic font-medium leading-relaxed mt-1">
                                {activeQuote.customer.address}
                              </div>
                            ) : (
                              <div className="text-gray-400 italic">No shipping address provided</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Delivery & Payment details */}
                      {((activeQuote as any).paymentTerms || (activeQuote as any).termsOfDelivery) && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/50 border border-gray-200/60 rounded px-4 py-2.5 mb-6 text-xs font-semibold">
                          {(activeQuote as any).paymentTerms && (
                            <div>
                              <span className="block text-[8px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Payment Terms</span>
                              <span className="text-gray-700">{(activeQuote as any).paymentTerms}</span>
                            </div>
                          )}
                          {(activeQuote as any).termsOfDelivery && (
                            <div>
                              <span className="block text-[8px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Delivery Terms</span>
                              <span className="text-gray-700">{(activeQuote as any).termsOfDelivery}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Items Table */}
                      <div className="border border-gray-200 rounded overflow-x-auto mb-5 shadow-3xs">
                        <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                          <thead className="bg-gray-50/75">
                            <tr className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">
                              <th className="px-3.5 py-2.5 text-center w-12 border-r border-gray-200">#</th>
                              <th className="px-4 py-2.5 border-r border-gray-200">Product & Description</th>
                              <th className="px-3 py-2.5 text-right w-20 border-r border-gray-200">Qty</th>
                              <th className="px-3 py-2.5 text-left w-20 border-r border-gray-200">Unit</th>
                              <th className="px-3.5 py-2.5 text-right w-28 border-r border-gray-200">Rate</th>
                              <th className="px-3 py-2.5 text-right w-20 border-r border-gray-200">GST %</th>
                              <th className="px-3.5 py-2.5 text-right w-28 border-r border-gray-200">GST Amt</th>
                              <th className="px-4 py-2.5 text-right w-32">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-150 bg-white font-medium text-gray-700">
                            {(activeQuote.items || []).map((item: QuoteItem, idx: number) => {
                              const itemQty = Number(item.quantity) || 0;
                              const itemRate = Number(item.rate) || 0;
                              const itemTaxRate = (item as any).taxRate || (item.product?.category?.gstRate) || 0;
                              const itemAmount = itemQty * itemRate;
                              const itemGstAmt = (itemAmount * itemTaxRate) / 100;
                              const itemTotal = itemAmount + itemGstAmt;

                              return (
                                <tr key={item.id} className="hover:bg-gray-50/20 transition-colors">
                                  <td className="px-3.5 py-2.5 text-center text-gray-400 font-bold border-r border-gray-100">{idx + 1}</td>
                                  <td className="px-4 py-2.5 border-r border-gray-100">
                                    <div className="font-bold text-gray-905">{item.product?.name || `Product #${item.productId}`}</div>
                                    {item.description && (
                                      <p className="text-[11px] text-gray-400 mt-0.5 italic font-medium">{item.description}</p>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-right border-r border-gray-100">{itemQty}</td>
                                  <td className="px-3 py-2.5 text-left capitalize border-r border-gray-100">{item.unit}</td>
                                  <td className="px-3.5 py-2.5 text-right border-r border-gray-100">₹{itemRate.toFixed(2)}</td>
                                  <td className="px-3 py-2.5 text-right border-r border-gray-100">{itemTaxRate}%</td>
                                  <td className="px-3.5 py-2.5 text-right text-gray-500 border-r border-gray-100">₹{itemGstAmt.toFixed(2)}</td>
                                  <td className="px-4 py-2.5 text-right font-bold text-gray-900">₹{itemTotal.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary Calculations */}
                      <div className="flex justify-end mb-4">
                        <div className="w-80 text-xs font-semibold space-y-2 text-right">
                          <div className="flex justify-between text-gray-500 px-1">
                            <span>Subtotal</span>
                            <span>₹{itemsSubtotal.toFixed(2)}</span>
                          </div>
                          {Number(activeQuote.tax) > 0 && (
                            <div className="flex justify-between text-gray-500 px-1">
                              <span>GST Amount</span>
                              <span>+₹{Number(activeQuote.tax).toFixed(2)}</span>
                            </div>
                          )}
                          {Number(activeQuote.discount) > 0 && (
                            <div className="flex justify-between text-gray-500 px-1">
                              <span>Discount</span>
                              <span>-₹{Number(activeQuote.discount).toFixed(2)}</span>
                            </div>
                          )}
                          {Number(activeQuote.shippingCharge) > 0 && (
                            <div className="flex justify-between text-gray-500 px-1">
                              <span>Shipping Charge</span>
                              <span>+₹{Number(activeQuote.shippingCharge).toFixed(2)}</span>
                            </div>
                          )}
                          {Number((activeQuote as any).adjustment) !== 0 && (
                            <div className="flex justify-between text-gray-500 px-1">
                              <span>Round Off</span>
                              <span>₹{Number((activeQuote as any).adjustment).toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-black text-gray-905 text-sm border-t border-gray-200 pt-2 px-2 py-1.5 bg-gray-50/60 rounded">
                            <span>Grand Total</span>
                            <span className="text-blue-600 font-black">₹{activeQuote.totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes / Terms */}
                    <div className="border-t border-gray-150 pt-5 mt-5 space-y-3.5 text-left">
                      {activeQuote.notes && (
                        <div>
                          <h4 className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Notes</h4>
                          <p className="text-xs text-gray-600 leading-relaxed font-semibold italic">{activeQuote.notes}</p>
                        </div>
                      )}
                      {activeQuote.termsAndConditions && (
                        <div>
                          <h4 className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Terms & Conditions</h4>
                          <p className="text-xs text-gray-550 leading-relaxed font-semibold whitespace-pre-wrap">{activeQuote.termsAndConditions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* P&L tab content */
                <div className="flex-1 p-4 sm:p-5 overflow-y-auto bg-gray-50/20">
                  <div className="max-w-4xl mx-auto space-y-4 animate-fadeIn">

                    {/* Cost loading indicator */}
                    {costLoading && (
                      <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        <svg className="animate-spin h-3.5 w-3.5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Fetching latest stock cost prices…
                      </div>
                    )}

                    {/* No items */}
                    {(!plSummary || plSummary.itemsPL.length === 0) && !costLoading && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-4 justify-center italic">
                        No items in this quote.
                      </div>
                    )}

                    {/* No-stock warning */}
                    {!costLoading && plSummary && plSummary.itemsPL.some(i => i.costPerUnit === 0) && plSummary.itemsPL.length > 0 && (
                      <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                        <span className="text-base leading-none mt-0.5">⚠️</span>
                        <div>
                          <span className="font-bold">Missing stock cost data</span> – one or more products have no inward stock batches recorded, so their purchase cost could not be estimated. P&L figures marked <span className="font-bold text-amber-800">No Stock Data</span> may be inaccurate.
                        </div>
                      </div>
                    )}

                    {/* Summary cards */}
                    {plSummary && plSummary.itemsPL.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-3xs">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gross Sales</span>
                          <span className="block text-sm font-black text-gray-905 mt-1">₹{plSummary.totalSales.toFixed(2)}</span>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-3xs">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Discount</span>
                          <span className="block text-sm font-black text-orange-600 mt-1">– ₹{plSummary.discount.toFixed(2)}</span>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-3xs">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Net Revenue</span>
                          <span className="block text-sm font-black text-blue-700 mt-1">₹{plSummary.netRevenue.toFixed(2)}</span>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-3xs">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Est. COGS
                            {plSummary.itemsPL.some(i => i.costPerUnit === 0) && (
                              <span className="ml-1 text-[9px] font-bold text-amber-600">⚠ partial</span>
                            )}
                          </span>
                          <span className="block text-sm font-black text-gray-905 mt-1">₹{plSummary.totalCOGS.toFixed(2)}</span>
                        </div>
                        <div className={`border rounded-lg p-3 shadow-3xs ${plSummary.netProfit >= 0 ? 'bg-emerald-50/40 border-emerald-200 text-emerald-900' : 'bg-red-50/40 border-red-200 text-red-900'}`}>
                          <span className="block text-[10px] font-bold uppercase tracking-wider opacity-75">Est. Net Profit</span>
                          <span className="block text-sm font-black mt-1">₹{plSummary.netProfit.toFixed(2)}</span>
                        </div>
                        <div className={`border rounded-lg p-3 shadow-3xs ${plSummary.netMargin >= 0 ? 'bg-emerald-50/40 border-emerald-200 text-emerald-900' : 'bg-red-50/40 border-red-200 text-red-900'}`}>
                          <span className="block text-[10px] font-bold uppercase tracking-wider opacity-75">Gross Margin</span>
                          <span className="block text-sm font-black mt-1">{plSummary.netMargin >= 0 ? '📈' : '📉'} {plSummary.netMargin.toFixed(2)}%</span>
                        </div>
                      </div>
                    )}

                    {/* Product wise breakdown */}
                    {plSummary && plSummary.itemsPL.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
                        <div className="px-3.5 py-2.5 border-b border-gray-200 bg-gray-50/70 font-bold text-xs text-gray-705">
                          Product-Wise P&L Breakdown
                        </div>
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                              <th className="p-2.5">Product & SKU</th>
                              <th className="p-2.5 text-right w-16">Qty</th>
                              <th className="p-2.5 text-left w-16">Unit</th>
                              <th className="p-2.5 text-right w-24">Est. Cost/Unit</th>
                              <th className="p-2.5 text-right w-24">Sales Rate</th>
                              <th className="p-2.5 text-right w-28">Total Cost</th>
                              <th className="p-2.5 text-right w-28">Total Revenue</th>
                              <th className="p-2.5 text-right w-24">Profit</th>
                              <th className="p-2.5 text-right w-20">Margin</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {plSummary.itemsPL.map((item, idx) => {
                              const hasNoStock = item.costPerUnit === 0;
                              return (
                                <tr key={idx} className={`hover:bg-gray-50/30 ${hasNoStock ? 'bg-amber-50/10' : ''}`}>
                                  <td className="p-2.5">
                                    <div className="font-bold text-gray-800">
                                      {item.product?.name || `Product #${item.productId}`}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                      SKU: {item.product?.sku || '-'}
                                    </div>
                                    {hasNoStock && (
                                      <span className="inline-flex items-center gap-0.5 mt-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                        ⚠ No Stock Data
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-right font-semibold">{item.quantity}</td>
                                  <td className="p-2.5 text-left capitalize text-gray-500">{item.unit}</td>
                                  <td className={`p-2.5 text-right ${hasNoStock ? 'text-amber-500' : 'text-gray-500'}`}>
                                    ₹{item.costPerUnit.toFixed(2)}
                                  </td>
                                  <td className="p-2.5 text-right">₹{Number(item.rate || 0).toFixed(2)}</td>
                                  <td className={`p-2.5 text-right font-medium ${hasNoStock ? 'text-amber-500' : 'text-gray-500'}`}>
                                    ₹{item.itemCOGS.toFixed(2)}
                                  </td>
                                  <td className="p-2.5 text-right font-medium">₹{item.itemSales.toFixed(2)}</td>
                                  <td className={`p-2.5 text-right font-bold ${item.itemProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    ₹{item.itemProfit.toFixed(2)}
                                  </td>
                                  <td className="p-2.5 text-right">
                                    <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${hasNoStock
                                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                        : item.itemMargin >= 0
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                          : 'bg-red-50 text-red-600 border border-red-100'
                                      }`}>
                                      {item.itemMargin.toFixed(1)}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="text-[9px] text-gray-400 italic leading-normal px-1">
                      * P&L calculations are estimates. Products with no stock history have COGS = ₹0.00 and Margin = 0% — indicated by ⚠ No Stock Data badge.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── FULL WIDTH LIST VIEW (Default Mode) ──────────────────────────────────

  const columns = [
    {
      key: 'quoteNo',
      title: 'Quote No',
      render: (_: any, record: Quote) => (
        <Link to={`/quotes/${record.id}`} className="font-bold text-blue-500 hover:underline">
          {record.quoteNo}
        </Link>
      ),
    },
    { key: 'customer.name', title: 'Customer', render: (_: any, record: Quote) => record.customer?.name || '-' },
    { key: 'quoteDate', title: 'Quote Date', render: (value: string) => formatDate(value) },
    { key: 'expiryDate', title: 'Expiry Date', render: (value: string) => formatDate(value) },
    { key: 'totalAmount', title: 'Amount', align: 'right' as const, render: (value: number) => `₹${value?.toFixed(2) || '0.00'}` },
    { key: 'status', title: 'Status', render: (value: string) => getStatusBadge(value) },
    {
      key: 'actions',
      title: 'Actions',
      align: 'right' as const,
      render: (_: any, record: Quote) => (
        <div className="flex gap-2 items-center justify-end">
          <button
            onClick={() => handleDownloadPDF(record)}
            className="hidden md:inline-flex p-1 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Download PDF"
            disabled={downloadingId === record.id.toString()}
          >
            {downloadingId === record.id.toString() ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => setShareQuote(record)}
            className="hidden md:inline-flex p-1 text-gray-550 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors"
            title="Send via Email"
          >
            <Mail className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEditQuote(record)}
            className="hidden md:inline-flex p-1 text-gray-550 hover:text-amber-600 rounded-full hover:bg-gray-100 transition-colors"
            title="Edit Quote"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(record)}
            className="hidden md:inline-flex p-1 text-gray-400 hover:text-red-650 rounded-full hover:bg-red-50 transition-colors"
            title="Delete Quote"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setActionModalQuote(record)}
            className="p-1 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors"
            title="More Actions"
          >
            {(convertingId === record.id) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Zoho Books style custom header panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 border-b border-gray-200 bg-white sticky top-0 z-10 gap-3">
        <div className="relative" ref={filterDropdownRef}>
          <div
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            className="flex items-center gap-1.5 cursor-pointer select-none hover:opacity-85"
          >
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              {statusFilter === 'all' ? 'All Quotes' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) + ' Quotes'}
            </h1>
            <ChevronDown className="h-4 w-4 text-gray-500 mt-0.5" />
          </div>
          {filterMenuOpen && (
            <div className="absolute left-0 mt-2 w-56 rounded bg-white shadow-lg border border-gray-200 divide-y divide-gray-100 z-50 animate-fadeIn">
              <div className="py-1">
                {['all', 'draft', 'sent', 'accepted', 'rejected', 'expired'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => { setStatusFilter(filter); setFilterMenuOpen(false); }}
                    className={cn(
                      "w-full text-left px-4 py-2 text-xs font-semibold hover:bg-gray-100 transition-colors flex items-center justify-between",
                      statusFilter === filter ? "text-blue-500 font-bold" : "text-gray-700"
                    )}
                  >
                    <span>{filter === 'all' ? 'All Quotes' : filter.charAt(0).toUpperCase() + filter.slice(1)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:flex-none min-w-[140px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search quotes..."
              className="w-full sm:w-48 md:w-56 pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>

          <button
            onClick={handleAddQuote}
            className="h-8 text-xs font-bold px-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-1 shadow-2xs transition-colors flex-shrink-0 font-extrabold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Main quotes Table */}
      <div className="card overflow-x-auto">
        <Table data={quotes} columns={columns} loading={loading} />

        {/* Pagination */}
        <div className="p-3 border-t border-gray-200 space-y-2">
          {/* Row 1: Items per page + record count */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-semibold">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
                className="px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="text-xs text-gray-500 font-semibold">
              {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, pagination?.total || 0)} of {pagination?.total || 0}
            </div>
          </div>
          {/* Row 2: Page navigation */}
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
              className="flex items-center gap-0.5 px-2 py-1 text-xs h-7"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: pagination?.totalPages || 1 }, (_, i) => i + 1)
                .filter(page => {
                  const total = pagination?.totalPages || 1;
                  return page === 1 || page === total || (page >= currentPage - 1 && page <= currentPage + 1);
                })
                .reduce<(number | '...')[]>((acc, page, idx, arr) => {
                  if (idx > 0 && typeof arr[idx - 1] === 'number' && (page as number) - (arr[idx - 1] as number) > 1) {
                    acc.push('...');
                  }
                  acc.push(page);
                  return acc;
                }, [])
                .map((page, idx) =>
                  page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-gray-400 select-none">…</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      className={`w-7 h-7 rounded text-xs font-bold transition-colors ${currentPage === page ? 'bg-blue-500 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white'
                        }`}
                      disabled={loading}
                    >
                      {page}
                    </button>
                  )
                )
              }
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(pagination?.totalPages || 1, currentPage + 1))}
              disabled={currentPage === (pagination?.totalPages || 1) || loading}
              className="flex items-center gap-0.5 px-2 py-1 text-xs h-7"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Share via Email Modal */}
      {shareQuote && (
        <ShareDocumentModal
          isOpen={!!shareQuote}
          onClose={() => setShareQuote(null)}
          docType="quote"
          docId={shareQuote.id}
          docLabel={shareQuote.quoteNo}
          defaultEmail={shareQuote.customer?.email || ''}
          onSuccess={() => {
            if (id) {
              dispatch(fetchQuoteById(id));
              dispatch(fetchQuotes({ limit: 200, search: sidebarSearch, status: statusFilter === 'all' ? undefined : statusFilter }));
            } else {
              dispatch(fetchQuotes({ page: currentPage, limit: pageSize, search, status: statusFilter === 'all' ? undefined : statusFilter }));
            }
          }}
        />
      )}

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
                <span className="text-sm text-gray-500 font-semibold">Loading stock batches...</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {(invoiceModalQuote.items || []).map((item: QuoteItem) => {
                  const batches: StockBatch[] = stockCache[item.productId.toString()] || [];
                  const sel = batchSelections[item.id] || { stockBatchId: '', saleUnit: 'box' };
                  return (
                    <div key={item.id} className="border border-gray-200 rounded p-4 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-bold text-gray-900 text-sm">
                          {item.product?.name || `Product #${item.productId}`}
                          {item.product?.grade && <span className="text-xs text-gray-500 font-normal ml-1">({item.product.grade})</span>}
                          {item.product?.sku && <span className="text-xs text-gray-500 font-normal ml-2">[{item.product.sku}]</span>}
                        </span>
                        <span className="ml-auto text-xs font-bold text-gray-700">Qty: {item.quantity} {item.unit}</span>
                        <span className="text-xs font-bold text-gray-700">Rate: ₹{item.rate}</span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-500 pl-6 italic">{item.description}</p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Stock Batch <span className="text-red-500">*</span></label>
                          {batches.length === 0 ? (
                            <div className="text-xs text-red-650 bg-red-50 border border-red-200 rounded px-3 py-2 font-semibold">No stock available</div>
                          ) : (
                            <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
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
                          <label className="block text-xs font-bold text-gray-600 mb-1">Sale Unit</label>
                          <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
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
            <div className="flex justify-end gap-3 pt-2.5 border-t border-gray-200">
              <Button variant="outline" onClick={() => setInvoiceModalQuote(null)}>Cancel</Button>
              <Button onClick={handleInvoiceSubmit} loading={submittingInvoice} disabled={stockLoading}>
                Create Invoice
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Convert to Sales Order Confirmation Modal */}
      <Modal isOpen={!!salesModalQuote} onClose={closeSalesModal} title={`Convert to Sales Order - ${salesModalQuote?.quoteNo}`} size="xl">
        {salesModalQuote && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100 shadow-inner">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Customer Details</span>
                <span className="font-bold text-gray-900 text-sm block mt-0.5">{salesModalQuote.customer?.name || 'N/A'}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total Amount</span>
                <span className="font-bold text-emerald-700 text-base block mt-0.5">₹{salesModalQuote.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {salesOrderStockLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                <span className="text-xs text-gray-500 font-medium">Fetching available batches...</span>
              </div>
            ) : (
              <>
                <div className="text-xs text-amber-800 bg-amber-50/70 border border-amber-250 rounded-lg px-3.5 py-2.5 flex items-start gap-2">
                  <span className="mt-0.5 text-amber-500 font-bold">ℹ️</span>
                  <p className="leading-relaxed font-medium">
                    Please select the stock batches from which you want to book inventory for this Sales Order. The booked stock will be reserved until invoiced.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm max-h-[50vh] overflow-y-auto">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product Details</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" colSpan={2}>Selected Stock Batches & Quantities</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {(salesModalQuote.items || []).map((item: QuoteItem) => {
                          const batches = salesOrderStockCache[item.productId.toString()] || [];
                          const selections = salesOrderBatchSelections[item.id] || [];
                          const totalSelectedQty = selections.reduce((sum, s) => sum + (parseFloat(s.quantity as any) || 0), 0);
                          const isQtyMatch = Math.abs(totalSelectedQty - item.quantity) < 0.001;

                          return (
                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors duration-150 border-b border-gray-200">
                              <td className="px-4 py-4 align-top w-[35%]">
                                <div className="flex items-start gap-2.5">
                                  <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-700 mt-0.5">
                                    <Package className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900 text-xs sm:text-sm max-w-[200px] truncate animate-none" title={item.product?.name}>
                                      {item.product?.name || `Product #${item.productId}`}
                                    </div>
                                    <div className="flex flex-col gap-1 mt-1 text-[11px] text-gray-500">
                                      {item.product?.grade && (
                                        <div>Grade: <span className="bg-gray-100 text-gray-700 px-1 rounded font-medium">{item.product.grade}</span></div>
                                      )}
                                      <div>Required: <span className="font-bold text-blue-600">{item.quantity} {item.unit}</span></div>
                                      <div>Selected: <span className={cn("font-bold", isQtyMatch ? "text-emerald-600" : "text-amber-500")}>{totalSelectedQty} / {item.quantity}</span></div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top" colSpan={2}>
                                <div className="space-y-3">
                                  {selections.map((sel, idx) => (
                                    <div key={sel.id} className="flex flex-wrap items-center gap-2">
                                      {/* Batch selection dropdown */}
                                      <div className="flex-1 min-w-[200px]">
                                        <select
                                          className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-medium text-gray-800 shadow-sm"
                                          value={sel.stockBatchId}
                                          onChange={(e) => {
                                            const newSels = [...selections];
                                            newSels[idx] = { ...sel, stockBatchId: e.target.value };
                                            setSalesOrderBatchSelections(prev => ({ ...prev, [item.id]: newSels }));
                                          }}
                                        >
                                          <option value="">Select batch...</option>
                                          {batches.map((b: StockBatch) => {
                                            const availBoxes = b.remainingBoxes - (b.bookedBoxes || 0);
                                            const availPacks = b.remainingPacks - (b.bookedPacks || 0);
                                            const availPcs = b.remainingPcs - (b.bookedPcs || 0);
                                            return (
                                              <option key={b.id} value={b.id}>
                                                [{b.location?.name || 'Loc'}] {b.vendor?.name || 'Vendor'} - {b.batchCode || 'No Batch'} (Avail: {availBoxes}b / {availPacks}pk / {availPcs}pc)
                                              </option>
                                            );
                                          })}
                                        </select>
                                      </div>

                                      {/* Quantity input */}
                                      <div className="w-[80px]">
                                        <input
                                          type="number"
                                          step="any"
                                          className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-medium text-gray-800 text-center"
                                          placeholder="Qty"
                                          value={sel.quantity || ''}
                                          onChange={(e) => {
                                            const newSels = [...selections];
                                            newSels[idx] = { ...sel, quantity: parseFloat(e.target.value) || 0 };
                                            setSalesOrderBatchSelections(prev => ({ ...prev, [item.id]: newSels }));
                                          }}
                                        />
                                      </div>

                                      {/* Sale Unit dropdown */}
                                      <div className="w-[90px]">
                                        <select
                                          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-medium text-gray-800 shadow-sm"
                                          value={sel.saleUnit}
                                          onChange={(e) => {
                                            const newSels = [...selections];
                                            newSels[idx] = { ...sel, saleUnit: e.target.value };
                                            setSalesOrderBatchSelections(prev => ({ ...prev, [item.id]: newSels }));
                                          }}
                                        >
                                          <option value="box">Box</option>
                                          <option value="pack">Pack</option>
                                          <option value="piece">Piece</option>
                                        </select>
                                      </div>

                                      {/* Action buttons */}
                                      <div className="flex items-center gap-1">
                                        {selections.length > 1 && (
                                          <button
                                            type="button"
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                            onClick={() => {
                                              const newSels = selections.filter((_, i) => i !== idx);
                                              setSalesOrderBatchSelections(prev => ({ ...prev, [item.id]: newSels }));
                                            }}
                                            title="Remove batch row"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}

                                  {/* Add row action button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const defaultUnit = item.unit || 'box';
                                      const defaultBatch = batches[0] ? batches[0].id.toString() : '';
                                      // Suggest remaining quantity if any
                                      const remainingToSelect = Math.max(0, item.quantity - totalSelectedQty);
                                      const newSel = {
                                        id: Math.random().toString(),
                                        stockBatchId: defaultBatch,
                                        saleUnit: defaultUnit,
                                        quantity: remainingToSelect > 0 ? remainingToSelect : 0,
                                      };
                                      setSalesOrderBatchSelections(prev => ({
                                        ...prev,
                                        [item.id]: [...selections, newSel]
                                      }));
                                    }}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors mt-1"
                                  >
                                    <Plus className="h-3 w-3" /> Add Batch Row
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3.5 border-t border-gray-200">
                  <Button variant="outline" onClick={closeSalesModal}>Cancel</Button>
                  <Button
                    onClick={confirmConvertToSalesOrder}
                    loading={convertingId === salesModalQuote.id}
                    disabled={salesOrderStockLoading}
                    variant="primary"
                  >
                    Confirm & Book Stock
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Action Modal (More choices in list view and details mobile view) */}
      <Modal isOpen={!!actionModalQuote} onClose={() => setActionModalQuote(null)}
        title={`Actions - ${actionModalQuote?.quoteNo}`} size="sm">
        {actionModalQuote && (
          <div className="space-y-2.5 p-1 max-h-[75vh] overflow-y-auto">
            {/* Edit Quote */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors border border-gray-100 font-medium"
              onClick={() => {
                const q = actionModalQuote;
                setActionModalQuote(null);
                handleEditQuote(q);
              }}
            >
              <Edit className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div className="text-left">
                <div className="font-bold text-gray-900">Edit Quote</div>
                <div className="text-xs text-gray-500">Modify quotation details, items, or terms</div>
              </div>
            </button>

            {/* Download PDF */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors border border-gray-100 font-medium"
              onClick={() => {
                const q = actionModalQuote;
                setActionModalQuote(null);
                handleDownloadPDF(q);
              }}
            >
              <Download className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div className="text-left">
                <div className="font-bold text-gray-900">Download PDF</div>
                <div className="text-xs text-gray-500">Download a PDF copy of this quotation</div>
              </div>
            </button>

            {/* Send via Email */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors border border-gray-100 font-medium"
              onClick={() => {
                const q = actionModalQuote;
                setActionModalQuote(null);
                setShareQuote(q);
              }}
            >
              <Mail className="h-5 w-5 text-indigo-500 flex-shrink-0" />
              <div className="text-left">
                <div className="font-bold text-gray-900">Send via Email</div>
                <div className="text-xs text-gray-500">Email this quotation directly to the customer</div>
              </div>
            </button>

            {/* Convert to Sales Order */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors border border-gray-100 font-medium"
              onClick={() => {
                const q = actionModalQuote;
                setActionModalQuote(null);
                handleConvertToSalesOrder(q);
              }}
            >
              <ShoppingCart className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <div className="text-left">
                <div className="font-bold text-gray-900">Convert to Sales Order</div>
                <div className="text-xs text-gray-500">Create a new sales order from this quote</div>
              </div>
            </button>

            {/* Convert to Invoice */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors border border-gray-100 font-medium"
              onClick={() => {
                const q = actionModalQuote;
                setActionModalQuote(null);
                openInvoiceModal(q);
              }}
            >
              <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div className="text-left">
                <div className="font-bold text-gray-900">Convert to Invoice</div>
                <div className="text-xs text-gray-500">Generate an outward invoice for this quote</div>
              </div>
            </button>

            {/* Delete Quote */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-700 hover:bg-red-50/50 transition-colors border border-red-100 font-medium bg-red-50/10"
              onClick={() => {
                const q = actionModalQuote;
                setActionModalQuote(null);
                handleDelete(q);
              }}
            >
              <Trash2 className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="text-left">
                <div className="font-bold text-red-700">Delete Quote</div>
                <div className="text-xs text-red-500">Permanently delete this quotation</div>
              </div>
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Quotes;
