import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  Search,
  X,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  MoreHorizontal,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchVendors,
  fetchVendorById,
  deleteVendor,
  clearError,
} from '@/slices/vendorSlice';
import { bulkUploadService } from '@/services/bulkUploadService';
import { ledgerService, VendorLedgerData } from '@/services/ledgerService';
import { Vendor } from '@/types';
import { formatDate, formatCurrency, cn, debounce } from '@/utils';
import Button from '@/components/Button';
import BulkUpload from '@/components/BulkUpload';
import Pagination from '@/components/Pagination';
import AddEditVendor from '@/components/AddEditVendor';

const getLocalYYYYMMDD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatLedgerBalance = (balance: number): string => {
  const abs = Math.abs(balance);
  const formatted = formatCurrency(abs);
  if (balance > 0) {
    return `${formatted} Dr`;
  } else if (balance < 0) {
    return `${formatted} Cr`;
  }
  return formatted;
};

const extractPAN = (gst?: string): string => {
  if (gst && gst.trim().length >= 12) {
    return gst.substring(2, 12).toUpperCase();
  }
  return 'N/A';
};

const Vendors: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { vendors, currentVendor, pagination, loading, error } = useAppSelector(
    (state) => state.vendors
  );

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Dropdown states
  const [newTransOpen, setNewTransOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  // Sorting states
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'email' | 'phone' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [sidebarFilterMenuOpen, setSidebarFilterMenuOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const sidebarFilterDropdownRef = useRef<HTMLDivElement>(null);

  const handleSort = (field: 'name' | 'code' | 'email' | 'phone' | 'createdAt') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Tab State derived from URL
  let activeTab: 'overview' | 'transactions' | 'statement' = 'overview';
  if (location.pathname.endsWith('/purchase')) {
    activeTab = 'transactions';
  } else if (location.pathname.endsWith('/statement')) {
    activeTab = 'statement';
  }

  // Transactions Tab Filter
  const [transFilter, setTransFilter] = useState<'all' | 'bill' | 'order' | 'payment'>('all');

  // Statement Date presets & parameters
  const [dateRangePreset, setDateRangePreset] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [ledgerData, setLedgerData] = useState<VendorLedgerData | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  const isEditMode = window.location.pathname.includes('/edit');
  const isAddMode = window.location.pathname.includes('/add');

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNewTransOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setFilterMenuOpen(false);
      }
      if (sidebarFilterDropdownRef.current && !sidebarFilterDropdownRef.current.contains(event.target as Node)) {
        setSidebarFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch vendors (paginated in list mode, full list in split mode)
  useEffect(() => {
    if (id && !isEditMode && !isAddMode) {
      dispatch(fetchVendors({ limit: 200, search: sidebarSearch, sortBy, sortOrder }));
    } else {
      dispatch(fetchVendors({ page: currentPage, limit: 10, search, sortBy, sortOrder }));
    }
  }, [dispatch, search, currentPage, id, isEditMode, isAddMode, sidebarSearch, sortBy, sortOrder]);

  // Fetch specific vendor details
  useEffect(() => {
    if (id && !isEditMode && !isAddMode) {
      dispatch(fetchVendorById(id));
    }
  }, [id, dispatch, isEditMode, isAddMode]);

  // Fetch statement data when tab is 'statement' or selected vendor changes
  useEffect(() => {
    if (id && activeTab === 'statement' && !isEditMode && !isAddMode) {
      handleFetchLedger();
    }
  }, [id, activeTab, startDate, endDate, isEditMode, isAddMode]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Set statement dates based on preset
  useEffect(() => {
    const today = new Date();
    let start = '';
    let end = '';

    if (dateRangePreset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      start = getLocalYYYYMMDD(firstDay);
      end = getLocalYYYYMMDD(lastDay);
    } else if (dateRangePreset === 'last_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      start = getLocalYYYYMMDD(firstDay);
      end = getLocalYYYYMMDD(lastDay);
    } else if (dateRangePreset === 'this_quarter') {
      const currentQuarter = Math.floor(today.getMonth() / 3);
      const firstDay = new Date(today.getFullYear(), currentQuarter * 3, 1);
      const lastDay = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0);
      start = getLocalYYYYMMDD(firstDay);
      end = getLocalYYYYMMDD(lastDay);
    } else if (dateRangePreset === 'this_year') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      const lastDay = new Date(today.getFullYear(), 11, 31);
      start = getLocalYYYYMMDD(firstDay);
      end = getLocalYYYYMMDD(lastDay);
    }

    if (dateRangePreset !== 'custom' && dateRangePreset !== 'all_time') {
      setStartDate(start);
      setEndDate(end);
    } else if (dateRangePreset === 'all_time') {
      setStartDate('');
      setEndDate('');
    }
  }, [dateRangePreset]);

  // Fetch statement ledger
  const handleFetchLedger = async () => {
    if (!id) return;
    setLedgerLoading(true);
    try {
      const data = await ledgerService.getVendorLedger(id, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setLedgerData(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch vendor ledger');
      setLedgerData(null);
    } finally {
      setLedgerLoading(false);
    }
  };

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const debouncedSidebarSearch = debounce((value: string) => {
    setSidebarSearch(value);
  });

  const handleAddVendor = () => {
    navigate('/vendors/add');
  };

  const handleEditVendor = (vendorId: string) => {
    navigate(`/vendors/edit/${vendorId}`);
  };

  const handleFormSuccess = () => {
    navigate('/vendors');
    dispatch(fetchVendors({ page: currentPage, limit: 10, search, sortBy, sortOrder }));
  };

  const handleFormCancel = () => {
    if (id) {
      if (activeTab === 'transactions') {
        navigate(`/vendors/${id}/purchase`);
      } else if (activeTab === 'statement') {
        navigate(`/vendors/${id}/statement`);
      } else {
        navigate(`/vendors/${id}`);
      }
    } else {
      navigate('/vendors');
    }
  };

  const handleDelete = async (vendor: Vendor) => {
    if (window.confirm(`Are you sure you want to delete "${vendor.name}"?`)) {
      try {
        await dispatch(deleteVendor(vendor.id)).unwrap();
        toast.success('Vendor deleted successfully');
        navigate('/vendors');
      } catch (error) {
        // Handled by Redux
      }
    }
  };

  const handleExport = async () => {
    try {
      const blob = await bulkUploadService.exportData('vendors');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vendors_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Vendors exported successfully');
    } catch (error) {
      toast.error('Failed to export vendors');
    }
  };

  // Download PDF Statement
  const handleDownloadPDF = async () => {
    if (!id || !ledgerData) return;
    setDownloading(true);
    try {
      const blob = await ledgerService.downloadVendorLedgerPDF(id, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VendorLedger-${ledgerData.vendor.code}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Ledger PDF downloaded successfully');
    } catch (error: any) {
      toast.error('Failed to generate ledger PDF');
    } finally {
      setDownloading(false);
    }
  };

  // Navigation tab switcher (updates URL)
  const handleTabChange = (tab: 'overview' | 'transactions' | 'statement') => {
    if (!id) return;
    if (tab === 'overview') {
      navigate(`/vendors/${id}`);
    } else if (tab === 'transactions') {
      navigate(`/vendors/${id}/purchase`);
    } else if (tab === 'statement') {
      navigate(`/vendors/${id}/statement`);
    }
  };

  // Calculate last 6 months purchases for Recharts
  const getPurchasesChartData = (invoices: any[]) => {
    const data: { [key: string]: number } = {};
    const monthNames = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
    
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const label = `${monthNames[d.getMonth() + 1 === 12 ? 0 : d.getMonth() + 1]} ${d.getFullYear().toString().substring(2)}`;
      data[label] = 0;
    }

    (invoices || []).forEach(inv => {
      const invDate = new Date(inv.date);
      const label = `${monthNames[invDate.getMonth() + 1 === 12 ? 0 : invDate.getMonth() + 1]} ${invDate.getFullYear().toString().substring(2)}`;
      if (data[label] !== undefined) {
        data[label] += inv.totalCost || 0;
      }
    });

    return Object.keys(data).map(key => ({
      name: key,
      Amount: data[key]
    }));
  };

  // Compile Transactions tab data
  const getFilteredTransactions = () => {
    if (!currentVendor) return [];

    const txs: any[] = [];
    const vend = currentVendor as any;

    if (vend.inwardInvoices) {
      vend.inwardInvoices.forEach((inv: any) => {
        const bal = Math.max(0, inv.totalCost - (inv.amountPaid || 0));
        let status = 'Unpaid';
        if (inv.amountPaid > 0) {
          status = bal === 0 ? 'Paid' : 'Partially Paid';
        }
        txs.push({
          id: inv.id,
          date: inv.date,
          refNo: inv.invoiceNo,
          type: 'bill',
          amount: inv.totalCost,
          status,
          link: `/inward/edit/${inv.id}`
        });
      });
    }

    if (vend.paymentsMade) {
      vend.paymentsMade.forEach((pay: any) => {
        txs.push({
          id: pay.id,
          date: pay.date,
          refNo: pay.paymentNumber,
          type: 'payment',
          amount: pay.amount,
          status: pay.unusedAmount > 0 ? 'Excess' : 'Applied',
          link: `/paymentsmade/edit/${pay.id}`
        });
      });
    }

    if (vend.purchaseOrders) {
      vend.purchaseOrders.forEach((po: any) => {
        txs.push({
          id: po.id,
          date: po.poDate,
          refNo: po.poNo,
          type: 'order',
          amount: po.totalAmount,
          status: po.status.toUpperCase(),
          link: `/purchase-orders/edit/${po.id}`
        });
      });
    }

    // Sort transactions by date desc
    txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Filter by type
    if (transFilter === 'all') return txs;
    return txs.filter(tx => tx.type === transFilter);
  };

  // Show Add/Edit screen
  if (isEditMode || isAddMode) {
    return (
      <AddEditVendor
        vendor={isEditMode && currentVendor ? currentVendor : undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  // --- SPLIT PANE MODE ---
  if (id) {
    const vend = currentVendor as any;
    const chartData = vend ? getPurchasesChartData(vend.inwardInvoices) : [];
    const transactionsList = getFilteredTransactions();

    return (
      <div className="flex h-[calc(100vh-80px)] border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm -mt-2">
        {/* LEFT COLUMN: Vendor sidebar */}
        <div className="hidden md:flex md:w-[28%] md:min-w-[280px] md:max-w-[340px] border-r border-gray-200 flex-col bg-gray-50/50">
          {/* Sidebar Header */}
          <div className="p-3 border-b border-gray-200 bg-white flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="relative" ref={sidebarFilterDropdownRef}>
                <div
                  onClick={() => setSidebarFilterMenuOpen(!sidebarFilterMenuOpen)}
                  className="flex items-center gap-1 cursor-pointer select-none hover:opacity-85"
                >
                  <span className="text-[13px] font-bold text-gray-800 tracking-tight">Active Vendors</span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                </div>
                {sidebarFilterMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 rounded bg-white shadow-lg ring-1 ring-black ring-opacity-5 border border-gray-200 divide-y divide-gray-100 z-50 animate-fadeIn">
                    <div className="py-1">
                      <span className="block px-4 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Sort By</span>
                      
                      <button
                        onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setSidebarFilterMenuOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-gray-100 transition-colors flex items-center justify-between",
                          sortBy === 'name' ? "text-[#0082f4]" : "text-gray-700"
                        )}
                      >
                        <span>Name</span>
                        {sortBy === 'name' && (
                          <span className="text-[9px] font-bold uppercase">{sortOrder}</span>
                        )}
                      </button>

                      <button
                        onClick={() => { setSortBy('code'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setSidebarFilterMenuOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-gray-100 transition-colors flex items-center justify-between",
                          sortBy === 'code' ? "text-[#0082f4]" : "text-gray-700"
                        )}
                      >
                        <span>Code</span>
                        {sortBy === 'code' && (
                          <span className="text-[9px] font-bold uppercase">{sortOrder}</span>
                        )}
                      </button>

                      <button
                        onClick={() => { setSortBy('email'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setSidebarFilterMenuOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-gray-100 transition-colors flex items-center justify-between",
                          sortBy === 'email' ? "text-[#0082f4]" : "text-gray-700"
                        )}
                      >
                        <span>Email</span>
                        {sortBy === 'email' && (
                          <span className="text-[9px] font-bold uppercase">{sortOrder}</span>
                        )}
                      </button>

                      <button
                        onClick={() => { setSortBy('createdAt'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setSidebarFilterMenuOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-gray-100 transition-colors flex items-center justify-between",
                          sortBy === 'createdAt' ? "text-[#0082f4]" : "text-gray-700"
                        )}
                      >
                        <span>Created Time</span>
                        {sortBy === 'createdAt' && (
                          <span className="text-[9px] font-bold uppercase">{sortOrder}</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleAddVendor}
                  className="w-6.5 h-6.5 flex items-center justify-center text-white bg-[#0082f4] hover:bg-[#0073d8] rounded transition-colors"
                  title="New Vendor"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => debouncedSidebarSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Sidebar Vendor List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 bg-white">
            {loading && !vendors.length ? (
              <div className="p-8 text-center text-xs text-gray-450 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span>Loading sidebar...</span>
              </div>
            ) : vendors.length > 0 ? (
              vendors.map((v) => {
                const isActive = id === v.id.toString();
                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      if (activeTab === 'transactions') {
                        navigate(`/vendors/${v.id}/purchase`);
                      } else if (activeTab === 'statement') {
                        navigate(`/vendors/${v.id}/statement`);
                      } else {
                        navigate(`/vendors/${v.id}`);
                      }
                    }}
                    className={cn(
                      'p-3 flex items-start gap-2.5 cursor-pointer transition-colors border-l-[3px] border-transparent hover:bg-gray-50',
                      isActive ? 'bg-[#f3f8fe] border-[#0082f4]' : ''
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "text-[12px] truncate block",
                        isActive ? "font-bold text-gray-950" : "font-semibold text-gray-700"
                      )}>
                        {v.name}
                      </span>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                        <span>{v.code}</span>
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-gray-605">
                            {formatCurrency((v as any).payables || 0)}
                          </span>
                          {(v as any).unusedCredits > 0 && (
                            <span className="text-[9px] text-blue-600 font-bold mt-0.5">
                              Credits: {formatCurrency((v as any).unusedCredits || 0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-gray-450 italic">No vendors found</div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Vendor Details Pane */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden bg-white">
          {!vend ? (
            <div className="flex-1 flex flex-col items-center justify-center p-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#0082f4]" />
              <span className="text-xs text-gray-500 font-medium">Fetching details...</span>
            </div>
          ) : (
            <>
              {/* Detail Header bar */}
              <div className="px-3.5 py-3 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0 sticky top-0 z-20 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => navigate('/vendors')}
                    className="p-1.5 -ml-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-550 hover:text-gray-700 md:hidden flex-shrink-0"
                    title="Back to Vendors List"
                  >
                    <ArrowLeft className="h-4.5 w-4.5" />
                  </button>
                  <h2 className="text-sm sm:text-base font-extrabold text-gray-900 tracking-tight truncate">
                    {vend.name}
                  </h2>
                  <span className="h-4 w-px bg-gray-300 mx-1 flex-shrink-0 hidden sm:inline"></span>
                  <span className="inline-flex items-center px-1.5 py-0.25 rounded-[3px] text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 flex-shrink-0 hidden sm:inline">
                    Active
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Edit */}
                  <button
                    className="h-8 text-xs font-semibold px-2.5 sm:px-3.5 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 rounded text-gray-700 transition-all"
                    onClick={() => handleEditVendor(vend.id.toString())}
                  >
                    Edit
                  </button>

                  {/* Attach Paperclip Button */}
                  <button className="hidden sm:flex h-8 w-8 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 rounded text-gray-700 items-center justify-center transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>

                  {/* New Transaction Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setNewTransOpen(!newTransOpen)}
                      className="h-8 text-xs font-semibold px-2.5 sm:px-3.5 bg-[#0082f4] hover:bg-[#0073d8] text-white rounded flex items-center gap-1 transition-colors"
                    >
                      <span>
                        <span className="hidden sm:inline">New Transaction</span>
                        <span className="sm:hidden">New</span>
                      </span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    {newTransOpen && (
                      <div className="absolute right-0 mt-1 w-44 rounded bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200 divide-y divide-gray-50 z-50">
                        <div className="py-1">
                          <Link
                            to={`/inward/add?vendorId=${vend.id}`}
                            className="block px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors font-medium text-left"
                          >
                            Inward Bill
                          </Link>
                          <Link
                            to={`/purchase-orders/add?vendorId=${vend.id}`}
                            className="block px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors font-medium text-left"
                          >
                            Purchase Order
                          </Link>
                        </div>
                        <div className="py-1">
                          <Link
                            to={`/paymentsmade/add?vendorId=${vend.id}`}
                            className="block px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors font-medium text-left"
                          >
                            Payment Made
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* More Dropdown */}
                  <div className="relative" ref={moreDropdownRef}>
                    <button
                      onClick={() => setMoreOpen(!moreOpen)}
                      className="h-8 text-xs font-semibold px-2 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 rounded text-gray-700 flex items-center justify-center transition-all"
                    >
                      <MoreHorizontal className="h-4 w-4 text-gray-500" />
                    </button>
                    {moreOpen && (
                      <div className="absolute right-0 mt-1 w-36 rounded bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200 z-50">
                        <button
                          onClick={() => handleDelete(vend)}
                          className="w-full text-left px-4 py-2 text-xs text-red-655 hover:bg-red-50 hover:text-red-700 transition-colors font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => navigate('/vendors')}
                    className="hidden md:flex p-1 rounded hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-500 hover:text-gray-750 ml-1.5"
                    title="Close Details"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Tabs list */}
              <div className="px-5 border-b border-gray-200 flex-shrink-0 bg-white sticky top-[57px] z-10 flex gap-6 overflow-x-auto whitespace-nowrap flex-nowrap scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {(['overview', 'transactions', 'statement'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={cn(
                      'py-3.5 text-[12px] font-bold relative transition-all uppercase tracking-wider flex-shrink-0',
                      activeTab === tab
                        ? 'text-[#0082f4] border-b-2 border-[#0082f4]'
                        : 'text-gray-400 hover:text-gray-650'
                    )}
                  >
                    {tab === 'transactions' ? 'Transactions' : tab === 'statement' ? 'Statement' : 'Overview'}
                  </button>
                ))}
              </div>

              {/* Scrollable Details Tab Body */}
              <div className="flex-1 p-5 bg-gray-50/20">
                {/* --- OVERVIEW TAB --- */}
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Left details stats pane */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Vendor Profile Info Card */}
                      <div className="bg-[#f4f7fd] border border-blue-100/50 rounded-lg p-5 shadow-2xs relative">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded bg-blue-100 flex items-center justify-center text-[#0082f4] font-bold text-base flex-shrink-0 border border-blue-200/50 shadow-3xs">
                            {vend.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[13px] font-black text-gray-900 truncate tracking-tight">{vend.name}</h3>
                            {vend.email && (
                              <p className="text-xs text-blue-600 hover:underline mt-1 font-semibold flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-gray-450" />
                                {vend.email}
                              </p>
                            )}
                            {vend.phone && (
                              <p className="text-xs text-gray-655 mt-1 font-bold flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-gray-450" />
                                {vend.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Addresses Card */}
                      <div className="bg-white border border-gray-200 rounded p-4.5 shadow-2xs">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                          Addresses
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Billing Address */}
                          <div className="border border-gray-150 rounded p-3 bg-gray-50/20">
                            <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-gray-700">
                              <MapPin className="h-3.5 w-3.5 text-gray-400" />
                              <span>Billing Address</span>
                            </div>
                            <p className="text-[11px] text-gray-650 leading-relaxed font-semibold italic">
                              {vend.address || 'No billing address provided.'}
                            </p>
                            {vend.state && (
                              <span className="mt-1 block text-[10px] text-gray-455 font-bold uppercase tracking-wide">
                                State: {vend.state}
                              </span>
                            )}
                          </div>

                          {/* Shipping Address */}
                          <div className="border border-gray-150 rounded p-3 bg-gray-50/20">
                            <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-gray-700">
                              <MapPin className="h-3.5 w-3.5 text-gray-400" />
                              <span>Shipping Address</span>
                            </div>
                            <p className="text-[11px] text-gray-655 leading-relaxed font-semibold italic">
                              {vend.address || 'No shipping address provided.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Other details list */}
                      <div className="bg-white border border-gray-200 rounded shadow-2xs overflow-hidden">
                        <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
                          <h3 className="text-xs font-bold text-gray-750 uppercase tracking-wider">
                            Other Details
                          </h3>
                        </div>
                        <div className="p-4 divide-y divide-gray-100 text-xs">
                          <div className="flex py-2.5 items-center">
                            <span className="w-1/3 font-semibold text-gray-400">Vendor Type</span>
                            <span className="w-2/3 font-bold text-gray-805">Supplier</span>
                          </div>
                          <div className="flex py-2.5 items-center">
                            <span className="w-1/3 font-semibold text-gray-400">Default Currency</span>
                            <span className="w-2/3 font-bold text-gray-808">INR - Indian Rupee</span>
                          </div>
                          <div className="flex py-2.5 items-center">
                            <span className="w-1/3 font-semibold text-gray-400">Business Legal Name</span>
                            <span className="w-2/3 font-bold text-gray-808">{vend.name}</span>
                          </div>
                          <div className="flex py-2.5 items-center">
                            <span className="w-1/3 font-semibold text-gray-400">GSTIN</span>
                            <span className="w-2/3 font-bold text-blue-600">{vend.gstNumber || 'N/A'}</span>
                          </div>
                          <div className="flex py-2.5 items-center">
                            <span className="w-1/3 font-semibold text-gray-400">Place of Supply</span>
                            <span className="w-2/3 font-bold text-gray-808">{vend.state || 'N/A'}</span>
                          </div>
                          <div className="flex py-2.5 items-center">
                            <span className="w-1/3 font-semibold text-gray-400">PAN</span>
                            <span className="w-2/3 font-bold text-gray-808">{extractPAN(vend.gstNumber)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right column balances and timeline */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Balance stats card */}
                      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-2xs divide-y divide-gray-100">
                        <div className="pb-3 flex flex-col">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Outstanding Payables
                          </span>
                          <span className="text-lg font-black text-gray-808 mt-1 leading-none">
                            {formatCurrency(vend.payables || 0)}
                          </span>
                        </div>
                        <div className="pt-3 flex flex-col">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Unused Credits
                          </span>
                          <span className="text-base font-black text-[#0082f4] hover:underline cursor-pointer mt-1.5 leading-none">
                            {formatCurrency(vend.unusedCredits || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Purchases Chart */}
                      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-2xs">
                        <div className="flex flex-col mb-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                              Purchases
                            </h3>
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-450 uppercase tracking-wider">
                              <span>Last 6 Months</span>
                              <ChevronDown className="h-3 w-3" />
                            </div>
                          </div>
                          <span className="text-[9px] text-gray-400 mt-0.5 leading-none">this chart is displayed in the organization's base currency</span>
                        </div>
                        <div className="h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                              <defs>
                                <linearGradient id="vendorPurchases" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#e25822" stopOpacity={0.2} />
                                  <stop offset="95%" stopColor="#e25822" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                              <YAxis stroke="#94a3b8" fontSize={9} />
                              <Tooltip
                                formatter={(value) => [formatCurrency(Number(value)), 'Purchases']}
                                contentStyle={{
                                  backgroundColor: 'white',
                                  border: '1px solid #ced4da',
                                  borderRadius: '2px',
                                  fontSize: '10px',
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="Amount"
                                stroke="#e25822"
                                strokeWidth={1.5}
                                fill="url(#vendorPurchases)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="bg-white border border-gray-200 rounded p-4.5 shadow-2xs">
                        <h3 className="text-xs font-bold text-gray-450 uppercase tracking-wider mb-4">
                          Activity Timeline
                        </h3>
                        <div className="relative border-l border-gray-200 pl-4.5 space-y-4.5 text-xs">
                          {vend.timeline && vend.timeline.length > 0 ? (
                            vend.timeline.map((event: any) => (
                              <div key={event.id} className="relative">
                                {/* Hollow circle marker */}
                                <span className="absolute -left-[23.5px] top-1.5 h-2 w-2 rounded-full border border-blue-500 bg-white"></span>
                                <div className="flex justify-between items-start gap-1">
                                  <span className="font-bold text-gray-800">{event.title}</span>
                                  <span className="text-[9px] text-gray-455 flex-shrink-0 font-semibold tracking-tight">
                                    {formatDate(event.date)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5 font-medium leading-relaxed">
                                  {event.description} <span className="text-gray-400">by Vegnar Global</span>
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-400 text-xs italic py-2">No activity recorded yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- TRANSACTIONS TAB --- */}
                {activeTab === 'transactions' && (
                  <div className="space-y-4">
                    {/* Filters Row */}
                    <div className="bg-white border border-gray-200 rounded p-2.5 shadow-2xs flex items-center justify-between overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <div className="flex gap-2 flex-nowrap whitespace-nowrap">
                        {(['all', 'bill', 'order', 'payment'] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => setTransFilter(type)}
                            className={cn(
                              'px-3 py-1 rounded-sm text-xs font-bold border transition-all flex-shrink-0',
                              transFilter === type
                                ? 'bg-gray-800 text-white border-gray-800'
                                : 'bg-gray-50 text-gray-650 border-gray-300 hover:bg-gray-100'
                            )}
                          >
                            {type === 'order' ? 'Purchase Orders' : type === 'bill' ? 'Bills' : type === 'payment' ? 'Payments Made' : 'All'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Table list */}
                    <div className="bg-white border border-gray-200 rounded shadow-2xs overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-xs text-left min-w-[650px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2.5 font-bold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-2.5 font-bold text-gray-500 uppercase tracking-wider">Reference #</th>
                            <th className="px-4 py-2.5 font-bold text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-2.5 font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-2.5 text-right font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white font-medium">
                          {transactionsList.length > 0 ? (
                            transactionsList.map((tx, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50">
                                <td className="px-4 py-2.5 text-gray-550">{formatDate(tx.date)}</td>
                                <td className="px-4 py-2.5 font-bold">
                                  <Link to={tx.link} className="text-blue-600 hover:underline">
                                    {tx.refNo}
                                  </Link>
                                </td>
                                <td className="px-4 py-2.5 uppercase text-[9px] font-bold">
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded-[3px] border",
                                    tx.type === 'bill' && 'bg-blue-50 text-blue-800 border-blue-200',
                                    tx.type === 'payment' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                                    tx.type === 'order' && 'bg-purple-50 text-purple-800 border-purple-200'
                                  )}>
                                    {tx.type}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-[9px] font-bold">
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded-[3px] border",
                                    ['PAID', 'APPLIED', 'RECEIVED'].includes(tx.status.toUpperCase()) && 'bg-green-50 text-green-800 border-green-200',
                                    ['SENT', 'EXCESS', 'PARTIALLY PAID', 'CONFIRMED'].includes(tx.status.toUpperCase()) && 'bg-amber-50 text-amber-800 border-amber-255',
                                    ['DRAFT', 'PENDING', 'UNPAID'].includes(tx.status.toUpperCase()) && 'bg-gray-50 text-gray-700 border-gray-300'
                                  )}>
                                    {tx.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-gray-900">{formatCurrency(tx.amount)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-400 font-semibold">
                                No transactions found in this filter.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* --- STATEMENT TAB --- */}
                {activeTab === 'statement' && (
                  <div className="space-y-4">
                    {/* Presets and PDF Download Bar */}
                    <div className="bg-white border border-gray-200 rounded p-3 shadow-2xs flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-end gap-3 text-xs w-full sm:w-auto">
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Date Period</label>
                          <select
                            value={dateRangePreset}
                            onChange={(e) => setDateRangePreset(e.target.value)}
                            className="h-8 text-xs font-semibold bg-gray-50 border border-gray-300 rounded px-2 text-gray-805 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-36"
                          >
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
                            <option value="this_quarter">This Quarter</option>
                            <option value="this_year">This Year</option>
                            <option value="all_time">All Time</option>
                            <option value="custom">Custom Range</option>
                          </select>
                        </div>
                        {(dateRangePreset === 'custom' || startDate || endDate) && dateRangePreset !== 'all_time' && (
                          <>
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Start Date</label>
                              <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                  setStartDate(e.target.value);
                                  if (dateRangePreset !== 'custom') setDateRangePreset('custom');
                                }}
                                className="h-8 text-xs font-semibold bg-gray-50 border border-gray-300 rounded px-2.5 text-gray-808"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">End Date</label>
                              <input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                  setEndDate(e.target.value);
                                  if (dateRangePreset !== 'custom') setDateRangePreset('custom');
                                }}
                                className="h-8 text-xs font-semibold bg-gray-50 border border-gray-300 rounded px-2.5 text-gray-808"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-end pt-1">
                        <Button
                          onClick={handleDownloadPDF}
                          disabled={!ledgerData || downloading || ledgerLoading}
                          className="h-8 bg-[#e25822] hover:bg-[#c84d1e] active:bg-[#b04319] text-white font-bold px-4 rounded text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                        >
                          {downloading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          <span>Export PDF</span>
                        </Button>
                      </div>
                    </div>

                    {ledgerLoading ? (
                      <div className="bg-white border rounded p-12 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-[#0082f4]" />
                        <span className="text-xs text-gray-500 font-semibold">Compiling statement records...</span>
                      </div>
                    ) : ledgerData ? (
                      <div className="space-y-4">
                        {/* Statement balance metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white p-3 rounded border border-gray-200 shadow-2xs flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Opening Balance</span>
                            <span className="text-sm font-extrabold text-gray-900 mt-1">
                              {formatLedgerBalance(ledgerData.openingBalance)}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded border border-gray-200 shadow-2xs flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Debits</span>
                            <span className="text-sm font-extrabold text-gray-900 mt-1">
                              {formatCurrency(ledgerData.totalDebit)}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded border border-gray-200 shadow-2xs flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Credits</span>
                            <span className="text-sm font-extrabold text-gray-900 mt-1">
                              {formatCurrency(ledgerData.totalCredit)}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded border border-gray-150 bg-blue-50/10 shadow-2xs flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Net Outstanding</span>
                            <span className="text-sm font-black text-blue-600 mt-1">
                              {formatLedgerBalance(ledgerData.closingBalance)}
                            </span>
                          </div>
                        </div>

                        {/* Statement list table */}
                        <div className="bg-white border border-gray-200 rounded shadow-2xs overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 text-xs text-left min-w-[750px]">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2.5 font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-2.5 font-bold text-gray-500 uppercase tracking-wider">Transaction #</th>
                                <th className="px-4 py-2.5 font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-2.5 font-bold text-gray-500 uppercase tracking-wider">Details</th>
                                <th className="px-4 py-2.5 text-right font-bold text-gray-500 uppercase tracking-wider">Debit</th>
                                <th className="px-4 py-2.5 text-right font-bold text-gray-500 uppercase tracking-wider">Credit</th>
                                <th className="px-4 py-2.5 text-right font-bold text-gray-500 uppercase tracking-wider">Balance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white font-semibold">
                              {/* Opening Balance */}
                              <tr className="bg-gray-50/50 font-bold text-gray-655">
                                <td className="px-4 py-2.5 text-gray-400">{startDate ? formatDate(startDate) : '—'}</td>
                                <td className="px-4 py-2.5 text-gray-805">Opening Balance</td>
                                <td className="px-4 py-2.5 text-gray-400">—</td>
                                <td className="px-4 py-2.5 text-gray-550 italic">Statement Start Balance</td>
                                <td className="px-4 py-2.5 text-right text-gray-400">—</td>
                                <td className="px-4 py-2.5 text-right text-gray-400">—</td>
                                <td className="px-4 py-2.5 text-right">{formatLedgerBalance(ledgerData.openingBalance)}</td>
                              </tr>

                              {/* Transactions */}
                              {ledgerData.transactions.length > 0 ? (
                                ledgerData.transactions.map((tx) => (
                                  <tr key={tx.id} className="hover:bg-gray-50/40">
                                    <td className="px-4 py-2.5 text-gray-555">{formatDate(tx.date)}</td>
                                    <td className="px-4 py-2.5 font-bold text-gray-805">{tx.refNo}</td>
                                    <td className="px-4 py-2.5 text-[10px] uppercase font-bold text-gray-555">{tx.type}</td>
                                    <td className="px-4 py-2.5 text-gray-500 italic font-medium">{tx.details}</td>
                                    <td className="px-4 py-2.5 text-right text-emerald-655 font-bold">
                                      {tx.debit > 0 ? formatCurrency(tx.debit) : '—'}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-red-655 font-bold">
                                      {tx.credit > 0 ? formatCurrency(tx.credit) : '—'}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-extrabold text-gray-900">
                                      {formatLedgerBalance(tx.balance)}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                    No ledger entries recorded in this period.
                                  </td>
                                </tr>
                              )}

                              {/* Closing Balance */}
                              <tr className="bg-gray-50 font-extrabold text-gray-900 border-t-2">
                                <td className="px-4 py-2.5 text-gray-400">{endDate ? formatDate(endDate) : '—'}</td>
                                <td className="px-4 py-2.5">Closing Balance</td>
                                <td className="px-4 py-2.5 text-gray-400">—</td>
                                <td className="px-4 py-2.5 text-gray-500 italic font-medium">Net Statement Balance</td>
                                <td className="px-4 py-2.5 text-right">{formatCurrency(ledgerData.totalDebit)}</td>
                                <td className="px-4 py-2.5 text-right">{formatCurrency(ledgerData.totalCredit)}</td>
                                <td className="px-4 py-2.5 text-right text-blue-600 font-black">
                                  {formatLedgerBalance(ledgerData.closingBalance)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border rounded p-12 text-center text-xs text-gray-450 italic">
                        Select a vendor and timeframe to load statements.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- FULL WIDTH LIST VIEW (Default) ---
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Zoho Books style custom header panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 border-b border-gray-200 bg-white sticky top-0 z-10 gap-3">
        <div className="relative" ref={filterDropdownRef}>
          <div
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            className="flex items-center gap-1.5 cursor-pointer select-none hover:opacity-85"
          >
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Active Vendors</h1>
            <ChevronDown className="h-4 w-4 text-gray-500 mt-0.5" />
          </div>
          {filterMenuOpen && (
            <div className="absolute left-0 mt-2 w-56 rounded bg-white shadow-lg ring-1 ring-black ring-opacity-5 border border-gray-200 divide-y divide-gray-100 z-50 animate-fadeIn">
              <div className="py-1">
                <span className="block px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sort By</span>
                
                <button
                  onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setFilterMenuOpen(false); }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-xs font-semibold hover:bg-gray-100 transition-colors flex items-center justify-between",
                    sortBy === 'name' ? "text-[#0082f4]" : "text-gray-700"
                  )}
                >
                  <span>Name</span>
                  {sortBy === 'name' && (
                    <span className="text-[10px] font-bold uppercase">{sortOrder}</span>
                  )}
                </button>

                <button
                  onClick={() => { setSortBy('code'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setFilterMenuOpen(false); }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-xs font-semibold hover:bg-gray-100 transition-colors flex items-center justify-between",
                    sortBy === 'code' ? "text-[#0082f4]" : "text-gray-700"
                  )}
                >
                  <span>Vendor Code</span>
                  {sortBy === 'code' && (
                    <span className="text-[10px] font-bold uppercase">{sortOrder}</span>
                  )}
                </button>

                <button
                  onClick={() => { setSortBy('email'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setFilterMenuOpen(false); }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-xs font-semibold hover:bg-gray-100 transition-colors flex items-center justify-between",
                    sortBy === 'email' ? "text-[#0082f4]" : "text-gray-700"
                  )}
                >
                  <span>Email</span>
                  {sortBy === 'email' && (
                    <span className="text-[10px] font-bold uppercase">{sortOrder}</span>
                  )}
                </button>

                <button
                  onClick={() => { setSortBy('createdAt'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setFilterMenuOpen(false); }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-xs font-semibold hover:bg-gray-100 transition-colors flex items-center justify-between",
                    sortBy === 'createdAt' ? "text-[#0082f4]" : "text-gray-700"
                  )}
                >
                  <span>Created Time</span>
                  {sortBy === 'createdAt' && (
                    <span className="text-[10px] font-bold uppercase">{sortOrder}</span>
                  )}
                </button>
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
              placeholder="Search..."
              className="w-full sm:w-48 md:w-56 pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>

          <button
            onClick={handleAddVendor}
            className="h-8 text-xs font-bold px-3.5 bg-[#0082f4] hover:bg-[#0073d8] text-white rounded flex items-center gap-1 shadow-2xs transition-colors flex-shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200 mx-1 flex-shrink-0"></div>

          {/* Bulk upload and Export triggers */}
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={() => setBulkUploadOpen(true)}
              className="p-1.5 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 rounded text-gray-700"
              title="Bulk Upload"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleExport}
              className="p-1.5 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 rounded text-gray-700"
              title="Export"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Table formatted exactly like Zoho Books active vendor table (Desktop Only) */}
      <div className="hidden md:block bg-white border border-gray-200 rounded shadow-xs overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-xs text-left min-w-[950px]">
          <thead className="bg-gray-50/75">
            <tr>
              <th
                className="px-4 py-3 font-bold text-gray-555 uppercase tracking-wider cursor-pointer hover:bg-gray-100/75 select-none"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  <span>Name</span>
                  {sortBy === 'name' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                </div>
              </th>
              <th className="px-4 py-3 font-bold text-gray-555 uppercase tracking-wider">Company Name</th>
              <th
                className="px-4 py-3 font-bold text-gray-555 uppercase tracking-wider cursor-pointer hover:bg-gray-100/75 select-none"
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center gap-1">
                  <span>Email</span>
                  {sortBy === 'email' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                </div>
              </th>
              <th
                className="px-4 py-3 font-bold text-gray-555 uppercase tracking-wider cursor-pointer hover:bg-gray-100/75 select-none"
                onClick={() => handleSort('phone')}
              >
                <div className="flex items-center gap-1">
                  <span>Work Phone</span>
                  {sortBy === 'phone' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                </div>
              </th>
              <th className="px-4 py-3 font-bold text-gray-555 uppercase tracking-wider">Place of Supply</th>
              <th className="px-4 py-3 text-right font-bold text-gray-555 uppercase tracking-wider">Payables (BCY)</th>
              <th className="px-4 py-3 text-right font-bold text-gray-555 uppercase tracking-wider">Unused Credits (BCY)</th>
              <th className="px-4 py-3 text-right font-bold text-gray-555 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white font-medium">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span>Loading vendors...</span>
                  </div>
                </td>
              </tr>
            ) : vendors.length > 0 ? (
              vendors.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <Link to={`/vendors/${v.id}`} className="font-bold text-[#0082f4] hover:underline">
                        {v.name}
                      </Link>
                      <span className="text-[10px] text-gray-400 font-semibold">{v.code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-800">{v.name}</td>
                  <td className="px-4 py-3 text-gray-655">{v.email || '-'}</td>
                  <td className="px-4 py-3 text-gray-655">{v.phone || '-'}</td>
                  <td className="px-4 py-3 text-gray-655">{v.state || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-805">
                    {formatCurrency((v as any).payables || 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600">
                    {formatCurrency((v as any).unusedCredits || 0)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => handleEditVendor(v.id.toString())}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(v)} className="text-red-655 hover:text-red-700">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  No vendors found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-2.5">
        {loading && !vendors.length ? (
          <div className="bg-white border border-gray-200 rounded p-12 text-center text-gray-400">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span>Loading vendors...</span>
            </div>
          </div>
        ) : vendors.length > 0 ? (
          vendors.map((v) => (
            <div
              key={v.id}
              onClick={() => navigate(`/vendors/${v.id}`)}
              className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-2xs hover:border-blue-300 active:bg-gray-50/50 transition-all flex flex-col gap-2.5 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="min-w-0">
                    <span className="font-extrabold text-sm text-gray-900 block truncate">
                      {v.name}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-0.5">
                      {v.code}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end flex-shrink-0 text-right">
                  <span className="text-xs font-black text-gray-850">
                    {formatCurrency((v as any).payables || 0)}
                  </span>
                  {(v as any).unusedCredits > 0 && (
                    <span className="text-[10px] text-blue-600 font-bold mt-0.5">
                      Cr: {formatCurrency((v as any).unusedCredits || 0)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 border-t border-gray-100 pt-2.5">
                {v.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    <span className="truncate max-w-[150px]">{v.email}</span>
                  </span>
                )}
                {v.phone && (
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    <span>{v.phone}</span>
                  </span>
                )}
                {v.state && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    <span>{v.state}</span>
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-50 pt-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs font-semibold px-2 border border-gray-200 hover:bg-gray-50 rounded text-gray-655"
                  onClick={() => handleEditVendor(v.id.toString())}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs font-semibold px-2 border border-gray-200 hover:bg-red-50 hover:text-red-700 text-red-655 rounded"
                  onClick={() => handleDelete(v)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-gray-200 rounded p-12 text-center text-gray-400 italic">
            No vendors found.
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white px-4 py-2.5 border border-gray-200 rounded shadow-2xs flex justify-between items-center flex-wrap gap-2">
          <Pagination
            currentPage={pagination?.page || 1}
            totalPages={pagination?.totalPages || 1}
            total={pagination?.total || 0}
            limit={pagination?.limit || 10}
            onPageChange={setCurrentPage}
            loading={loading}
          />
        </div>
      )}

      {/* Bulk Upload Modal */}
      <BulkUpload
        type="vendors"
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={() =>
          dispatch(fetchVendors({ page: currentPage, limit: 10, search, sortBy, sortOrder }))
        }
      />
    </div>
  );
};

export default Vendors;
