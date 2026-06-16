import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Eye,
  Upload,
  Download,
  Edit,
  Printer,
  
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchInwardInvoices,
  fetchInwardInvoiceById,
  deleteInwardInvoice,
  clearError,
} from '@/slices/inwardSlice';
import { fetchLocations } from '@/slices/locationSlice';
import { bulkUploadService } from '@/services/bulkUploadService';
import { InwardInvoice } from '@/types';
import {
  formatDate,
  formatCurrency,
  debounce,
  cn,
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
  const { locations } = useAppSelector((state) => state.locations);

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InwardInvoice | null>(
    null
  );
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('desc');
  const [directScannerOpen, setDirectScannerOpen] = useState(false);
  const [showScanLocationModal, setShowScanLocationModal] = useState(false);
  const [selectedScanLocation, setSelectedScanLocation] = useState('');

  useEffect(() => {
    dispatch(fetchLocations({ limit: 100 }));
  }, [dispatch]);

  const handleDirectInwardScan = async (barcode: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/v1/barcodes/scan', {
        barcode,
        flow: 'inward',
        locationId: selectedScanLocation ? parseInt(selectedScanLocation) : 1
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.success) {
        toast.success(response.data.message || "Box inwarded successfully!");
        dispatch(fetchInwardInvoices({ page: currentPage, limit: 10, search }));
      } else {
        toast.error(response.data?.message || "Failed to scan box.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Scan failed.");
    }
  };

  useEffect(() => {
    dispatch(fetchInwardInvoices({ page: currentPage, limit: 10, search }));
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
      dispatch(fetchInwardInvoiceById(id));
    }
  }, [id, dispatch]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const handleAddStock = () => {
    navigate('/inward/add');
  };

  const handleEditInvoice = (invoice: InwardInvoice) => {
    navigate(`/inward/edit/${invoice.id}`);
  };

  const handleFormSuccess = () => {
    navigate('/inward');
    dispatch(fetchInwardInvoices({ page: currentPage, limit: 10, search }));
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
        dispatch(fetchInwardInvoices({ page: currentPage, limit: 10, search }));
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
      key: 'totalCost',
      title: 'Total Cost',
      render: (value: number) => <span className="font-semibold">{formatCurrency(value)}</span>,
    },
    {
      key: 'amountPaid',
      title: 'Amount Paid',
      render: (_: any, record: InwardInvoice) => formatCurrency(record.amountPaid || 0),
    },
    {
      key: 'balanceDue',
      title: 'Balance Due',
      render: (_: any, record: InwardInvoice) => {
        const balance = record.totalCost - (record.amountPaid || 0);
        return <span className={cn('font-semibold', balance > 0 ? 'text-red-600' : 'text-gray-900')}>{formatCurrency(balance)}</span>;
      },
    },
    {
      key: 'paymentStatus',
      title: 'Payment Status',
      render: (_: any, record: InwardInvoice) => {
        const balance = record.totalCost - (record.amountPaid || 0);
        const paid = record.amountPaid || 0;
        let status = 'Unpaid';
        let bgClass = 'bg-red-100 text-red-800 border-red-200';
        if (balance <= 0.01) {
          status = 'Paid';
          bgClass = 'bg-green-100 text-green-800 border-green-200';
        } else if (paid > 0) {
          status = 'Partially Paid';
          bgClass = 'bg-amber-100 text-amber-800 border-amber-200';
        }
        return <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', bgClass)}>{status}</span>;
      },
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
                  Amount Paid
                </label>
                <div className="text-emerald-600 font-semibold">
                  {formatCurrency(selectedInvoice.amountPaid || 0)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Balance Due
                </label>
                <div className={cn('font-bold', (selectedInvoice.totalCost - (selectedInvoice.amountPaid || 0)) > 0 ? 'text-red-600' : 'text-gray-900')}>
                  {formatCurrency(selectedInvoice.totalCost - (selectedInvoice.amountPaid || 0))}
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

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                onClick={() => {
                  setViewModalOpen(false);
                  navigate(`/print-barcodes/inward/${selectedInvoice.id}`);
                }}
                className="odoo-btn-primary px-4 h-8 text-xs font-semibold"
              >
                <Printer className="h-3.5 w-3.5 mr-1" /> Print Barcodes
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

      {/* Scan Location Selector Modal */}
      <Modal
        isOpen={showScanLocationModal}
        onClose={() => setShowScanLocationModal(false)}
        title="Select Inward Location"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Select Destination Location <span className="text-red-500">*</span>
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
              onClick={() => setShowScanLocationModal(false)}
              className="odoo-btn-secondary px-4 h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selectedScanLocation}
              onClick={() => {
                setShowScanLocationModal(false);
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
        onScanSuccess={handleDirectInwardScan}
      />
    </div>
  );
};

export default Inward;