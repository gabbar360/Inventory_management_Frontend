import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, Eye, Download, Edit, Trash2, Loader2, X, ArrowLeft, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchPaymentsMade,
  fetchPaymentMadeById,
  deletePaymentMade,
  clearError,
} from '@/slices/paymentsMadeSlice';
import { fetchVendors } from '@/slices/vendorSlice';
import { paymentsMadeService } from '@/services/paymentsMadeService';
import { PaymentMade } from '@/types';
import { formatDate, formatCurrency, debounce, cn } from '@/utils';
import Button from '@/components/Button';
import Table from '@/components/Table';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import AddEditPaymentsMade from '@/components/AddEditPaymentsMade';
import ApplyCreditsModal from '@/components/ApplyCreditsModal';
import { SearchableDropdown } from '@/components/SearchableDropdown';
import ShareDocumentModal from '@/components/ShareDocumentModal';

const PaymentsMade: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { payments, currentPayment, pagination, loading, error } = useAppSelector((state) => state.paymentsMade);
  const { vendors } = useAppSelector((state) => state.vendors);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMade | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const [applyCreditsPayment, setApplyCreditsPayment] = useState<PaymentMade | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [searchVal, setSearchVal] = useState('');
  const [sharePayment, setSharePayment] = useState<PaymentMade | null>(null);

  // Map vendors list to options compatible with SearchableDropdown
  const vendorOptions = [
    { name: 'All Vendors', code: '' },
    ...(vendors || []).map((v) => ({
      name: `${v.code} - ${v.name}`,
      code: v.id.toString(),
    })),
  ];

  const selectedVendorObj = (vendors || []).find((v) => v.id.toString() === selectedVendorId);
  const selectedVendorName = selectedVendorObj ? `${selectedVendorObj.code} - ${selectedVendorObj.name}` : 'All Vendors';
  const [showKPIs, setShowKPIs] = useState<boolean>(() => {
    return localStorage.getItem('vegnar_show_kpis_paymentsmade') !== 'false';
  });

  // Filters matching Zoho
  const filterByParam = searchParams.get('filter_by') || 'PaymentMode.All';
  const sortColumnParam = searchParams.get('sort_column') || 'date';
  const sortOrderParam = searchParams.get('sort_order') || 'D';

  const paymentModeFilter = filterByParam.replace('PaymentMode.', '');

  useEffect(() => {
    dispatch(fetchVendors({ limit: 500 }));
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      fetchPaymentsMade({
        page: currentPage,
        limit: 10,
        search,
        sortBy: sortColumnParam,
        sortOrder: sortOrderParam === 'D' ? 'desc' : 'asc',
        paymentMode: paymentModeFilter === 'All' ? undefined : (paymentModeFilter === 'UnusedCredits' ? undefined : paymentModeFilter),
        vendorId: selectedVendorId || undefined,
        unusedCreditsOnly: filterByParam === 'UnusedCredits' ? true : undefined,
      })
    );
  }, [dispatch, search, currentPage, filterByParam, sortColumnParam, sortOrderParam, selectedVendorId]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (id) {
      dispatch(fetchPaymentMadeById(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      if (selectedPayment) {
        mainEl.style.overflowY = 'hidden';
      } else {
        mainEl.style.overflowY = 'auto';
      }
    }
    return () => {
      if (mainEl) {
        mainEl.style.overflowY = 'auto';
      }
    };
  }, [selectedPayment]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const handleAddPayment = () => navigate('/paymentsmade/add');
  const handleEditPayment = (payment: PaymentMade) => navigate(`/paymentsmade/edit/${payment.id}`);

  const handleFormSuccess = () => {
    navigate('/paymentsmade');
    dispatch(
      fetchPaymentsMade({
        page: currentPage,
        limit: 10,
        search,
        sortBy: sortColumnParam,
        sortOrder: sortOrderParam === 'D' ? 'desc' : 'asc',
      })
    );
  };

  const handleFormCancel = () => navigate('/paymentsmade');

  const viewPaymentDetails = async (payment: PaymentMade) => {
    try {
      const fullPayment = await dispatch(fetchPaymentMadeById(payment.id)).unwrap();
      setSelectedPayment(fullPayment);
      setViewModalOpen(true);
    } catch (error) {
      console.error('Failed to load payment details:', error);
    }
  };

  const handleDeletePayment = async (payment: PaymentMade) => {
    if (window.confirm('Are you sure you want to delete this payment record? This will restore the outstanding balances on any applied bills.')) {
      try {
        await dispatch(deletePaymentMade(payment.id)).unwrap();
        toast.success('Payment made deleted successfully');
        dispatch(
          fetchPaymentsMade({
            page: currentPage,
            limit: 10,
            search,
            sortBy: sortColumnParam,
            sortOrder: sortOrderParam === 'D' ? 'desc' : 'asc',
          })
        );
      } catch (error) {
        // Redux handles errors
      }
    }
  };

  const handleDownloadPDF = async (payment: PaymentMade) => {
    setDownloadingId(payment.id);
    try {
      const blob = await paymentsMadeService.generatePDF(payment.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PaymentReceipt-${payment.paymentNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Payment receipt PDF downloaded successfully');
    } catch (error: any) {
      toast.error('Failed to generate PDF receipt');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFilterChange = (filter: string) => {
    navigate(`/paymentsmade?filter_by=${filter}&per_page=25&sort_column=${sortColumnParam}&sort_order=${sortOrderParam}`);
    setCurrentPage(1);
  };

  const columns = [
    {
      key: 'paymentNumber',
      title: 'Payment #',
      sortable: true,
      render: (value: string, record: PaymentMade) => (
        <div className="flex flex-col">
          <span className="font-semibold text-teal-600 hover:text-teal-800 cursor-pointer" onClick={() => viewPaymentDetails(record)}>
            {value}
          </span>
          {record.transactionType === 'vendor_advance' && (
            <span className="inline-flex items-center w-max px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-255 mt-1 uppercase tracking-wider">
              Vendor Advance
            </span>
          )}
          {record.transactionType === 'credit_application' && (
            <span className="inline-flex items-center w-max px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-100 text-purple-800 border border-purple-200 mt-1 uppercase tracking-wider">
              Credit Applied
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      title: 'Date',
      sortable: true,
      render: (value: string) => formatDate(value),
    },
    {
      key: 'vendor.name',
      title: 'Vendor',
      sortable: true,
      render: (_: any, record: PaymentMade) => (
        <div>
          <div className="font-medium text-gray-900">{record.vendor?.name}</div>
          <div className="text-xs text-gray-500">{record.vendor?.code}</div>
        </div>
      ),
    },
    {
      key: 'referenceNumber',
      title: 'Reference #',
      render: (value: string) => value || '—',
    },
    {
      key: 'paymentMode',
      title: 'Mode',
      render: (value: string) => (
        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
          {value}
        </span>
      ),
    },
    {
      key: 'amount',
      title: 'Amount Paid',
      sortable: true,
      render: (value: number) => <span className="font-semibold text-gray-900">{formatCurrency(value)}</span>,
    },
    {
      key: 'unusedAmount',
      title: 'Unused (Advance)',
      sortable: true,
      render: (value: number) => (
        <span className={cn('font-semibold', value > 0 ? 'text-amber-600' : 'text-gray-500')}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: PaymentMade) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => viewPaymentDetails(record)} title="View Detail">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(record)} title="Download Receipt" disabled={downloadingId === record.id}>
            {downloadingId === record.id ? <Loader2 className="h-4 w-4 animate-spin text-teal-500" /> : <Download className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSharePayment(record)} title="Send via Email">
            <Mail className="h-4 w-4" />
          </Button>
          {record.transactionType === 'vendor_advance' && record.unusedAmount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setApplyCreditsPayment(record)}
              title="Apply Credits to Bills"
              className="text-amber-600 hover:text-amber-700 text-[10px] font-bold px-1.5"
            >
              Apply Credits
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => handleEditPayment(record)} title="Edit">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDeletePayment(record)} className="text-red-600 hover:text-red-700" title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Render form in Add or Edit mode
  if (id || window.location.pathname.includes('/add')) {
    return (
      <AddEditPaymentsMade
        payment={id && currentPayment ? currentPayment : undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }
  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
        <span>Purchases</span>
        <span>/</span>
        <span className="text-gray-650 font-bold hover:underline cursor-pointer" onClick={() => setSelectedPayment(null)}>Payments Made</span>
      </div>

      {/* Main Zoho Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 border-b border-gray-200 gap-3">
        {/* Left: View Dropdown Selector */}
        <div className="flex items-center gap-2">
          <div className="relative inline-block">
            <select
              value={filterByParam}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="appearance-none pr-8 pl-1 py-1 font-bold text-xl text-gray-800 bg-transparent hover:bg-gray-100/60 rounded cursor-pointer outline-none border-none focus:ring-0 flex items-center transition-colors"
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%234b5563' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                backgroundPosition: 'right 4px center',
                backgroundSize: '16px',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <option value="PaymentMode.All">All Payments Made</option>
              <option value="UnusedCredits">Available Credits to Apply</option>
              <option value="PaymentMode.Cash">Cash Payments</option>
              <option value="PaymentMode.Bank Transfer">Bank Transfers</option>
              <option value="PaymentMode.Check">Check Payments</option>
              <option value="PaymentMode.Credit Card">Credit Card Payments</option>
            </select>
          </div>
        </div>

        {/* Right: Actions, Search, Filters, Stats Toggle, New Button */}        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto md:justify-end">
          {/* Search Input */}
          <div className="relative w-full sm:w-48">
            <input
              type="text"
              placeholder="Search payments..."
              value={searchVal}
              onChange={(e) => {
                setSearchVal(e.target.value);
                debouncedSearch(e.target.value);
              }}
              className="pl-3 pr-8 py-1.5 w-full border border-gray-300 rounded focus:ring-1 focus:ring-teal-650 focus:border-teal-655 outline-none text-xs bg-white shadow-2xs font-medium text-gray-800 transition-all duration-150"
            />
            {searchVal && (
              <button
                onClick={() => {
                  setSearchVal('');
                  debouncedSearch('');
                }}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-655"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Vendor Select Dropdown */}
          <div className="w-full sm:w-[180px]">
            <SearchableDropdown
              value={selectedVendorName}
              options={vendorOptions}
              onChange={(name) => {
                if (name === 'All Vendors' || !name) {
                  setSelectedVendorId('');
                } else {
                  const v = (vendors || []).find((vend) => `${vend.code} - ${vend.name}` === name);
                  setSelectedVendorId(v ? v.id.toString() : '');
                }
                setCurrentPage(1);
              }}
              placeholder="All Vendors"
            />
          </div>

          {/* Sort Dropdown */}
          <select
            value={`${sortColumnParam}:${sortOrderParam}`}
            onChange={(e) => {
              const [col, order] = e.target.value.split(':');
              navigate(`/paymentsmade?filter_by=${filterByParam}&per_page=25&sort_column=${col}&sort_order=${order}`);
              setCurrentPage(1);
            }}
            className="h-8 text-xs font-semibold bg-white border border-gray-300 rounded-md px-2.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-650 focus:border-teal-655 shadow-2xs w-full sm:w-auto"
          >
            <option value="date:D">Date: Newest First</option>
            <option value="date:A">Date: Oldest First</option>
            <option value="amount:D">Amount: High to Low</option>
            <option value="amount:A">Amount: Low to High</option>
            <option value="unusedAmount:D">Available Credit: High to Low</option>
            <option value="unusedAmount:A">Available Credit: Low to High</option>
            <option value="paymentNumber:D">Payment #: Z-A</option>
            <option value="paymentNumber:A">Payment #: A-Z</option>
          </select>

          {/* Action buttons flex wrapper */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Toggle KPIs Stats Button */}
            <button
              onClick={() => {
                const nextVal = !showKPIs;
                setShowKPIs(nextVal);
                localStorage.setItem('vegnar_show_kpis_paymentsmade', String(nextVal));
              }}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-655 transition-colors shadow-2xs flex-shrink-0",
                showKPIs && "text-teal-650 bg-teal-50/20 border-teal-200"
              )}
              title="Toggle Summary Cards"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </button>

            {/* Record Payment Button (Zoho Signature Orange) */}
            <button
              onClick={handleAddPayment}
              className="h-8 bg-[#e25822] hover:bg-[#c84d1e] active:bg-[#b04319] text-white font-bold px-3.5 rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm flex-1 sm:flex-initial"
            >
              <Plus className="h-4 w-4" />
              <span>New</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards — only show when showKPIs is enabled and not in split pane */}
      {showKPIs && !selectedPayment && pagination?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Cash Paid</span>
            <span className="text-lg font-bold text-gray-900 mt-1">
              {formatCurrency(pagination.summary.totalAmount || 0)}
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5">Excludes credit adjustments</span>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Applied to Bills</span>
            <span className="text-lg font-bold text-teal-600 mt-1">
              {formatCurrency((pagination.summary.totalAmount || 0) - (pagination.summary.totalUnusedAmount || 0))}
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5">Cash payments allocated to invoices</span>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between bg-amber-50/10 border-amber-100">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Unused Advance Balance</span>
            <span className="text-lg font-bold text-amber-600 mt-1">
              {formatCurrency(pagination.summary.totalUnusedAmount || 0)}
            </span>
            <span className="text-[10px] text-amber-500 mt-0.5">Available to apply against bills</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {!selectedPayment ? (
        /* Full-width Table View */
        <div className="card overflow-x-auto bg-white rounded-lg shadow-sm border">
          <Table
            data={payments}
            columns={columns}
            loading={loading}
            sortBy={sortColumnParam}
            sortOrder={sortOrderParam === 'D' ? 'desc' : 'asc'}
            onSort={(key) => {
              const nextOrder = sortColumnParam === key && sortOrderParam === 'D' ? 'A' : 'D';
              navigate(`/paymentsmade?filter_by=${filterByParam}&per_page=25&sort_column=${key}&sort_order=${nextOrder}`);
              setCurrentPage(1);
            }}
          />
          <Pagination
            currentPage={pagination?.page || 1}
            totalPages={pagination?.totalPages || 1}
            total={pagination?.total || 0}
            limit={pagination?.limit || 10}
            onPageChange={setCurrentPage}
            loading={loading}
          />
        </div>
      ) : (
        /* Zoho Split-Pane View */
        <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-150px)] md:h-[calc(100vh-160px)] lg:h-[calc(100vh-170px)] overflow-hidden">
          {/* Left Column: Compact list of payments */}
          <div className={cn("w-full md:w-[350px] lg:w-[400px] flex-shrink-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden h-full", selectedPayment ? "hidden md:flex" : "flex")}>
            <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                {filterByParam === 'PaymentMode.All' ? 'All Payments' : filterByParam.replace('PaymentMode.', '') + ' Payments'}
              </span>
              <span className="text-xs text-gray-550 font-semibold">{pagination?.total || 0} records</span>
            </div>
            
            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {loading && payments.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500 animate-pulse">Loading list...</div>
              ) : payments.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500">No payments found</div>
              ) : (
                payments.map((p) => {
                  const isActive = selectedPayment.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => viewPaymentDetails(p)}
                      className={cn(
                        "p-3 cursor-pointer transition-colors relative border-l-4 hover:bg-gray-50",
                        isActive ? "bg-teal-50/40 border-teal-600" : "border-transparent"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-gray-800 text-xs truncate max-w-[180px]">
                          {p.vendor?.name || 'Unknown Vendor'}
                        </span>
                        <span className="font-bold text-gray-900 text-xs">
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-gray-500">
                        <span className="font-semibold text-teal-600">{p.paymentNumber}</span>
                        <span>{formatDate(p.date)}</span>
                      </div>
                      <div className="mt-1 flex gap-1 items-center flex-wrap">
                        <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                          {p.paymentMode}
                        </span>
                        {p.transactionType === 'vendor_advance' && (
                          <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-255 uppercase tracking-wide">
                            Advance
                          </span>
                        )}
                        {p.transactionType === 'credit_application' && (
                          <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wide">
                            Credit
                          </span>
                        )}
                        {p.unusedAmount > 0 && (
                          <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded bg-green-50 text-green-700 border border-green-200">
                            Unused: {formatCurrency(p.unusedAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Compact Pagination */}
            <div className="p-2 bg-gray-50 border-t border-gray-150 flex items-center justify-between text-[11px]">
              <button
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2 py-1 bg-white border rounded text-gray-600 disabled:opacity-50 hover:bg-gray-50 font-medium"
              >
                Prev
              </button>
              <span className="text-gray-500">
                Page {pagination?.page || 1} of {pagination?.totalPages || 1}
              </span>
              <button
                disabled={currentPage === pagination?.totalPages || loading}
                onClick={() => setCurrentPage(p => Math.min(pagination?.totalPages || 1, p + 1))}
                className="px-2 py-1 bg-white border rounded text-gray-600 disabled:opacity-50 hover:bg-gray-50 font-medium"
              >
                Next
              </button>
            </div>
          </div>

          {/* Right Column: Beautiful Payment Receipt Detail Pane */}
          <div className="flex-1 bg-[#f8f9fa] border border-gray-200 rounded-lg shadow-sm flex flex-col overflow-hidden h-full">
            {/* Details Action Header */}
            <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="md:hidden p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 mr-1"
                  title="Back to List"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payment Receipt</span>
                  <h3 className="text-xs font-extrabold text-gray-900 leading-tight">
                    {selectedPayment.paymentNumber}
                  </h3>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditPayment(selectedPayment)}
                  className="h-8 text-xs font-bold hover:bg-gray-100 text-gray-700 flex items-center gap-1 px-2.5"
                  title="Edit Payment"
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeletePayment(selectedPayment)}
                  className="h-8 text-xs font-bold text-red-600 hover:bg-red-55 flex items-center gap-1 px-2.5"
                  title="Delete Payment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadPDF(selectedPayment)}
                  className="h-8 text-xs font-bold text-teal-650 hover:bg-teal-50 flex items-center gap-1 px-2.5"
                  disabled={downloadingId === selectedPayment.id}
                  title="Download PDF"
                >
                  {downloadingId === selectedPayment.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">PDF</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSharePayment(selectedPayment)}
                  className="h-8 text-xs font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-1 px-2.5"
                  title="Send via Email"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Email</span>
                </Button>

                {selectedPayment.transactionType === 'vendor_advance' && selectedPayment.unusedAmount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setApplyCreditsPayment(selectedPayment)}
                    className="h-8 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 px-2.5"
                    title="Apply Credits"
                  >
                    <span>Apply Credits</span>
                  </Button>
                )}

                <button
                  onClick={() => setSelectedPayment(null)}
                  className="hidden md:flex p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 ml-1"
                  title="Close Pane"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable details area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50">
              {/* Paper Layout */}
              <div className="bg-white max-w-2xl mx-auto shadow-sm border border-gray-200 rounded p-6 md:p-8 space-y-6 relative overflow-hidden">
                {/* Zoho Accent Bar */}
                <div className="absolute top-0 inset-x-0 h-1 bg-teal-650" />
                
                {/* Header Section */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-xs font-extrabold text-gray-800 tracking-tight">Vegnar Private Limited</h2>
                    <p className="text-[10px] text-gray-500 mt-0.5">Inventory & Payments Department</p>
                  </div>
                  <div className="text-right">
                    <h1 className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">Receipt</h1>
                    <span className="inline-block px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[9px] font-bold mt-1.5 uppercase">
                      {selectedPayment.transactionType === 'vendor_advance' ? 'Vendor Advance' : selectedPayment.transactionType === 'credit_application' ? 'Credit Applied' : 'Bill Payment'}
                    </span>
                  </div>
                </div>

                {/* KPI Highlight Card */}
                <div className="bg-gradient-to-r from-teal-50/30 to-teal-50/10 border border-teal-100 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                  <div className="text-center sm:text-left">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Amount Paid</span>
                    <span className="text-xl font-black text-teal-605 mt-0.5 block">{formatCurrency(selectedPayment.amount)}</span>
                  </div>
                  <div className="h-px w-full sm:h-8 sm:w-px bg-teal-200/60" />
                  <div className="text-center sm:text-left">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Unused (Advance)</span>
                    <span className={cn("text-sm font-extrabold mt-0.5 block", selectedPayment.unusedAmount > 0 ? "text-amber-600" : "text-gray-500")}>
                      {formatCurrency(selectedPayment.unusedAmount)}
                    </span>
                  </div>
                  <div className="h-px w-full sm:h-8 sm:w-px bg-teal-200/60" />
                  <div className="text-center sm:text-left">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Payment Date</span>
                    <span className="text-xs font-bold text-gray-700 mt-1 block">{formatDate(selectedPayment.date)}</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-gray-150 pb-5">
                  <div className="space-y-2">
                    <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Payment Details</h4>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="border-b border-gray-50">
                          <td className="py-1 text-gray-500 font-medium">Payment Mode</td>
                          <td className="py-1 text-gray-900 font-bold text-right">{selectedPayment.paymentMode}</td>
                        </tr>
                        <tr className="border-b border-gray-50">
                          <td className="py-1 text-gray-500 font-medium">Paid Through</td>
                          <td className="py-1 text-gray-900 font-semibold text-right">{selectedPayment.paidThrough}</td>
                        </tr>
                        <tr className="border-b border-gray-50">
                          <td className="py-1 text-gray-500 font-medium">Reference #</td>
                          <td className="py-1 text-gray-900 font-semibold text-right">{selectedPayment.referenceNumber || '—'}</td>
                        </tr>
                        {(selectedPayment.bankCharges ?? 0) > 0 && (
                          <tr className="border-b border-gray-50">
                            <td className="py-1 text-gray-500 font-medium">Bank Charges</td>
                            <td className="py-1 text-gray-900 font-semibold text-right">{formatCurrency(selectedPayment.bankCharges ?? 0)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Paid To (Vendor)</h4>
                    <div className="bg-gray-50 rounded p-3 border border-gray-200 text-xs space-y-1">
                      <div className="font-extrabold text-gray-900">{selectedPayment.vendor?.name}</div>
                      <div className="text-[10px] font-bold text-teal-650">{selectedPayment.vendor?.code}</div>
                      {selectedPayment.vendor?.email && (
                        <div className="text-gray-500 pt-0.5 truncate">{selectedPayment.vendor.email}</div>
                      )}
                      {selectedPayment.vendor?.phone && (
                        <div className="text-gray-500">{selectedPayment.vendor.phone}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Allocated Bills */}
                <div className="space-y-2">
                  <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Allocated Purchase Bills</h4>
                  {selectedPayment.invoices && selectedPayment.invoices.length > 0 ? (
                    <div className="overflow-x-auto rounded border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-1.5 text-left font-bold text-gray-500 uppercase">Bill No</th>
                            <th className="px-3 py-1.5 text-left font-bold text-gray-500 uppercase">Bill Date</th>
                            <th className="px-3 py-1.5 text-right font-bold text-gray-500 uppercase">Bill Total</th>
                            <th className="px-3 py-1.5 text-right font-bold text-gray-500 uppercase">Amount Applied</th>
                            <th className="px-3 py-1.5 text-right font-bold text-gray-500 uppercase">Balance Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {selectedPayment.invoices.map((inv, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="px-3 py-1.5 font-bold text-gray-900">{inv.invoice?.invoiceNo}</td>
                              <td className="px-3 py-1.5 text-gray-500">{formatDate(inv.invoice?.date || '')}</td>
                              <td className="px-3 py-1.5 text-right text-gray-900 font-medium">{formatCurrency(inv.invoice?.totalCost || 0)}</td>
                              <td className="px-3 py-1.5 text-right text-teal-655 font-extrabold">{formatCurrency(inv.amountApplied)}</td>
                              <td className="px-3 py-1.5 text-right text-red-650 font-bold">
                                {formatCurrency(Math.max(0, (inv.invoice?.totalCost || 0) - (inv.invoice?.amountPaid || 0)))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50/80 font-bold border-t border-gray-200">
                          <tr>
                            <td colSpan={2} className="px-3 py-1.5 text-left text-gray-700">Total</td>
                            <td className="px-3 py-1.5 text-right text-gray-900">
                              {formatCurrency(selectedPayment.invoices.reduce((sum, inv) => sum + (inv.invoice?.totalCost || 0), 0))}
                            </td>
                            <td className="px-3 py-1.5 text-right text-teal-655">
                              {formatCurrency(selectedPayment.invoices.reduce((sum, inv) => sum + inv.amountApplied, 0))}
                            </td>
                            <td className="px-3 py-1.5 text-right text-red-655">
                              {formatCurrency(selectedPayment.invoices.reduce((sum, inv) => sum + Math.max(0, (inv.invoice?.totalCost || 0) - (inv.invoice?.amountPaid || 0)), 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 rounded bg-amber-50/50 border border-amber-100 text-amber-800 text-xs">
                      This payment was recorded as a vendor advance. No purchase bills/invoices were applied.
                      {selectedPayment.unusedAmount > 0 && (
                        <div className="mt-1">
                          You can allocate the remaining <strong className="font-extrabold">{formatCurrency(selectedPayment.unusedAmount)}</strong> credits against unpaid bills by clicking the "Apply Credits" button above.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {selectedPayment.notes && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Notes</span>
                    <div className="p-3 bg-gray-50 border rounded text-xs text-gray-600 italic">
                      "{selectedPayment.notes}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal (fallback/mobile backdrop) */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={`Payment Receipt - ${selectedPayment?.paymentNumber}`}
        size="lg"
      >
        {selectedPayment && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-150">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Payment Date</label>
                <div className="text-sm font-semibold text-gray-900">{formatDate(selectedPayment.date)}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Amount Paid</label>
                <div className="text-lg font-bold text-teal-650">{formatCurrency(selectedPayment.amount)}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Vendor</label>
                <div className="text-sm font-semibold text-gray-900">
                  {selectedPayment.vendor?.name} ({selectedPayment.vendor?.code})
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Payment Mode</label>
                <div className="text-sm font-semibold text-gray-900">{selectedPayment.paymentMode}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Payment Nature</label>
                <div className="text-sm font-semibold text-gray-900">
                  {selectedPayment.transactionType === 'vendor_advance' ? (
                    <span className="inline-flex px-2.5 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-800 border border-amber-255 uppercase tracking-wider">
                      Vendor Advance
                    </span>
                  ) : selectedPayment.transactionType === 'credit_application' ? (
                    <span className="inline-flex px-2.5 py-0.5 text-xs font-bold rounded bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">
                      Credit Applied
                    </span>
                  ) : (
                    <span className="inline-flex px-2.5 py-0.5 text-xs font-bold rounded bg-teal-100 text-teal-850 border border-teal-200 uppercase tracking-wider">
                      Bill Payment
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Paid Through</label>
                <div className="text-sm font-semibold text-gray-900">{selectedPayment.paidThrough}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Reference Number</label>
                <div className="text-sm font-semibold text-gray-900">{selectedPayment.referenceNumber || '—'}</div>
              </div>
              {(selectedPayment.bankCharges ?? 0) > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Bank Charges</label>
                  <div className="text-sm font-semibold text-gray-900">{formatCurrency(selectedPayment.bankCharges ?? 0)}</div>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Unused (Advance Balance)</label>
                <div className="text-sm font-bold text-amber-600">{formatCurrency(selectedPayment.unusedAmount)}</div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Allocated Bills</h4>
              {selectedPayment.invoices && selectedPayment.invoices.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Bill No</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Bill Date</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Bill Total</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Amount Applied</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Balance Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {selectedPayment.invoices.map((inv, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2.5 text-xs sm:text-sm text-gray-900 font-semibold">{inv.invoice?.invoiceNo}</td>
                          <td className="px-4 py-2.5 text-xs sm:text-sm text-gray-600">{formatDate(inv.invoice?.date || '')}</td>
                          <td className="px-4 py-2.5 text-xs sm:text-sm text-right text-gray-900">{formatCurrency(inv.invoice?.totalCost || 0)}</td>
                          <td className="px-4 py-2.5 text-xs sm:text-sm text-right text-teal-650 font-bold">{formatCurrency(inv.amountApplied)}</td>
                          <td className="px-4 py-2.5 text-xs sm:text-sm text-right text-red-650 font-bold">
                            {formatCurrency(Math.max(0, (inv.invoice?.totalCost || 0) - (inv.invoice?.amountPaid || 0)))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50/80 font-bold border-t border-gray-200 text-xs sm:text-sm">
                      <tr>
                        <td colSpan={2} className="px-4 py-2.5 text-left text-gray-700">Total</td>
                        <td className="px-4 py-2.5 text-right text-gray-900">
                          {formatCurrency(selectedPayment.invoices.reduce((sum, inv) => sum + (inv.invoice?.totalCost || 0), 0))}
                        </td>
                        <td className="px-4 py-2.5 text-right text-teal-655 font-extrabold">
                          {formatCurrency(selectedPayment.invoices.reduce((sum, inv) => sum + inv.amountApplied, 0))}
                        </td>
                        <td className="px-4 py-2.5 text-right text-red-655 font-extrabold">
                          {formatCurrency(selectedPayment.invoices.reduce((sum, inv) => sum + Math.max(0, (inv.invoice?.totalCost || 0) - (inv.invoice?.amountPaid || 0)), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs sm:text-sm">
                  This payment was recorded as a vendor advance. No purchase bills/invoices were applied.
                </div>
              )}
            </div>

            {selectedPayment.notes && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
                <div className="p-3 bg-gray-50 border rounded-md text-xs sm:text-sm text-gray-750 italic">
                  "{selectedPayment.notes}"
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                onClick={() => handleDownloadPDF(selectedPayment)}
                className="odoo-btn-primary bg-teal-605 hover:bg-teal-700 px-4 h-8 text-xs font-semibold"
                disabled={downloadingId === selectedPayment.id}
              >
                {downloadingId === selectedPayment.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1" />
                )}
                Download Receipt PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewModalOpen(false)}
                className="odoo-btn-secondary px-4 h-8 text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {sharePayment && (
        <ShareDocumentModal
          isOpen={!!sharePayment}
          onClose={() => setSharePayment(null)}
          docType="paymentMade"
          docId={sharePayment.id}
          docLabel={sharePayment.paymentNumber}
          defaultEmail={sharePayment.vendor?.email || ''}
        />
      )}

      {/* Apply Credits Modal */}
      {applyCreditsPayment && (
        <ApplyCreditsModal
          payment={applyCreditsPayment}
          isOpen={!!applyCreditsPayment}
          onClose={() => setApplyCreditsPayment(null)}
          onSuccess={() => {
            dispatch(fetchPaymentsMade({ page: currentPage, limit: 10, search, sortBy: sortColumnParam, sortOrder: sortOrderParam === 'D' ? 'desc' : 'asc' }));
            // Also update selected payment if it matches the credit payment
            if (selectedPayment && selectedPayment.id === applyCreditsPayment.id) {
              dispatch(fetchPaymentMadeById(selectedPayment.id)).unwrap().then((updated) => setSelectedPayment(updated));
            }
          }}
        />
      )}
    </div>
  );
};

export default PaymentsMade;
