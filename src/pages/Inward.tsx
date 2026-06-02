import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Eye,
  Upload,
  Download,
  Edit,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchInwardInvoices,
  fetchInwardInvoiceById,
  deleteInwardInvoice,
  clearError,
} from '@/slices/inwardSlice';
import { bulkUploadService } from '@/services/bulkUploadService';
import { InwardInvoice } from '@/types';
import {
  formatDate,
  formatCurrency,
  debounce,
} from '@/utils';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import BulkUpload from '@/components/BulkUpload';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import AddEditInward from '@/components/AddEditInward';

const Inward: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { invoices, currentInvoice, pagination, loading, error } =
    useAppSelector((state) => state.inward);

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InwardInvoice | null>(
    null
  );
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    dispatch(fetchInwardInvoices({ page: currentPage, limit: 10, search, startDate, endDate }));
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
      dispatch(fetchInwardInvoiceById(id));
    }
  }, [id, dispatch]);

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

  const handleAddStock = () => {
    navigate('/inward/add');
  };

  const handleEditInvoice = (invoice: InwardInvoice) => {
    navigate(`/inward/edit/${invoice.id}`);
  };

  const handleFormSuccess = () => {
    navigate('/inward');
    dispatch(fetchInwardInvoices({ page: currentPage, limit: 10, search, startDate, endDate }));
  };

  const handleFormCancel = () => {
    navigate('/inward');
  };

  const viewInvoice = async (invoice: InwardInvoice) => {
    try {
      const result = await dispatch(fetchInwardInvoiceById(invoice.id.toString())).unwrap();
      setSelectedInvoice(result);
      setViewModalOpen(true);
    } catch (error) {
      console.error('Failed to load invoice details:', error);
    }
  };

  const deleteInvoice = async (invoice: InwardInvoice) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await dispatch(deleteInwardInvoice(invoice.id.toString())).unwrap();
        toast.success('Inward invoice deleted successfully');
        dispatch(fetchInwardInvoices({ page: currentPage, limit: 10, search, startDate, endDate }));
      } catch (error) {
        // Error handled by Redux
      }
    }
  };

  const handleExport = async () => {
    try {
      const blob = await bulkUploadService.exportData('inward');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inward_invoices_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Inward invoices exported successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to export inward invoices');
      console.error('Export error:', error);
    }
  };

  const columns = [
    {
      key: 'invoiceNo',
      title: 'Invoice No',
      sortable: true,
    },
    {
      key: 'date',
      title: 'Date',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'vendor.name',
      title: 'Vendor',
      render: (_: any, record: InwardInvoice) => (
        <div>
          <div className="font-medium">{record.vendor?.name}</div>
          <div className="text-sm text-gray-500">{record.vendor?.code}</div>
        </div>
      ),
    },
    {
      key: 'location.name',
      title: 'Location',
      render: (_: any, record: InwardInvoice) => record.location?.name,
    },
    {
      key: 'expense',
      title: 'Expense',
      render: (value: number) => formatCurrency(value || 0),
    },
    {
      key: 'totalCost',
      title: 'Total Cost',
      render: (value: number) => formatCurrency(value),
    },
    {
      key: 'items',
      title: 'Items',
      render: (items: any[]) => items?.filter((item: any) => !item.parentItemId).length || 0,
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: InwardInvoice) => (
        <div className="flex gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => viewInvoice(record)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEditInvoice(record)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteInvoice(record)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // ── Show form if in add/edit mode (like Products.tsx / Outward.tsx) ──
  if (id || window.location.pathname.includes('/add')) {
    return (
      <AddEditInward
        invoice={id && currentInvoice ? currentInvoice : undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inwards"
        searchPlaceholder="Search invoices..."
        onSearch={(value) => debouncedSearch(value)}
        actions={[
          {
            label: 'Bulk Upload',
            icon: <Upload className="h-4 w-4" />,
            onClick: () => setBulkUploadOpen(true),
          },
          {
            label: 'Export',
            icon: <Download className="h-4 w-4" />,
            onClick: handleExport,
          },
          {
            label: 'Add Stock',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleAddStock,
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

      {/* Table */}
      <div className="card overflow-x-auto">
        <Table
          data={[...invoices].sort((a, b) => {
            const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
            return dateSortOrder === 'asc' ? diff : -diff;
          })}
          columns={columns}
          loading={loading}
          sortBy="date"
          sortOrder={dateSortOrder}
          onSort={() => setDateSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
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
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <div className="text-gray-900">
                  {formatDate(selectedInvoice.date)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Cost
                </label>
                <div className="text-gray-900 font-semibold">
                  {formatCurrency(selectedInvoice.totalCost)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Vendor
                </label>
                <div className="text-gray-900">
                  {selectedInvoice.vendor?.name} ({selectedInvoice.vendor?.code}
                  )
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <div className="text-gray-900">
                  {selectedInvoice.location?.name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expense
                </label>
                <div className="text-gray-900">
                  {formatCurrency(selectedInvoice.expense || 0)}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Product
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        SKU
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Boxes
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Pack/Box
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Piece/Pack
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Total Packs
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Total PCS
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Rate
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        GST
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>   
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedInvoice.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.product?.name}{' '}
                          {item.product?.grade && `(${item.product.grade})`}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.product?.sku || '—'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.boxes}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.packPerBox || item.pcsPerBox || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.packPerPiece || 1}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.totalPacks ||
                            item.boxes *
                              (item.packPerBox || item.pcsPerBox || 1)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.totalPcs}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatCurrency(item.ratePerBox)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatCurrency(item.gstAmount)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 font-semibold">
                          {formatCurrency(item.totalCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Upload Modal */}
      <BulkUpload
        type="inward"
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={() =>
          dispatch(
            fetchInwardInvoices({ page: currentPage, limit: 10, search })
          )
        }
      />
    </div>
  );
};

export default Inward;
