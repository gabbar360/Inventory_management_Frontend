import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, Eye, Download, Edit, Trash2, Loader2 } from 'lucide-react';
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
import PageHeader from '@/components/PageHeader';
import AddEditPaymentsMade from '@/components/AddEditPaymentsMade';
import ApplyCreditsModal from '@/components/ApplyCreditsModal';

const PaymentsMade: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { payments, currentPayment, pagination, loading, error } = useAppSelector((state) => state.paymentsMade);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMade | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const [applyCreditsPayment, setApplyCreditsPayment] = useState<PaymentMade | null>(null);

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
        paymentMode: paymentModeFilter === 'All' ? undefined : paymentModeFilter,
      })
    );
  }, [dispatch, search, currentPage, filterByParam, sortColumnParam, sortOrderParam]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader
          title="Payments Made"
          searchPlaceholder="Search payments..."
          onSearch={(value) => debouncedSearch(value)}
          actions={[
            {
              label: 'Record Payment',
              icon: <Plus className="h-4 w-4" />,
              onClick: handleAddPayment,
              variant: 'primary' as const,
            },
          ]}
        />
      </div>

      {/* Summary KPI Cards */}
      {pagination?.summary && (
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

      {/* Zoho-style Sub Header Filters */}
      <div className="flex flex-wrap items-center justify-between border-b pb-2 gap-2">
        <div className="flex space-x-1">
          {['PaymentMode.All', 'PaymentMode.Cash', 'PaymentMode.Bank Transfer', 'PaymentMode.Check', 'PaymentMode.Credit Card'].map((mode) => {
            const label = mode.split('.')[1];
            const isActive = filterByParam === mode;
            return (
              <button
                key={mode}
                onClick={() => handleFilterChange(mode)}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-md border transition-colors',
                  isActive
                    ? 'bg-teal-600 border-teal-700 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Sort by Date: <button
            onClick={() => {
              const nextOrder = sortOrderParam === 'D' ? 'A' : 'D';
              navigate(`/paymentsmade?filter_by=${filterByParam}&per_page=25&sort_column=date&sort_order=${nextOrder}`);
            }}
            className="text-teal-650 hover:underline font-bold"
          >
            {sortOrderParam === 'D' ? 'Newest First' : 'Oldest First'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto bg-white rounded-lg shadow-sm border">
        <Table data={payments} columns={columns} loading={loading} />
        <Pagination
          currentPage={pagination?.page || 1}
          totalPages={pagination?.totalPages || 1}
          total={pagination?.total || 0}
          limit={pagination?.limit || 10}
          onPageChange={setCurrentPage}
          loading={loading}
        />
      </div>

      {/* Detail Modal */}
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
                <div className="text-lg font-bold text-teal-600">{formatCurrency(selectedPayment.amount)}</div>
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
                    <span className="inline-flex px-2.5 py-0.5 text-xs font-bold rounded bg-teal-100 text-teal-800 border border-teal-200 uppercase tracking-wider">
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {selectedPayment.invoices.map((inv, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2.5 text-xs sm:text-sm text-gray-900 font-semibold">{inv.invoice?.invoiceNo}</td>
                          <td className="px-4 py-2.5 text-xs sm:text-sm text-gray-600">{formatDate(inv.invoice?.date || '')}</td>
                          <td className="px-4 py-2.5 text-xs sm:text-sm text-right text-gray-900">{formatCurrency(inv.invoice?.totalCost || 0)}</td>
                          <td className="px-4 py-2.5 text-xs sm:text-sm text-right text-teal-650 font-bold">{formatCurrency(inv.amountApplied)}</td>
                        </tr>
                      ))}
                    </tbody>
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
                className="odoo-btn-primary bg-teal-600 hover:bg-teal-700 px-4 h-8 text-xs font-semibold"
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
      {/* Apply Credits Modal */}
      {applyCreditsPayment && (
        <ApplyCreditsModal
          payment={applyCreditsPayment}
          isOpen={!!applyCreditsPayment}
          onClose={() => setApplyCreditsPayment(null)}
          onSuccess={() => {
            dispatch(fetchPaymentsMade({ page: currentPage, limit: 10, search, sortBy: sortColumnParam, sortOrder: sortOrderParam === 'D' ? 'desc' : 'asc' }));
          }}
        />
      )}
    </div>
  );
};

export default PaymentsMade;
