import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchOrderDispatches, deleteOrderDispatch } from '@/slices/orderDispatchSlice';
import { fetchSalesOrders } from '@/slices/salesOrderSlice';
import { OrderDispatch } from '@/types';
import { orderDispatchService } from '@/services/orderDispatchService';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import { OrderDispatchForm } from '@/components/OrderDispatchForm';
import { OrderDispatchDetails } from '@/components/OrderDispatchDetails';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  dispatched: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Dispatched' },
  in_transit: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'In Transit' },
  delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};

const OrderDispatchPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { dispatches, pagination, loading } = useAppSelector((state) => state.orderDispatch);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewDispatch, setViewDispatch] = useState<OrderDispatch | null>(null);
  const [editDispatch, setEditDispatch] = useState<OrderDispatch | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchOrderDispatches({ page: currentPage, limit: 10, search, status: statusFilter || undefined }));
  }, [dispatch, search, statusFilter, currentPage]);

  useEffect(() => {
    dispatch(fetchSalesOrders({ page: 1, limit: 1000 }));
  }, [dispatch]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const handleDelete = async (dispatch_item: OrderDispatch) => {
    if (!window.confirm(`Delete dispatch "${dispatch_item.dispatchNo}"?`)) return;
    try {
      await dispatch(deleteOrderDispatch(dispatch_item.id)).unwrap();
      toast.success('Dispatch deleted successfully');
      dispatch(fetchOrderDispatches({ page: currentPage, limit: 10, search, status: statusFilter || undefined }));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete');
    }
  };

  const handleDownloadPDF = async (dispatch_item: OrderDispatch) => {
    setDownloadingId(dispatch_item.id);
    try {
      const blob = await orderDispatchService.downloadPDF(dispatch_item.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Dispatch-${dispatch_item.dispatchNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF downloaded');
    } catch (error) {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFormSuccess = () => {
    setCreateModalOpen(false);
    setEditDispatch(null);
    dispatch(fetchOrderDispatches({ page: currentPage, limit: 10, search, status: statusFilter || undefined }));
  };

  const columns = [
    { key: 'dispatchNo', title: 'Dispatch No', sortable: true },
    {
      key: 'salesOrder.orderNo',
      title: 'Order No',
      render: (_: any, r: OrderDispatch) => r.salesOrder?.orderNo || '-',
    },
    {
      key: 'salesOrder.customer.name',
      title: 'Customer',
      render: (_: any, r: OrderDispatch) => r.salesOrder?.customer?.name || '-',
    },
    {
      key: 'dispatchDate',
      title: 'Dispatch Date',
      render: (v: string) => formatDate(v),
    },
    {
      key: 'shippingMethod',
      title: 'Shipping Method',
      render: (v: string) => (
        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
          {v}
        </span>
      ),
    },
    // {
    //   key: 'trackingNumber',
    //   title: 'Tracking No',
    //   render: (v: string) => v || '-',
    // },
    {
      key: 'status',
      title: 'Status',
      render: (v: string) => <StatusBadge status={v} />,
    },
    {
      key: 'shippingCost',
      title: 'Shipping Cost',
      render: (v: number) => `₹${v?.toFixed(2) || '0.00'}`,
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, r: OrderDispatch) => (
        <div className="flex gap-1 items-center">
          <Button variant="ghost" size="sm" onClick={() => setViewDispatch(r)} title="View">
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownloadPDF(r)}
            title="Download PDF"
            disabled={downloadingId === r.id}
          >
            {downloadingId === r.id ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditDispatch(r)} title="Edit">
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(r)}
            className="text-red-600 hover:text-red-700"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Order Dispatch Management"
        searchPlaceholder="Search by dispatch no, tracking number, order no..."
        onSearch={(v) => debouncedSearch(v)}
        actions={[
          {
            label: 'Add Dispatch',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => setCreateModalOpen(true),
            variant: 'primary' as const,
          },
        ]}
      />

      <div className="flex gap-4 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="dispatched">Dispatched</option>
          <option value="in_transit">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <Table data={dispatches} columns={columns} loading={loading} />
        <Pagination
          currentPage={pagination?.page || 1}
          totalPages={pagination?.totalPages || 1}
          total={pagination?.total || 0}
          limit={pagination?.limit || 10}
          onPageChange={setCurrentPage}
          loading={loading}
        />
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Dispatch"
        size="xl"
      >
        <div className="space-y-4">
          <OrderDispatchForm
            onSuccess={handleFormSuccess}
            onCancel={() => setCreateModalOpen(false)}
          />
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editDispatch}
        onClose={() => setEditDispatch(null)}
        title={`Edit ${editDispatch?.dispatchNo}`}
        size="xl"
      >
        {editDispatch && (
          <div className="space-y-4">
            <OrderDispatchForm
              dispatchId={editDispatch.id}
              onSuccess={handleFormSuccess}
              onCancel={() => setEditDispatch(null)}
            />
          </div>
        )}
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={!!viewDispatch}
        onClose={() => setViewDispatch(null)}
        title={`Dispatch - ${viewDispatch?.dispatchNo}`}
        size="lg"
      >
        {viewDispatch && (
          <OrderDispatchDetails
            dispatch={viewDispatch}
            onClose={() => setViewDispatch(null)}
            onEdit={() => {
              setViewDispatch(null);
              setEditDispatch(viewDispatch);
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default OrderDispatchPage;
