import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, Plus, Edit2, Trash2, Eye, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPurchaseOrders, fetchPurchaseOrderById, deletePurchaseOrder, downloadPurchaseOrderPDF } from '@/slices/purchaseOrderSlice';
import { PurchaseOrder } from '@/types';
import { debounce } from '@/utils';
import Button from '@/components/Button';
import Table from '@/components/Table';
import PageHeader from '@/components/PageHeader';
import ConfirmModal from '@/components/ConfirmModal';
import Modal from '@/components/Modal';
import AddEditPurchaseOrder from '@/components/AddEditPurchaseOrder';
import Pagination from '@/components/Pagination';

const PurchaseOrders: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { orders, currentPurchaseOrder, pagination, loading } = useAppSelector((state) => state.purchaseOrders);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchPurchaseOrders({ page, limit: 10, search }));
  }, [dispatch, page, search]);

  // Fetch PO data when in edit mode
  useEffect(() => {
    if (id) {
      dispatch(fetchPurchaseOrderById(id));
    }
  }, [id, dispatch]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setPage(1);
  });

  const handleAddPO = () => {
    navigate('/purchase-orders/add');
  };

  const handleEditPO = (order: PurchaseOrder) => {
    navigate(`/purchase-orders/edit/${order.id}`);
  };

  const handleFormSuccess = () => {
    navigate('/purchase-orders');
    dispatch(fetchPurchaseOrders({ page, limit: 10, search }));
  };

  const handleFormCancel = () => {
    navigate('/purchase-orders');
  };

  useEffect(() => {
    if (!id) {
      // Clear current PO when not in edit mode
    }
  }, [id]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await dispatch(deletePurchaseOrder(deleteId)).unwrap();
      toast.success('Purchase Order deleted');
      setIsDeleteModalOpen(false);
      setDeleteId(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete');
    }
  };

  const handleDownloadPDF = async (id: string) => {
    try {
      await dispatch(downloadPurchaseOrderPDF(id)).unwrap();
      toast.success('PDF downloaded');
    } catch (error: any) {
      toast.error('Failed to download PDF');
    }
  };

  const handleViewDetails = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const columns = [
    { key: 'poNo', title: 'PO No' },
    { key: 'vendor.name', title: 'Vendor' },
    { key: 'poDate', title: 'Date', render: (val: string) => new Date(val).toLocaleDateString() },
    { key: 'status', title: 'Status', render: (val: string) => <span className={`px-2 py-1 rounded text-xs font-semibold ${val === 'confirmed' ? 'bg-green-100 text-green-800' : val === 'draft' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>{val}</span> },
    { key: 'totalAmount', title: 'Amount', render: (val: number) => `₹${val.toFixed(2)}` },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, row: PurchaseOrder) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleViewDetails(row)} title="View Details">
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleEditPO(row)} title="Edit">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDownloadPDF(row.id)} title="Download PDF">
            <Download className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setDeleteId(row.id); setIsDeleteModalOpen(true); }} title="Delete">
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  // Show form if in add/edit mode
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
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Purchase Orders"
        searchPlaceholder="Search PO..."
        onSearch={(value) => debouncedSearch(value)}
        actions={[
          {
            label: 'New PO',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleAddPO,
            variant: 'primary' as const,
          },
        ]}
      />

      <div className="card overflow-hidden">
        <Table columns={columns} data={orders} loading={loading} />
        {pagination && pagination.totalPages > 1 && (
          <div className="card-footer border-t border-gray-200">
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={setPage}
              loading={loading}
            />
          </div>
        )}
      </div>

      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDelete} title="Delete Purchase Order" message="Are you sure you want to delete this purchase order?" />

      <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title="Purchase Order Details" size="xl">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b">
              <div>
                <p className="text-gray-600 text-sm">PO Number</p>
                <p className="font-semibold">{selectedOrder.poNo}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Vendor</p>
                <p className="font-semibold">{selectedOrder.vendor?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">PO Date</p>
                <p className="font-semibold">{new Date(selectedOrder.poDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Expected Delivery</p>
                <p className="font-semibold">{selectedOrder.expectedDeliveryDate ? new Date(selectedOrder.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Status</p>
                <p className={`font-semibold px-2 py-1 rounded text-xs w-fit ${selectedOrder.status === 'confirmed' ? 'bg-green-100 text-green-800' : selectedOrder.status === 'draft' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>{selectedOrder.status}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Reference</p>
                <p className="font-semibold">{selectedOrder.reference || 'N/A'}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Tax %</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, idx) => {
                      const itemTotal = (item.amount || item.quantity * item.rate) * (1 + (item.taxRate || 0) / 100);
                      return (
                        <tr key={idx} className="border-b">
                          <td className="px-3 py-2 font-medium">{item.product?.name || 'N/A'}</td>
                          <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                          <td className="px-3 py-2 text-right">₹{item.rate.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{item.taxRate}%</td>
                          <td className="px-3 py-2 text-right font-semibold">₹{itemTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{selectedOrder.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Total Amount:</span>
                <span className="text-blue-600">₹{selectedOrder.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {selectedOrder.notes && (
              <div>
                <p className="text-gray-600 text-sm">Notes</p>
                <p className="text-sm">{selectedOrder.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  navigate(`/print-barcodes/po/${selectedOrder.id}`);
                }}
                className="odoo-btn-primary px-4 h-8 text-xs font-semibold"
              >
                <Printer className="h-3.5 w-3.5 mr-1" /> Print Barcode Labels
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDetailsModalOpen(false)}
                className="odoo-btn-secondary px-4 h-8 text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PurchaseOrders;