import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Eye, Download, Edit, Loader2, Printer, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchPurchaseOrders,
  fetchPurchaseOrderById,
  deletePurchaseOrder,
  downloadPurchaseOrderPDF,
} from '@/slices/purchaseOrderSlice';
import { PurchaseOrder } from '@/types';
import { formatCurrency, formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import ConfirmModal from '@/components/ConfirmModal';
import AddEditPurchaseOrder from '@/components/AddEditPurchaseOrder';
import ShareDocumentModal from '@/components/ShareDocumentModal';

const PurchaseOrders: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { orders, currentPurchaseOrder, pagination, loading } = useAppSelector((state) => state.purchaseOrders);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [shareOrder, setShareOrder] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    dispatch(fetchPurchaseOrders({ page: currentPage, limit: 10, search }));
  }, [dispatch, search, currentPage]);

  useEffect(() => {
    if (id) dispatch(fetchPurchaseOrderById(id));
  }, [id, dispatch]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const handleFormSuccess = () => {
    navigate('/purchase-orders');
    dispatch(fetchPurchaseOrders({ page: currentPage, limit: 10, search }));
  };

  const handleFormCancel = () => navigate('/purchase-orders');

  const viewOrder = async (order: PurchaseOrder) => {
    try {
      const result = await dispatch(fetchPurchaseOrderById(order.id.toString())).unwrap();
      setSelectedOrder(result);
      setViewModalOpen(true);
    } catch {
      toast.error('Failed to load order details');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await dispatch(deletePurchaseOrder(deleteId)).unwrap();
      toast.success('Purchase Order deleted');
      setIsDeleteModalOpen(false);
      setDeleteId(null);
      dispatch(fetchPurchaseOrders({ page: currentPage, limit: 10, search }));
    } catch (error) {
      // Error handled by Redux
    }
  };

  const handleDownloadPDF = async (order: PurchaseOrder) => {
    setDownloadingId(order.id.toString());
    try {
      await dispatch(downloadPurchaseOrderPDF(order.id)).unwrap();
      toast.success('PDF downloaded successfully');
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-green-100 text-green-700',
    received: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const columns = [
    { key: 'poNo', title: 'PO No', sortable: true },
    {
      key: 'vendor.name',
      title: 'Vendor',
      render: (_: any, record: PurchaseOrder) => (
        <div>
          <div className="font-medium">{record.vendor?.name}</div>
          <div className="text-xs text-gray-500">{(record.vendor as any)?.code}</div>
        </div>
      ),
    },
    {
      key: 'poDate',
      title: 'PO Date',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'expectedDeliveryDate',
      title: 'Delivery Date',
      render: (value: string) => value ? formatDate(value) : '—',
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${statusColors[value] || 'bg-gray-100 text-gray-700'}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      title: 'Amount',
      render: (value: number) => formatCurrency(value),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: PurchaseOrder) => (
        <div className="flex gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => viewOrder(record)} title="View">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/purchase-orders/edit/${record.id}`)} title="Edit">
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownloadPDF(record)}
            title="Download PDF"
            disabled={downloadingId === record.id.toString()}
          >
            {downloadingId === record.id.toString()
              ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              : <Download className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShareOrder(record)} title="Send via Email">
            <Mail className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDeleteId(record.id.toString()); setIsDeleteModalOpen(true); }}
            className="text-red-600 hover:text-red-700"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (id || window.location.pathname.includes('/add')) {
    return (
      <AddEditPurchaseOrder
        purchaseOrder={id && currentPurchaseOrder ? currentPurchaseOrder : undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchase Orders"
        searchPlaceholder="Search PO..."
        onSearch={(value) => debouncedSearch(value)}
        actions={[
          {
            label: 'New PO',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => navigate('/purchase-orders/add'),
            variant: 'primary' as const,
          },
        ]}
      />

      <div className="card overflow-x-auto">
        <Table
          data={orders}
          columns={columns}
          loading={loading}
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

      {/* View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={`Purchase Order — ${selectedOrder?.poNo}`}
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4 border-b">
              <div>
                <p className="text-xs text-gray-500 font-medium">PO Number</p>
                <p className="font-semibold text-sm">{selectedOrder.poNo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Vendor</p>
                <p className="font-semibold text-sm">{selectedOrder.vendor?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">PO Date</p>
                <p className="font-semibold text-sm">{formatDate(selectedOrder.poDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Expected Delivery</p>
                <p className="font-semibold text-sm">{selectedOrder.expectedDeliveryDate ? formatDate(selectedOrder.expectedDeliveryDate) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Status</p>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${statusColors[selectedOrder.status] || 'bg-gray-100 text-gray-700'}`}>
                  {selectedOrder.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Reference</p>
                <p className="font-semibold text-sm">{selectedOrder.reference || '—'}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Boxes</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Pack/Box</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Pcs/Pack</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Total Pcs</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">GST%</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {item.product?.name || '—'}
                          {(item as any).description && <div className="text-xs text-gray-400 font-normal">{(item as any).description}</div>}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{(item.product as any)?.sku || '—'}</td>
                        <td className="px-3 py-2 text-center">{(item as any).boxes ?? '—'}</td>
                        <td className="px-3 py-2 text-center">{(item as any).packPerBox ?? '—'}</td>
                        <td className="px-3 py-2 text-center">{(item as any).packPerPiece ?? '—'}</td>
                        <td className="px-3 py-2 text-center">{(item as any).totalPcs ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.rate)}</td>
                        <td className="px-3 py-2 text-center">{item.taxRate}%</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded text-sm flex justify-end">
              <div className="space-y-1 min-w-[200px]">
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total Amount:</span>
                  <span className="text-primary-700">{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
              </div>
            </div>

            {selectedOrder.notes && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Terms & Conditions</p>
                <p className="text-xs text-gray-700 whitespace-pre-wrap">{selectedOrder.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                onClick={() => { setViewModalOpen(false); navigate(`/print-barcodes/po/${selectedOrder.id}`); }}
                className="odoo-btn-primary px-4 h-8 text-xs font-semibold"
              >
                <Printer className="h-3.5 w-3.5 mr-1" /> Print Barcode Labels
              </Button>
              <Button
                type="button"
                onClick={() => handleDownloadPDF(selectedOrder)}
                className="odoo-btn-primary px-4 h-8 text-xs font-semibold"
                disabled={downloadingId === selectedOrder.id.toString()}
              >
                {downloadingId === selectedOrder.id.toString()
                  ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  : <Download className="h-3.5 w-3.5 mr-1" />}
                Download PDF
              </Button>
              <Button type="button" variant="outline" onClick={() => setViewModalOpen(false)} className="odoo-btn-secondary px-4 h-8 text-xs">
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {shareOrder && (
        <ShareDocumentModal
          isOpen={!!shareOrder}
          onClose={() => setShareOrder(null)}
          docType="purchaseOrder"
          docId={shareOrder.id}
          docLabel={shareOrder.poNo}
          defaultEmail={(shareOrder.vendor as any)?.email || ''}
        />
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Purchase Order"
        message="Are you sure you want to delete this purchase order?"
      />
    </div>
  );
};

export default PurchaseOrders;
