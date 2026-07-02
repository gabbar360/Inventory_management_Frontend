import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Calendar,
  User,
  Archive,
  ArrowRightLeft,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Warehouse,
  ChevronRight,
  Clock,
  Printer,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchStockSummary,
  fetchAvailableStock,
  clearAvailableStock,
  downloadStockReport,
} from '@/slices/inventorySlice';
import { fetchLocations } from '@/slices/locationSlice';
import { StockBatch, StockSummary } from '@/types';
import { formatCurrency, formatNumber } from '@/utils';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';
import StockTransferModal from '@/components/StockTransferModal';
import { transferStock } from '@/services/stockTransferService';
import { toast } from 'react-hot-toast';
import ReactDOM from 'react-dom';
import { Download } from 'lucide-react';

/* ── Locations hover popover (portal-based) ── */
const LocationsPopover: React.FC<{ locations: any[] }> = ({ locations }) => {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const PER_PAGE = 5;
  const totalPages = Math.ceil(locations.length / PER_PAGE);
  const visible = locations.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left });
    }
    setOpen(true);
  };

  return (
    <div
      ref={triggerRef}
      className="inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => { setOpen(false); setPage(0); }}
    >
      {/* Pill trigger */}
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] font-semibold text-gray-700 cursor-default whitespace-nowrap select-none">
        <MapPin className="w-2.5 h-2.5 text-primary-500 flex-shrink-0" />
        <span>{locations.length} Locations</span>
      </div>

      {/* Portal popup – renders at document.body to escape overflow:hidden */}
      {open && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translateY(calc(-100% - 6px))',
            zIndex: 9999,
          }}
          className="w-48 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => { setOpen(false); setPage(0); }}
        >
          {/* Header */}
          <div className="px-2.5 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Locations</span>
            <span className="text-[9px] text-gray-400 font-medium">{locations.length} total</span>
          </div>

          {/* Location list */}
          <div className="px-2 py-1.5 space-y-0.5">
            {visible.map((loc: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 py-0.5">
                <MapPin className="w-2.5 h-2.5 text-primary-400 flex-shrink-0" />
                <span className="text-[11px] text-gray-700 font-semibold truncate">{loc.locationName}</span>
              </div>
            ))}
          </div>

          {/* Pagination – appears only when > PER_PAGE */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-gray-100 bg-gray-50">
              <button
                onClick={(e) => { e.stopPropagation(); setPage(p => Math.max(0, p - 1)); }}
                disabled={page === 0}
                className="text-[9px] font-bold text-gray-500 hover:text-primary-600 disabled:opacity-30 transition-colors"
              >
                ‹ Prev
              </button>
              <span className="text-[9px] text-gray-400 font-medium">{page + 1} / {totalPages}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setPage(p => Math.min(totalPages - 1, p + 1)); }}
                disabled={page === totalPages - 1}
                className="text-[9px] font-bold text-gray-500 hover:text-primary-600 disabled:opacity-30 transition-colors"
              >
                Next ›
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

const Inventory: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    stockSummary = [],
    availableStock = [],
    lowStockItems = [],
    globalStats = null,
    pagination = null,
    loading = false,
    reportDownloading = false,
  } = useAppSelector((state) => state.inventory) || {};
  const { locations = [] } = useAppSelector((state) => state.locations) || {};

  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [summaryPage, setSummaryPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<StockBatch | null>(null);
  const [lowStockOpen, setLowStockOpen] = useState(false);
  const handleDownloadReport = async (type: 'location' | 'all') => {
    try {
      await dispatch(downloadStockReport({
        locationId: selectedLocation || undefined,
        reportType: type
      })).unwrap();
      toast.success(`${type === 'location' ? 'Location-wise' : 'All Locations'} report downloaded successfully`);
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setSummaryPage(1);
  }, [selectedLocation, debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [selectedLocation, debouncedSearch, summaryPage]);

  const loadData = async () => {
    dispatch(fetchStockSummary({
      page: summaryPage,
      limit: 10,
      locationId: selectedLocation || undefined,
      search: debouncedSearch || undefined,
    }));
    dispatch(fetchLocations({ limit: 100 }));
  };

  const loadBatches = async (productId: string) => {
    dispatch(
      fetchAvailableStock({
        productId,
        locationId: selectedLocation || undefined,
      })
    );
    setSelectedProduct(productId);
    setDrawerOpen(true);
  };

  const handleTransfer = async (data: any) => {
    try {
      await transferStock(data);
      toast.success('Stock transferred successfully');
      loadData();
      if (selectedProduct) {
        loadBatches(selectedProduct);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to transfer stock');
      throw error;
    }
  };

  const locationOptions = [
    { value: '', label: 'All Locations' },
    ...(locations || []).map((loc) => ({
      value: loc.id,
      label: loc.name,
    })),
  ];

  const totalStockValue = globalStats?.totalStockValue || 0;
  const totalProducts = globalStats?.totalProducts || 0;
  const lowStockItemsCount = globalStats?.lowStockItemsCount || 0;

  const summaryColumns = [
    {
      key: 'productName',
      title: 'Product',
      sortable: true,
      sticky: true,
      render: (value: string, record: StockSummary) => (
        <div>
          <div className="font-semibold text-gray-900 text-xs sm:text-sm tracking-tight">{value}</div>
          <div className="inline-block mt-0.5 px-2 py-0.5 rounded bg-gray-100 text-[10px] font-bold text-gray-500 tracking-wide">
            {record.categoryName}
          </div>
        </div>
      ),
    },
    {
      key: 'totalBoxes',
      title: 'Boxes',
      render: (value: number, record: StockSummary) => {
        const booked = record.totalBookedBoxes || 0;
        const avail = value - booked;
        return (
          <div className="flex flex-col text-xs">
            <span className="font-bold text-gray-900">Total: {formatNumber(value)}</span>
            {booked > 0 && <span className="text-[10px] text-amber-600 font-semibold">Booked: {formatNumber(booked)}</span>}
            <span className="text-[10px] text-blue-600 font-bold">Avail: {formatNumber(avail)}</span>
          </div>
        );
      },
    },
    {
      key: 'totalPacks',
      title: 'Packs',
      render: (_: any, record: StockSummary) => {
        const booked = record.totalBookedPacks || 0;
        const avail = (record.totalPacks || 0) - booked;
        return (
          <div className="flex flex-col text-xs">
            <span className="font-medium text-gray-700">Total: {formatNumber(record.totalPacks || 0)}</span>
            {booked > 0 && <span className="text-[10px] text-amber-600 font-semibold">Booked: {formatNumber(booked)}</span>}
            <span className="text-[10px] text-blue-600 font-bold">Avail: {formatNumber(avail)}</span>
          </div>
        );
      },
    },
    {
      key: 'totalPcs',
      title: 'Pieces',
      render: (value: number, record: StockSummary) => {
        const booked = record.totalBookedPcs || 0;
        const avail = value - booked;
        return (
          <div className="flex flex-col text-xs">
            <span className="font-bold text-gray-900">Total: {formatNumber(value)}</span>
            {booked > 0 && <span className="text-[10px] text-amber-605 font-semibold">Booked: {formatNumber(booked)}</span>}
            <span className="text-xs font-extrabold text-primary-700">Avail: {formatNumber(avail)}</span>
          </div>
        );
      },
    },
    {
      key: 'totalValue',
      title: 'Value',
      render: (value: number) => (
        <span className="font-bold text-emerald-600 text-xs sm:text-sm">{formatCurrency(value)}</span>
      ),
    },
    {
      key: 'locations',
      title: 'Locations',
      render: (locationsList: any[]) => {
        const list = locationsList || [];
        if (list.length === 0) return <span className="text-gray-400 text-[10px]">—</span>;
        if (list.length > 3) {
          return <LocationsPopover locations={list} />;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {list.map((loc: any, index: number) => (
              <div
                key={index}
                title={`${loc.locationName}: ${formatNumber(loc.boxes)} boxes · ${formatNumber(loc.pcs)} pcs`}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] font-semibold text-gray-700 whitespace-nowrap"
              >
                <MapPin className="w-2 h-2 text-primary-500 flex-shrink-0" />
                <span className="max-w-[80px] truncate">{loc.locationName}</span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      render: (_: any, record: StockSummary) => {
        const isLowStock = record.totalPcs < 100;
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isLowStock
                ? 'bg-rose-50 text-rose-700 border border-rose-200/50'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
              }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLowStock ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
              }`} />
            {isLowStock ? 'Low Stock' : 'In Stock'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: StockSummary) => (
        <button
          onClick={() => loadBatches(record.productId)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary-700 hover:text-white bg-primary-50 hover:bg-primary-600 rounded border border-primary-200/70 hover:border-primary-600 transition-all duration-200 shadow-sm"
        >
          View Batches
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-3 sm:p-5 relative overflow-hidden">
        <div className="flex flex-col gap-3">
          {/* Title row */}
          <div>
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 flex-shrink-0" />
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 tracking-tight leading-tight">Stock Control Dashboard</h1>
            </div>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-1 leading-relaxed">
              Live tracking · safety alerts · batch movements
            </p>
          </div>

          {/* Search + Location + Download Buttons row */}
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-800"
            />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full h-8.5 border border-gray-300 rounded-lg px-3 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-700"
            >
              {locationOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => handleDownloadReport('location')}
                disabled={reportDownloading || !selectedLocation}
                className="flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg border border-blue-700 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={!selectedLocation ? 'Select a location first' : 'Download location-wise report'}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Location Report</span>
                <span className="sm:hidden">Loc. Report</span>
              </button>
              <button
                onClick={() => handleDownloadReport('all')}
                disabled={reportDownloading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-lg border border-emerald-700 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download all locations report"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">All Locations Report</span>
                <span className="sm:hidden">All Locs Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards with Glowing Shadows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Total Products Card */}
        <div className="group relative overflow-hidden bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm hover:shadow-[0_0_25px_rgba(113,75,103,0.12)] hover:border-primary-300 transition-all duration-300 cursor-pointer">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 opacity-40 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Total Products
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {totalProducts}
              </h3>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                Active SKU items
              </p>
            </div>
            <div className="p-3 bg-primary-50 text-primary-600 rounded-xl group-hover:bg-primary-600 group-hover:text-white transition-all duration-300 shadow-inner">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Valuation Card */}
        <div className="group relative overflow-hidden bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm hover:shadow-[0_0_25px_rgba(1,126,132,0.12)] hover:border-emerald-300 transition-all duration-300 cursor-pointer">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-40 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Asset Valuation
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {formatCurrency(totalStockValue)}
              </h3>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Total inventory worth
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-inner">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Low Stock Items Card */}
        <div
          onClick={() => {
            if (lowStockItemsCount > 0) {
              setLowStockOpen(true);
              document.getElementById('low-stock-alert-section')?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className={`group relative overflow-hidden bg-white rounded-xl border p-5 shadow-sm hover:shadow-[0_0_25px_rgba(244,63,94,0.12)] transition-all duration-300 cursor-pointer ${lowStockItemsCount > 0
              ? 'border-rose-200 bg-rose-50/5'
              : 'border-gray-200/80 hover:border-gray-300'
            }`}
        >
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-40 group-hover:scale-110 transition-transform duration-500 ${lowStockItemsCount > 0 ? 'bg-rose-50' : 'bg-gray-50'
            }`}></div>
          <div className="relative flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Low Stock Items
              </p>
              <h3 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${lowStockItemsCount > 0 ? 'text-rose-600' : 'text-gray-900'
                }`}>
                {lowStockItemsCount}
              </h3>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${lowStockItemsCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-gray-400'
                  }`}></span>
                {lowStockItemsCount > 0 ? 'Replenishment needed' : 'All items well-stocked'}
              </p>
            </div>
            <div className={`p-3 rounded-xl transition-all duration-300 shadow-inner ${lowStockItemsCount > 0
                ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white'
                : 'bg-gray-50 text-gray-500 group-hover:bg-gray-600 group-hover:text-white'
              }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              Stock Summary
              {selectedLocation && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-normal text-gray-600 bg-white rounded border border-gray-200">
                  <MapPin className="w-3 h-3 text-primary-500" />
                  {locations.find((l) => l.id === selectedLocation)?.name}
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              General overview of product pieces and boxes. Click on "View Batches" to inspect individual lots and storage timelines.
            </p>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table
            data={stockSummary}
            columns={summaryColumns}
            loading={loading}
            emptyMessage="No stock inventory available"
          />
        </div>

        {/* Mobile Custom Card View */}
        <div className="md:hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-50 border border-gray-150 rounded-xl p-4 h-36"></div>
              ))}
            </div>
          ) : stockSummary.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4">
              <Archive className="h-10 w-10 text-gray-300 mb-2" strokeWidth={1.5} />
              <p className="text-gray-500 text-sm font-semibold">No stock inventory available</p>
            </div>
          ) : (
            <div className="p-3.5 space-y-3.5 bg-gray-50/30">
              {stockSummary.map((item, index) => {
                const isLowStock = item.totalPcs < 100;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3 hover:border-primary-200 transition-colors"
                  >
                    {/* Header: Name, Category, Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-bold text-gray-900 text-[13px] leading-snug tracking-tight">{item.productName}</h4>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-gray-100 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                            {item.categoryName}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${isLowStock
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/50'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                          }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isLowStock ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                        {isLowStock ? 'Low' : 'In Stock'}
                      </span>
                    </div>

                    {/* Quantities & Value Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-gray-50/50 p-2.5 rounded-lg border border-gray-200/60 text-center">
                      <div>
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Boxes</span>
                        <span className="text-xs font-bold text-gray-900 mt-0.5">{formatNumber(item.totalBoxes)}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Pieces</span>
                        <span className="text-xs font-bold text-gray-900 mt-0.5">{formatNumber(item.totalPcs)}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Valuation</span>
                        <span className="text-xs font-bold text-emerald-600 mt-0.5">{formatCurrency(item.totalValue)}</span>
                      </div>
                    </div>

                    {/* Locations List */}
                    {item.locations && item.locations.length > 0 && (
                      <div className="pt-1.5 border-t border-gray-100">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Locations</span>
                        {item.locations.length > 3 ? (
                          <LocationsPopover locations={item.locations} />
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {item.locations.map((loc: any, idx: number) => (
                              <div
                                key={idx}
                                title={`${loc.locationName}: ${formatNumber(loc.boxes)} boxes`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] text-gray-700 font-semibold"
                              >
                                <MapPin className="w-2 h-2 text-primary-500 flex-shrink-0" />
                                <span className="max-w-[70px] truncate">{loc.locationName}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* View Batches CTA */}
                    <button
                      onClick={() => loadBatches(item.productId)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-primary-700 hover:text-white bg-primary-50 hover:bg-primary-600 rounded-lg border border-primary-200 transition-all shadow-xs"
                    >
                      View Batches & Lots
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-white">
            <Pagination
              currentPage={summaryPage}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={setSummaryPage}
              loading={loading}
            />
          </div>
        )}
      </div>

      {/* Slide-over Side Drawer for Batches */}
      <div className={`fixed top-12 inset-x-0 bottom-0 z-50 overflow-hidden transition-all duration-300 ${drawerOpen ? 'visible' : 'invisible pointer-events-none'
        }`}>
        {/* Blurred Backdrop */}
        <div
          className={`absolute inset-0 bg-black/45 backdrop-blur-xs transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0'
            }`}
          onClick={() => {
            setDrawerOpen(false);
            setSelectedProduct('');
            dispatch(clearAvailableStock());
          }}
        />

        {/* Drawer Container Panel */}
        <div className={`absolute right-0 top-0 h-full w-full max-w-lg sm:max-w-xl md:max-w-2xl bg-gray-50 shadow-2xl border-l border-gray-200/80 flex flex-col transform transition-transform duration-300 ease-out z-50 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}>
          {/* Drawer Header */}
          <div className="px-5 py-4.5 border-b border-gray-200 bg-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  setSelectedProduct('');
                  dispatch(clearAvailableStock());
                }}
                className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-primary-700 hover:border-primary-200 hover:bg-primary-50/40 transition-all shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                    {stockSummary.find((s) => s.productId === selectedProduct)?.productName || 'Batch Lots'}
                  </h3>
                  <span className="px-2 py-0.5 bg-primary-50 text-[9px] font-bold uppercase text-primary-700 rounded border border-primary-100/50">
                    {stockSummary.find((s) => s.productId === selectedProduct)?.categoryName || 'Category'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Batch lot sequence log
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setDrawerOpen(false);
                setSelectedProduct('');
                dispatch(clearAvailableStock());
              }}
              className="text-gray-500 hover:text-gray-800 transition-colors text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 shadow-sm"
            >
              Close
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-gray-200 rounded-lg"></div>
                <div className="h-28 bg-gray-100 rounded-lg"></div>
                <div className="h-28 bg-gray-100 rounded-lg"></div>
              </div>
            ) : availableStock.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Archive className="h-12 w-12 text-gray-300 mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium text-gray-500">No active batches available</p>
                <p className="text-xs text-gray-400 mt-1">This product does not currently have any stock items stored.</p>
              </div>
            ) : (
              <>
                {/* Product Stats Ribbon inside Drawer */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-gray-200/80 shadow-xs">
                  <div className="bg-gray-50/50 rounded-lg p-2.5 border border-gray-150 shadow-inner">
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Boxes</div>
                    <div className="text-base font-extrabold text-gray-900 mt-0.5">
                      {formatNumber(availableStock.reduce((sum, batch) => sum + batch.remainingBoxes, 0))}
                    </div>
                  </div>
                  <div className="bg-gray-50/50 rounded-lg p-2.5 border border-gray-150 shadow-inner">
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Packs</div>
                    <div className="text-base font-extrabold text-gray-900 mt-0.5">
                      {formatNumber(availableStock.reduce((sum, batch) => sum + (batch.remainingPacks || 0), 0))}
                    </div>
                  </div>
                  <div className="bg-gray-50/50 rounded-lg p-2.5 border border-gray-150 shadow-inner">
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Pieces</div>
                    <div className="text-base font-extrabold text-gray-900 mt-0.5">
                      {formatNumber(availableStock.reduce((sum, batch) => sum + batch.remainingPcs, 0))}
                    </div>
                  </div>
                  <div className="bg-emerald-50/60 rounded-lg p-2.5 border border-emerald-200/80 shadow-inner">
                    <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Lot Value</div>
                    <div className="text-base font-extrabold text-emerald-700 mt-0.5">
                      {formatCurrency(availableStock.reduce((sum, batch) => sum + batch.remainingPcs * batch.costPerPcs, 0))}
                    </div>
                  </div>
                </div>

                {/* Chronological LOT Cards */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Lot Queue ({availableStock.length} lots)
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {availableStock.map((batch) => {
                      return (
                        <div
                          key={batch.id}
                          className="relative p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow transition-all duration-300"
                        >


                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-2">
                              {/* Lot Date and Vendor */}
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-gray-400" />
                                  {new Date(batch.inwardDate).toLocaleDateString()}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                <span className="text-[11px] text-gray-600 flex items-center gap-1 font-semibold">
                                  <User className="w-3 h-3 text-gray-400" />
                                  {batch.vendor?.name || 'N/A'}
                                </span>
                              </div>

                              {/* Location Badge */}
                              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-50 border border-gray-200/60 rounded text-[10px] text-gray-700 font-bold shadow-xs">
                                <MapPin className="w-3 h-3 text-primary-500" />
                                {batch.location?.name || 'N/A'}
                              </div>

                              {/* Stock quantities */}
                              <div className="grid grid-cols-3 gap-5 pt-1">
                                <div>
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Boxes</span>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-900">Total: {formatNumber(batch.remainingBoxes)}</span>
                                    <span className="text-[10px] text-amber-600 font-semibold">Booked: {formatNumber(batch.bookedBoxes || 0)}</span>
                                    <span className="text-[10px] text-blue-600 font-bold">Avail: {formatNumber(batch.remainingBoxes - (batch.bookedBoxes || 0))}</span>
                                  </div>
                                  <span className="text-[9px] text-gray-400 block font-normal mt-1">({batch.packPerBox || 1} p/b)</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Packs</span>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-900">Total: {formatNumber(batch.remainingPacks || 0)}</span>
                                    <span className="text-[10px] text-amber-600 font-semibold">Booked: {formatNumber(batch.bookedPacks || 0)}</span>
                                    <span className="text-[10px] text-blue-600 font-bold">Avail: {formatNumber((batch.remainingPacks || 0) - (batch.bookedPacks || 0))}</span>
                                  </div>
                                  <span className="text-[9px] text-gray-400 block font-normal mt-1">({batch.packPerPiece || 1} p/p)</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Total Pieces</span>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-900">Total: {formatNumber(batch.remainingPcs)}</span>
                                    <span className="text-[10px] text-amber-650 font-semibold">Booked: {formatNumber(batch.bookedPcs || 0)}</span>
                                    <span className="text-xs font-extrabold text-primary-700">Avail: {formatNumber(batch.remainingPcs - (batch.bookedPcs || 0))}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Cost Breakdown details */}
                              <div className="flex gap-4 pt-1.5 border-t border-gray-100 text-[10px] text-gray-500">
                                <span>Cost/Box: <strong className="text-gray-700 font-bold">{formatCurrency(batch.costPerBox)}</strong></span>
                                <span>Cost/Pack: <strong className="text-gray-700 font-bold">{formatCurrency(batch.costPerPack)}</strong></span>
                                <span>Cost/Piece: <strong className="text-gray-700 font-bold">{formatCurrency(batch.costPerPcs)}</strong></span>
                              </div>
                            </div>

                            {/* Right side Valuation and Transfer action */}
                            <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-4 sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                              <div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Lot Valuation</span>
                                <span className="text-sm font-extrabold text-emerald-600">{formatCurrency(batch.remainingPcs * batch.costPerPcs)}</span>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedBatch(batch);
                                    setTransferModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 border-0 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  Transfer
                                </button>
                                <button
                                  onClick={() => {
                                    navigate(`/print-barcodes/batch/${batch.id}`);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border-0 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                                  title="Generate / Print Barcode"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  Barcode
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stock Transfer Modal */}
      <StockTransferModal
        isOpen={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          setSelectedBatch(null);
        }}
        batch={selectedBatch}
        locations={locations.map((loc) => ({ id: loc.id, name: loc.name }))}
        onTransfer={handleTransfer}
      />

      {/* Collapsible Low Stock Alert Accordion */}
      {lowStockItems.length > 0 && (
        <div
          id="low-stock-alert-section"
          className={`bg-white rounded-xl border transition-all duration-300 ${lowStockOpen ? 'shadow-md border-rose-200' : 'shadow-sm border-gray-200'
            }`}
        >
          {/* Widget Trigger Header */}
          <button
            onClick={() => setLowStockOpen(!lowStockOpen)}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-xl focus:outline-none transition-colors ${lowStockOpen ? 'bg-rose-50/50 border-b border-rose-100' : 'bg-white'
              }`}
          >
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-rose-100 text-rose-700 animate-pulse">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Critical Replenishment Alert ({lowStockItems.length} items)
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  The following items have dropped below the safe threshold of 100 pieces.
                </p>
              </div>
            </div>
            <div className="text-gray-400 hover:text-gray-600 transition-colors">
              {lowStockOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </button>

          {/* Collapsible Content */}
          {lowStockOpen && (
            <div className="p-4 sm:p-5 space-y-3 divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {lowStockItems.slice(0, 8).map((item, index) => {
                const safetyThreshold = 100;
                const percent = Math.min(100, Math.max(0, (item.totalPcs / safetyThreshold) * 100));

                return (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 first:pt-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                          {item.productName}
                        </span>
                        <span className="px-1.5 py-0.5 bg-gray-100 text-[10px] font-bold text-gray-500 rounded uppercase">
                          {item.categoryName}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Valuation at Risk: {formatCurrency(item.totalValue)}
                      </div>
                    </div>

                    <div className="w-full sm:w-52 flex-shrink-0">
                      <div className="flex justify-between text-[10px] text-gray-500 font-bold mb-1">
                        <span className="text-rose-600 uppercase tracking-wider font-extrabold">Critical</span>
                        <span>{item.totalPcs} / {safetyThreshold} pcs</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${percent < 30 ? 'bg-red-500 shadow-[0_0_10px_#f43f5e]' : percent < 70 ? 'bg-orange-500' : 'bg-amber-500'
                            }`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {lowStockItems.length > 8 && (
                <div className="text-center pt-3 text-xs text-gray-500 font-medium">
                  And {lowStockItems.length - 8} more products currently require restock.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Inventory;