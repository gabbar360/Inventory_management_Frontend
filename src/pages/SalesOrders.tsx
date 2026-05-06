import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { salesOrderService } from '@/services/salesOrderService';
import { fetchSalesOrders, deleteSalesOrder, updateSalesOrder, createSalesOrder } from '@/slices/salesOrderSlice';
import { fetchCustomers } from '@/slices/customerSlice';
import { SalesOrder, Product } from '@/types';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import Input from '@/components/Input';
import ProductSearch from '@/components/ProductSearch';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending:    { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  confirmed:  { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Confirmed' },
  processing: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Processing' },
  shipped:    { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Shipped' },
  delivered:  { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Delivered' },
  cancelled:  { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Cancelled' },
};

interface OrderItem {
  productId: string;
  product?: Product;
  quantity: number;
  unit: string;
  rate: number;
  taxRate: number;
  description: string;
}

const emptyItem = (): OrderItem => ({ productId: '', quantity: 1, unit: 'box', rate: 0, taxRate: 0, description: '' });

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};

const SalesOrders: React.FC = () => {
  const dispatch = useAppDispatch();
  const { orders, pagination, loading } = useAppSelector((state) => state.salesOrders);
  const { customers } = useAppSelector((state) => state.customers);

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewOrder, setViewOrder] = useState<SalesOrder | null>(null);
  const [editOrder, setEditOrder] = useState<SalesOrder | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerId: '',
    orderDate: new Date().toISOString().split('T')[0],
    saleType: 'domestic',
    status: 'pending',
    notes: '',
  });
  const [items, setItems] = useState<OrderItem[]>([emptyItem()]);

  useEffect(() => {
    dispatch(fetchSalesOrders({ page: currentPage, limit: 10, search }));
  }, [dispatch, search, currentPage]);

  useEffect(() => {
    dispatch(fetchCustomers({ limit: 200 }));
  }, [dispatch]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const resetForm = () => {
    setFormData({ customerId: '', orderDate: new Date().toISOString().split('T')[0], saleType: 'domestic', status: 'pending', notes: '' });
    setItems([emptyItem()]);
  };

  const openCreate = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  const openEdit = (order: SalesOrder) => {
    setEditOrder(order);
    setFormData({
      customerId: order.customerId,
      orderDate: order.orderDate.split('T')[0],
      saleType: order.saleType,
      status: order.status,
      notes: order.notes || '',
    });
    setItems(
      order.items && order.items.length > 0
        ? order.items.map((i) => ({
            productId: i.productId,
            product: i.product,
            quantity: i.quantity,
            unit: i.unit,
            rate: i.rate,
            taxRate: i.taxRate,
            description: i.description || '',
          }))
        : [emptyItem()]
    );
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleProductChange = (index: number, productId: string, product?: Product) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, productId, product, taxRate: product?.category?.gstRate || 0 }
          : item
      )
    );
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const calcTotal = () =>
    items.reduce((sum, item) => {
      const base = item.quantity * item.rate;
      return sum + base + base * (item.taxRate / 100);
    }, 0);

  const buildPayload = () => ({
    customerId: parseInt(formData.customerId),
    orderDate: formData.orderDate,
    saleType: formData.saleType,
    status: formData.status,
    notes: formData.notes,
    totalAmount: calcTotal(),
    items: items
      .filter((i) => i.productId)
      .map((i) => ({
        productId: parseInt(i.productId),
        quantity: i.quantity,
        unit: i.unit,
        rate: i.rate,
        taxRate: i.taxRate,
        description: i.description,
      })),
  });

  const handleCreate = async () => {
    if (!formData.customerId || !formData.orderDate) return toast.error('Customer and date are required');
    if (!items.some((i) => i.productId)) return toast.error('Add at least one product');
    try {
      await dispatch(createSalesOrder(buildPayload())).unwrap();
      toast.success('Sales order created');
      setCreateModalOpen(false);
      resetForm();
      dispatch(fetchSalesOrders({ page: currentPage, limit: 10, search }));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create');
    }
  };

  const handleUpdate = async () => {
    if (!editOrder) return;
    try {
      await dispatch(updateSalesOrder({ id: editOrder.id, data: { ...buildPayload() } })).unwrap();
      toast.success('Sales order updated');
      setEditOrder(null);
      dispatch(fetchSalesOrders({ page: currentPage, limit: 10, search }));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update');
    }
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
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (order: SalesOrder) => {
    if (!window.confirm(`Delete order "${order.orderNo}"?`)) return;
    try {
      await dispatch(deleteSalesOrder(order.id)).unwrap();
      toast.success('Sales order deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete');
    }
  };

  const customerOptions = customers.map((c) => ({ value: c.id.toString(), label: `${c.code} - ${c.name}` }));
  const statusOptions = Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }));
  const saleTypeOptions = [{ value: 'domestic', label: 'Domestic' }, { value: 'export', label: 'Export' }];
  const unitOptions = ['box', 'pack', 'piece', 'kg', 'nos'];

  const columns = [
    { key: 'orderNo', title: 'Order No', sortable: true },
    { key: 'customer.name', title: 'Customer', render: (_: any, r: SalesOrder) => r.customer?.name || '-' },
    { key: 'orderDate', title: 'Order Date', render: (v: string) => formatDate(v) },
    { key: 'quote', title: 'From Quote', render: (_: any, r: SalesOrder) => r.quote?.quoteNo ? <span className="text-blue-600 text-xs font-medium">{r.quote.quoteNo}</span> : '-' },
    { key: 'saleType', title: 'Type', render: (v: string) => <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${v === 'export' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{v.charAt(0).toUpperCase() + v.slice(1)}</span> },
    { key: 'totalAmount', title: 'Amount', render: (v: number) => `₹${v?.toFixed(2) || '0.00'}` },
    { key: 'status', title: 'Status', render: (v: string) => <StatusBadge status={v} /> },
    {
      key: 'actions', title: 'Actions',
      render: (_: any, r: SalesOrder) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setViewOrder(r)} title="View"><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(r)} title="Download PDF" disabled={downloadingId === r.id}>
            {downloadingId === r.id ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <Download className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(r)} title="Edit"><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(r)} className="text-red-600 hover:text-red-700" title="Delete"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  const OrderForm = () => (
    <div className="space-y-4">
      {/* Header fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
          <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}>
            <option value="">Select customer</option>
            {customerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <Input label="Order Date *" type="date" value={formData.orderDate}
          onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sale Type</label>
          <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={formData.saleType} onChange={(e) => setFormData({ ...formData, saleType: e.target.value })}>
            {saleTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Products *</label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3 w-3 mr-1" /> Add Item
          </Button>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => {
            const base = item.quantity * item.rate;
            const tax = base * (item.taxRate / 100);
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Item {index + 1}</span>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 p-1 h-auto">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <ProductSearch
                  value={item.productId}
                  onChange={(productId, product) => handleProductChange(index, productId, product)}
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                    <input type="number" min="1" value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                    <select value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                      {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Rate (₹)</label>
                    <input type="number" min="0" step="0.01" value={item.rate}
                      onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">GST%</label>
                    <input type="number" min="0" value={item.taxRate}
                      onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <input type="text" value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Product description (optional)"
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div className="flex justify-between text-xs text-gray-500 bg-gray-50 rounded px-2 py-1.5">
                  <span>Base: ₹{base.toFixed(2)}</span>
                  <span>GST ({item.taxRate}%): ₹{tax.toFixed(2)}</span>
                  <span className="font-semibold text-gray-700">Total: ₹{(base + tax).toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grand Total */}
      <div className="flex justify-end">
        <div className="bg-green-50 rounded-lg px-4 py-2 text-sm font-semibold text-green-800">
          Grand Total: ₹{calcTotal().toFixed(2)}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" rows={2}
          value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sales Orders"
        searchPlaceholder="Search orders..."
        onSearch={(v) => debouncedSearch(v)}
        actions={[{ label: 'Add Sales Order', icon: <Plus className="h-4 w-4" />, onClick: openCreate, variant: 'primary' as const }]}
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

      {/* Create Modal */}
      <Modal isOpen={createModalOpen} onClose={() => { setCreateModalOpen(false); resetForm(); }} title="Add Sales Order" size="xl">
        <div className="space-y-4">
          <OrderForm />
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { setCreateModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate}>Create Sales Order</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editOrder} onClose={() => setEditOrder(null)} title={`Edit ${editOrder?.orderNo}`} size="xl">
        <div className="space-y-4">
          <OrderForm />
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setEditOrder(null)}>Cancel</Button>
            <Button onClick={handleUpdate}>Update Sales Order</Button>
          </div>
        </div>
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
              <div><span className="font-medium text-gray-600">Total Amount:</span><div className="font-semibold">₹{viewOrder.totalAmount?.toFixed(2)}</div></div>
              {viewOrder.quote && <div><span className="font-medium text-gray-600">From Quote:</span><div className="text-blue-600">{viewOrder.quote.quoteNo}</div></div>}
              {viewOrder.notes && <div className="col-span-2"><span className="font-medium text-gray-600">Notes:</span><div>{viewOrder.notes}</div></div>}
            </div>
            {viewOrder.items && viewOrder.items.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Items</h4>
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {viewOrder.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{item.product?.name}{item.product?.grade ? ` (${item.product.grade})` : ''}</td>
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
    </div>
  );
};

export default SalesOrders;
