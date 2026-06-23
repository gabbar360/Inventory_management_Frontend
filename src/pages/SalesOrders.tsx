import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Download, Loader2, MoreVertical, FileText, Package, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { salesOrderService } from '@/services/salesOrderService';
import { fetchSalesOrders, deleteSalesOrder, convertSalesOrderToInvoice } from '@/slices/salesOrderSlice';
import { fetchAvailableStock } from '@/slices/inventorySlice';
import { SalesOrder, SalesOrderItem, StockBatch } from '@/types';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import AddEditSalesOrder from '@/components/AddEditSalesOrder';
import ShareDocumentModal from '@/components/ShareDocumentModal';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending:    { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  confirmed:  { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Confirmed' },
  processing: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Processing' },
  shipped:    { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Shipped' },
  delivered:  { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Delivered' },
  cancelled:  { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Cancelled' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};

const unitOptions = ['box', 'pack', 'piece'];

// ─── Main Page ────────────────────────────────────────────────────────────────

const SalesOrders: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { orders, pagination, loading } = useAppSelector((state) => state.salesOrders);

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewOrder, setViewOrder] = useState<SalesOrder | null>(null);
  const [editOrderData, setEditOrderData] = useState<SalesOrder | undefined>(undefined);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionModalOrder, setActionModalOrder] = useState<SalesOrder | null>(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<SalesOrder | null>(null);
  const [batchSelections, setBatchSelections] = useState<Record<string, { stockBatchId: string; saleUnit: string }>>({});
  const [stockCache, setStockCache] = useState<Record<string, StockBatch[]>>({});
  const [stockLoading, setStockLoading] = useState(false);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [shareOrder, setShareOrder] = useState<SalesOrder | null>(null);

  useEffect(() => {
    dispatch(fetchSalesOrders({ page: currentPage, limit: 10, search }));
  }, [dispatch, search, currentPage]);

  // When editing via route param, find order from list
  useEffect(() => {
    if (id && orders.length > 0) {
      const found = orders.find((o) => o.id === id);
      if (found) setEditOrderData(found);
    }
  }, [id, orders]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const handleAddOrder = () => navigate('/sales-orders/add');
  const handleEditOrder = (order: SalesOrder) => {
    setEditOrderData(order);
    navigate(`/sales-orders/edit/${order.id}`);
  };

  const handleFormSuccess = () => {
    navigate('/sales-orders');
    setEditOrderData(undefined);
    dispatch(fetchSalesOrders({ page: currentPage, limit: 10, search }));
  };

  const handleFormCancel = () => {
    navigate('/sales-orders');
    setEditOrderData(undefined);
  };

  const handleDownloadPDF = async (order: SalesOrder) => {
    setDownloadingId(order.id);
    try {
      const blob = await salesOrderService.downloadPDF(order.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SalesOrder-${order.orderNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to download PDF'); }
    finally { setDownloadingId(null); }
  };

  const handleDelete = async (order: SalesOrder) => {
    if (!window.confirm(`Delete order "${order.orderNo}"?`)) return;
    try {
      await dispatch(deleteSalesOrder(order.id)).unwrap();
      toast.success('Sales order deleted');
    } catch (e: any) { toast.error(e?.message || 'Failed to delete'); }
  };

  const openInvoiceModal = async (order: SalesOrder) => {
    setInvoiceModalOrder(order);
    setBatchSelections({});
    setStockCache({});
    setStockLoading(true);
    const items = order.items || [];
    const uniqueProductIds = [...new Set(items.map((i: SalesOrderItem) => i.productId.toString()))];
    const results = await Promise.all(
      uniqueProductIds.map((pid) => dispatch(fetchAvailableStock({ productId: pid })).unwrap())
    );
    const cache: Record<string, StockBatch[]> = {};
    uniqueProductIds.forEach((pid, idx) => { cache[pid] = results[idx]; });
    setStockCache(cache);
    setStockLoading(false);
  };

  const handleInvoiceSubmit = async () => {
    if (!invoiceModalOrder) return;
    const items = invoiceModalOrder.items || [];
    for (const item of items) {
      if (!batchSelections[item.id]?.stockBatchId) {
        toast.error(`Please select stock batch for: ${item.product?.name || item.productId}`);
        return;
      }
    }
    const itemsPayload = items.map((item: SalesOrderItem) => ({
      salesOrderItemId: item.id,
      stockBatchId: batchSelections[item.id].stockBatchId,
      saleUnit: batchSelections[item.id].saleUnit,
    }));
    setSubmittingInvoice(true);
    try {
      await dispatch(convertSalesOrderToInvoice({ id: invoiceModalOrder.id, items: itemsPayload })).unwrap();
      toast.success(`Invoice created from ${invoiceModalOrder.orderNo}`);
      setInvoiceModalOrder(null);
      navigate('/outward');
    } catch (e: any) {
      toast.error(e?.message || e || 'Failed to convert to invoice');
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const columns = [
    { key: 'orderNo', title: 'Order No', sortable: true },
    { key: 'customer.name', title: 'Customer', render: (_: any, r: SalesOrder) => r.customer?.name || '-' },
    { key: 'orderDate', title: 'Order Date', render: (v: string) => formatDate(v) },
    { key: 'quote', title: 'From Quote', render: (_: any, r: SalesOrder) => r.quote?.quoteNo ? <span className="text-blue-600 text-xs font-medium">{r.quote.quoteNo}</span> : '-' },
    {
      key: 'saleType', title: 'Type',
      render: (v: string) => <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${v === 'export' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{v.charAt(0).toUpperCase() + v.slice(1)}</span>
    },
    { key: 'totalAmount', title: 'Amount', render: (v: number) => `₹${v?.toFixed(2) || '0.00'}` },
    { key: 'status', title: 'Status', render: (v: string) => <StatusBadge status={v} /> },
    {
      key: 'actions', title: 'Actions',
      render: (_: any, r: SalesOrder) => (
        <div className="flex gap-1 items-center">
          <Button variant="ghost" size="sm" onClick={() => setViewOrder(r)} title="View"><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(r)} title="Download PDF" disabled={downloadingId === r.id} className="hidden md:inline-flex">
            {downloadingId === r.id ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <Download className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShareOrder(r)} title="Send via Email" className="hidden md:inline-flex">
            <Mail className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEditOrder(r)} title="Edit" className="hidden md:inline-flex"><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(r)} className="text-red-600 hover:text-red-700 hidden md:inline-flex" title="Delete"><Trash2 className="h-4 w-4" /></Button>
          {/* Action Trigger Button */}
          <Button variant="ghost" size="sm" onClick={() => setActionModalOrder(r)} title="More options">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // ── Show form if in add/edit mode (like Products.tsx) ──
  if (id || window.location.pathname.includes('/add')) {
    return (
      <AddEditSalesOrder
        order={editOrderData}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sales Orders"
        searchPlaceholder="Search orders..."
        onSearch={(v) => debouncedSearch(v)}
        actions={[
          { label: 'Add Sales Order', icon: <Plus className="h-4 w-4" />, onClick: handleAddOrder, variant: 'primary' as const },
        ]}
      />



      <div className="card overflow-x-auto">
        <Table data={orders} columns={columns} loading={loading} />
        <Pagination
          currentPage={pagination?.page || 1}
          totalPages={pagination?.totalPages || 1}
          total={pagination?.total || 0}
          limit={pagination?.limit || 10}
          onPageChange={setCurrentPage}
          loading={loading}
        />
      </div>

      {shareOrder && (
        <ShareDocumentModal
          isOpen={!!shareOrder}
          onClose={() => setShareOrder(null)}
          docType="salesOrder"
          docId={shareOrder.id}
          docLabel={shareOrder.orderNo}
          defaultEmail={shareOrder.customer?.email || ''}
        />
      )}

      {/* Convert to Invoice Modal */}
      <Modal isOpen={!!invoiceModalOrder} onClose={() => setInvoiceModalOrder(null)}
        title={`Convert to Invoice - ${invoiceModalOrder?.orderNo}`} size="lg">
        {invoiceModalOrder && (
          <div className="space-y-4">
            {stockLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
            ) : (
              <>
                <p className="text-sm text-gray-600">Select stock batch and sale unit for each item to create an outward invoice.</p>
                <div className="space-y-3">
                  {(invoiceModalOrder.items || []).map((item: SalesOrderItem) => {
                    const batches = stockCache[item.productId.toString()] || [];
                    const sel = batchSelections[item.id] || { stockBatchId: '', saleUnit: item.unit || 'box' };
                    return (
                      <div key={item.id} className="border rounded p-3 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium text-sm">{item.product?.name || `Product #${item.productId}`}</span>
                            {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                          </div>
                          <span className="text-sm text-gray-600">Qty: {item.quantity} {item.unit}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Stock Batch *</label>
                            <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                              value={sel.stockBatchId}
                              onChange={(e) => setBatchSelections((prev) => ({ ...prev, [item.id]: { ...sel, stockBatchId: e.target.value } }))}>
                              <option value="">Select batch...</option>
                              {batches.map((b: StockBatch) => (
                                <option key={b.id} value={b.id}>
                                  [{b.location?.name}] {b.vendor?.name} - {formatDate(b.inwardDate)} | {b.remainingBoxes} boxes, {b.remainingPacks} packs, {b.remainingPcs} pcs
                                </option>
                              ))}
                            </select>
                            {batches.length === 0 && <p className="text-xs text-red-500 mt-1">No stock available</p>}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Sale Unit *</label>
                            <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                              value={sel.saleUnit}
                              onChange={(e) => setBatchSelections((prev) => ({ ...prev, [item.id]: { ...sel, saleUnit: e.target.value } }))}>
                              {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => setInvoiceModalOrder(null)}>Cancel</Button>
                  <Button onClick={handleInvoiceSubmit} disabled={submittingInvoice}>
                    {submittingInvoice ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Creating...</> : <><Package className="h-4 w-4 mr-1" />Create Invoice</>}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* View Modal */}
      <Modal isOpen={!!viewOrder} onClose={() => setViewOrder(null)} title={`Sales Order - ${viewOrder?.orderNo}`} size="lg">
        {viewOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium text-gray-600">Customer:</span><div>{viewOrder.customer?.name}</div></div>
              <div><span className="font-medium text-gray-600">Order Date:</span><div>{formatDate(viewOrder.orderDate)}</div></div>
              <div><span className="font-medium text-gray-600">Status:</span><div><StatusBadge status={viewOrder.status} /></div></div>
              <div><span className="font-medium text-gray-600">Sale Type:</span><div className="capitalize">{viewOrder.saleType}</div></div>
              <div><span className="font-medium text-gray-600">Grand Total:</span><div className="font-semibold text-slate-900">₹{viewOrder.totalAmount?.toFixed(2)}</div></div>
              <div>
                <span className="font-medium text-gray-600">Adjustment / Rounding:</span>
                <div>{(viewOrder.adjustment ?? 0) > 0 ? '-' : (viewOrder.adjustment ?? 0) < 0 ? '+' : ''}₹{Math.abs(viewOrder.adjustment ?? 0).toFixed(2)}</div>
              </div>
              <div><span className="font-medium text-gray-600">Amount Received:</span><div className="text-emerald-600 font-semibold">₹{(viewOrder.amountReceived || 0).toFixed(2)}</div></div>
              <div>
                <span className="font-medium text-gray-600">Balance Due:</span>
                <div className={`font-bold ${(viewOrder.totalAmount - (viewOrder.amountReceived || 0)) > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  ₹{(viewOrder.totalAmount - (viewOrder.amountReceived || 0)).toFixed(2)}
                </div>
              </div>
              {viewOrder.quote && <div><span className="font-medium text-gray-600">From Quote:</span><div className="text-blue-600">{viewOrder.quote.quoteNo}</div></div>}
              {(viewOrder.shippingCharge ?? 0) > 0 && <div><span className="font-medium text-gray-600">Shipping Charge:</span><div>₹{(viewOrder.shippingCharge ?? 0).toFixed(2)}</div></div>}
              {(viewOrder.discount ?? 0) > 0 && <div><span className="font-medium text-gray-600">Discount:</span><div className="text-red-600 font-semibold">-₹{(viewOrder.discount ?? 0).toFixed(2)}</div></div>}
              {viewOrder.reference && <div><span className="font-medium text-gray-600">Reference:</span><div>{viewOrder.reference}</div></div>}
              {viewOrder.expectedShipmentDate && <div><span className="font-medium text-gray-600">Expected Shipment:</span><div>{formatDate(viewOrder.expectedShipmentDate)}</div></div>}
              <div><span className="font-medium text-gray-600">Place of Supply:</span><div>{viewOrder.customer?.state || viewOrder.placeOfSupply || '—'}</div></div>
              {viewOrder.deliveryMethod && <div><span className="font-medium text-gray-600">Delivery Method:</span><div className="capitalize">{viewOrder.deliveryMethod.replace('_', ' ')}</div></div>}
              {viewOrder.notes && <div className="col-span-2"><span className="font-medium text-gray-600">Notes:</span><div>{viewOrder.notes}</div></div>}
            </div>
            {viewOrder.items && viewOrder.items.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Items</h4>
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {viewOrder.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <div>
                            {item.product?.name}{item.product?.grade ? ` (${item.product.grade})` : ''}
                          </div>
                          {item.description && (
                            <div className="text-xs text-gray-400 mt-0.5 italic">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">{item.product?.sku || '—'}</td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="px-3 py-2 capitalize">{item.unit}</td>
                        <td className="px-3 py-2">₹{item.rate?.toFixed(2)}</td>
                        <td className="px-3 py-2 font-medium">₹{item.amount?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Action Modal */}
      <Modal isOpen={!!actionModalOrder} onClose={() => setActionModalOrder(null)}
        title={`Actions - ${actionModalOrder?.orderNo}`} size="sm">
        {actionModalOrder && (
          <div className="space-y-2 p-1">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors border border-gray-150 font-medium"
              onClick={() => {
                const o = actionModalOrder;
                setActionModalOrder(null);
                openInvoiceModal(o);
              }}
            >
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-gray-950">Convert to Invoice</div>
                <div className="text-xs text-gray-500">Generate an outward invoice for this order</div>
              </div>
            </button>

            {/* Mobile-only action: Download PDF */}
            <button
              className="md:hidden w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors border border-gray-150 font-medium"
              onClick={() => {
                const o = actionModalOrder;
                setActionModalOrder(null);
                handleDownloadPDF(o);
              }}
            >
              <Download className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-gray-950">Download PDF</div>
                <div className="text-xs text-gray-500">Download the PDF version of this order</div>
              </div>
            </button>

            {/* Mobile-only action: Edit */}
            <button
              className="md:hidden w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors border border-gray-150 font-medium"
              onClick={() => {
                const o = actionModalOrder;
                setActionModalOrder(null);
                handleEditOrder(o);
              }}
            >
              <Edit className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-gray-950">Edit Order</div>
                <div className="text-xs text-gray-500">Modify order details or items</div>
              </div>
            </button>

            {/* Mobile-only action: Delete */}
            <button
              className="md:hidden w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-650 hover:bg-red-50 transition-colors border border-red-100 font-medium"
              onClick={() => {
                const o = actionModalOrder;
                setActionModalOrder(null);
                handleDelete(o);
              }}
            >
              <Trash2 className="h-5 w-5 text-red-650 flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-red-950">Delete Order</div>
                <div className="text-xs text-red-550">Remove this order from the system</div>
              </div>
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SalesOrders;
