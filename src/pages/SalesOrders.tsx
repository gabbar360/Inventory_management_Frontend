import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Eye, Download, Loader2, MoreVertical, FileText, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { salesOrderService } from '@/services/salesOrderService';
import { fetchSalesOrders, deleteSalesOrder, updateSalesOrder, createSalesOrder, convertSalesOrderToInvoice } from '@/slices/salesOrderSlice';
import { fetchCustomers } from '@/slices/customerSlice';
import { fetchAvailableStock } from '@/slices/inventorySlice';
import { SalesOrder, SalesOrderItem, Product, StockBatch } from '@/types';
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

const emptyItem = (): OrderItem => ({ productId: '', quantity: 0, unit: 'box', rate: 0, taxRate: 0, description: '' });

const unitOptions = ['box', 'pack', 'piece'];

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};

// ── Standalone form component (outside SalesOrders) to prevent remount on state change ──
interface OrderFormProps {
  formData: {
    customerId: string;
    orderDate: string;
    saleType: string;
    status: string;
    notes: string;
    reference: string;
    expectedShipmentDate: string;
    placeOfSupply: string;
    deliveryMethod: string;
    adjustment: string;
    amountReceived: string;
    shippingCharge: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<OrderFormProps['formData']>>;
  items: OrderItem[];
  setItems: React.Dispatch<React.SetStateAction<OrderItem[]>>;
  newItem: OrderItem;
  setNewItem: React.Dispatch<React.SetStateAction<OrderItem>>;
  editingItem: number | null;
  setEditingItem: React.Dispatch<React.SetStateAction<number | null>>;
  editingData: OrderItem | null;
  setEditingData: React.Dispatch<React.SetStateAction<OrderItem | null>>;
  customerOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
  calcTotal: () => number;
}

const CustomerCombobox: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const selected = options.find((o) => o.value.toString() === value?.toString());
    if (selected) setSearch(selected.label);
    else if (!value) setSearch('');
  }, [value, options]);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
      <input
        type="text"
        autoComplete="off"
        placeholder="Search customer..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); onChange(''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <input type="text" required value={value} onChange={() => {}} className="sr-only" tabIndex={-1} />
      {open && (
        <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
          {filtered.map((o) => (
            <li key={o.value} onMouseDown={() => { onChange(o.value); setSearch(o.label); setOpen(false); }}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm">{o.label}</li>
          ))}
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">No customers found</li>}
        </ul>
      )}
    </div>
  );
};

const OrderForm: React.FC<OrderFormProps> = ({
  formData, setFormData,
  items, setItems,
  newItem, setNewItem,
  editingItem, setEditingItem,
  editingData, setEditingData,
  customerOptions, statusOptions,
  calcTotal,
}) => {
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleAddItem = () => {
    if (!newItem.productId || newItem.quantity < 1 || newItem.rate < 0) return;
    setItems((prev) => [...prev, { ...newItem }]);
    setNewItem(emptyItem());
  };

  return (
    <div className="space-y-4">
      {/* Header fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CustomerCombobox
          value={formData.customerId}
          onChange={(val) => setFormData({ ...formData, customerId: val })}
          options={customerOptions}
        />
        <Input label="Order Date *" type="date" value={formData.orderDate}
          onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <Input label="Reference" value={formData.reference}
          onChange={(e) => setFormData({ ...formData, reference: e.target.value })} />
        <Input label="Expected Shipment Date" type="date" value={formData.expectedShipmentDate}
          onChange={(e) => setFormData({ ...formData, expectedShipmentDate: e.target.value })} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Method</label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            value={formData.deliveryMethod}
            onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value })}
          >
            <option value="">Select delivery method...</option>
            <option value="ex_works">Ex-Works</option>
            <option value="for">FOR</option>
          </select>
        </div>
      </div>

      {/* Items */}
      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3">Products *</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <ProductSearch
            value={newItem.productId}
            onChange={(productId, product) =>
              setNewItem({ ...newItem, productId, product, taxRate: product?.category?.gstRate || 0, description: product?.description || '' })
            }
          />
          <Input label="Quantity" type="number" min="1" value={newItem.quantity || ''}
            onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <Input label="Rate (₹)" type="number" min="0" step="0.01" value={newItem.rate || ''}
            onChange={(e) => setNewItem({ ...newItem, rate: parseFloat(e.target.value) || 0 })} />
          <Input label="Tax Rate (%)" type="number" min="0" step="0.01" value={newItem.taxRate || ''}
            onChange={(e) => setNewItem({ ...newItem, taxRate: parseFloat(e.target.value) || 0 })} />
        </div>
        <Input label="Description" value={newItem.description}
          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
          placeholder="Product description (auto-filled from product)" />
        <Button type="button" onClick={handleAddItem} className="mt-2">Add Item</Button>

        {items.length > 0 && (
          <table className="w-full text-sm border mt-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Product</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-left">UOM</th>
                <th className="p-2 text-right">Rate</th>
                <th className="p-2 text-right">Tax%</th>
                <th className="p-2 text-right">Tax Amt</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <React.Fragment key={idx}>
                  <tr className="border-t">
                    <td className="p-2">
                      <div className="font-medium">{item.product?.name || '-'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                    </td>
                    <td className="p-2 text-right">{item.quantity}</td>
                    <td className="p-2 text-left">{item.unit}</td>
                    <td className="p-2 text-right">₹{Number(item.rate).toFixed(2)}</td>
                    <td className="p-2 text-right">{item.taxRate}%</td>
                    <td className="p-2 text-right">₹{(item.quantity * item.rate * item.taxRate / 100).toFixed(2)}</td>
                    <td className="p-2 text-right">₹{(item.quantity * item.rate).toFixed(2)}</td>
                    <td className="p-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <button type="button" onClick={() => { if (editingItem === idx) { setEditingItem(null); setEditingData(null); } else { setEditingItem(idx); setEditingData({ ...item }); } }} className="text-blue-600 hover:text-blue-800" title="Edit">✏️</button>
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-600 hover:text-red-800" title="Delete">×</button>
                      </div>
                    </td>
                  </tr>
                  {editingItem === idx && editingData && (
                    <tr className="bg-blue-50 border-t border-blue-200">
                      <td colSpan={8} className="p-3">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <ProductSearch
                            value={editingData.productId}
                            onChange={(productId, product) =>
                              setEditingData({ ...editingData, productId, product, taxRate: product?.category?.gstRate || 0, description: product?.description || '' })
                            }
                          />
                          <Input label="Quantity" type="number" min="1" value={editingData.quantity}
                            onChange={(e) => setEditingData({ ...editingData, quantity: parseInt(e.target.value) || 1 })} />
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                            <select value={editingData.unit} onChange={(e) => setEditingData({ ...editingData, unit: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                              {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                          <Input label="Rate (₹)" type="number" min="0" step="0.01" value={editingData.rate}
                            onChange={(e) => setEditingData({ ...editingData, rate: parseFloat(e.target.value) || 0 })} />
                          <Input label="Tax Rate (%)" type="number" min="0" step="0.01" value={editingData.taxRate}
                            onChange={(e) => setEditingData({ ...editingData, taxRate: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <Input label="Description" value={editingData.description || ''}
                          onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                          placeholder="Product description (auto-filled from product)" />
                        <div className="flex gap-2 mt-3">
                          <Button type="button" onClick={() => { const updated = [...items]; updated[idx] = editingData; setItems(updated); setEditingItem(null); setEditingData(null); }}>Save</Button>
                          <Button type="button" variant="outline" onClick={() => { setEditingItem(null); setEditingData(null); }}>Cancel</Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
        <Input
          label="Shipping Charge"
          type="number"
          step="0.01"
          min="0"
          value={formData.shippingCharge}
          onChange={(e) => setFormData({ ...formData, shippingCharge: e.target.value })}
          placeholder="e.g. 500"
        />
        <Input
          label="Amount Rounding"
          type="number"
          step="0.01"
          value={formData.adjustment}
          onChange={(e) => setFormData({ ...formData, adjustment: e.target.value })}
          placeholder="e.g. -0.50 or 0.50"
        />
        <Input
          label="Amount Received"
          type="number"
          step="0.01"
          min="0"
          value={formData.amountReceived}
          onChange={(e) => setFormData({ ...formData, amountReceived: e.target.value })}
          placeholder="e.g. 5000"
        />
      </div>

      {/* Totals */}
      {(() => {
        const subtotal = items.reduce((s, i) => s + i.quantity * i.rate, 0);
        const totalTax = items.reduce((s, i) => s + i.quantity * i.rate * i.taxRate / 100, 0);
        const shippingVal = parseFloat(formData.shippingCharge) || 0;
        const adjustmentVal = parseFloat(formData.adjustment) || 0;
        const grandTotal = calcTotal();
        const receivedVal = parseFloat(formData.amountReceived) || 0;
        const balanceDue = grandTotal - receivedVal;

        return (
          <div className="bg-gray-100 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total Tax:</span>
              <span>+₹{totalTax.toFixed(2)}</span>
            </div>
            {shippingVal > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping Charge:</span>
                <span>+₹{shippingVal.toFixed(2)}</span>
              </div>
            )}
            {adjustmentVal !== 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Round Off:</span>
                <span>{adjustmentVal > 0 ? '-' : '+'}₹{Math.abs(adjustmentVal).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2 text-gray-800">
              <span>Grand Total:</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-600 font-medium">
              <span>Amount Received:</span>
              <span>₹{receivedVal.toFixed(2)}</span>
            </div>
            <div className={`flex justify-between text-sm font-bold border-t border-dashed border-gray-300 pt-2 ${balanceDue > 0 ? 'text-red-600' : 'text-gray-700'}`}>
              <span>Balance Due:</span>
              <span>₹{balanceDue.toFixed(2)}</span>
            </div>
          </div>
        );
      })()}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" rows={2}
          value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
      </div>
    </div>
  );
};

// ── Main page ──
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<SalesOrder | null>(null);
  const [batchSelections, setBatchSelections] = useState<Record<string, { stockBatchId: string; saleUnit: string }>>({});
  const [stockCache, setStockCache] = useState<Record<string, StockBatch[]>>({});
  const [stockLoading, setStockLoading] = useState(false);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [formData, setFormData] = useState({
    customerId: '',
    orderDate: new Date().toISOString().split('T')[0],
    saleType: 'domestic',
    status: 'pending',
    notes: '',
    reference: '',
    expectedShipmentDate: '',
    placeOfSupply: '',
    deliveryMethod: '',
    adjustment: '0',
    amountReceived: '0',
    shippingCharge: '0',
  });
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItem, setNewItem] = useState<OrderItem>(emptyItem());
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<OrderItem | null>(null);

  useEffect(() => {
    dispatch(fetchSalesOrders({ page: currentPage, limit: 10, search }));
  }, [dispatch, search, currentPage]);

  useEffect(() => {
    dispatch(fetchCustomers({ limit: 1000 }));
  }, [dispatch]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const resetForm = () => {
    setFormData({ customerId: '', orderDate: new Date().toISOString().split('T')[0], saleType: 'domestic', status: 'pending', notes: '', reference: '', expectedShipmentDate: '', placeOfSupply: '', deliveryMethod: '', adjustment: '0', amountReceived: '0', shippingCharge: '0' });
    setItems([]);
    setNewItem(emptyItem());
    setEditingItem(null);
    setEditingData(null);
  };

  const openCreate = () => { resetForm(); setCreateModalOpen(true); };

  const openEdit = (order: SalesOrder) => {
    setEditOrder(order);
    setFormData({
      customerId: order.customerId.toString(),
      orderDate: order.orderDate.split('T')[0],
      saleType: order.saleType,
      status: order.status,
      notes: order.notes || '',
      reference: order.reference || '',
      expectedShipmentDate: order.expectedShipmentDate ? order.expectedShipmentDate.split('T')[0] : '',
      placeOfSupply: order.placeOfSupply || '',
      deliveryMethod: order.deliveryMethod || '',
      adjustment: (order.adjustment ?? 0).toString(),
      amountReceived: (order.amountReceived ?? 0).toString(),
      shippingCharge: (order.shippingCharge ?? 0).toString(),
    });
    setItems(
      order.items && order.items.length > 0
        ? order.items.map((i) => ({ productId: i.productId, product: i.product, quantity: i.quantity, unit: i.unit, rate: i.rate, taxRate: i.taxRate, description: i.description || '' }))
        : []
    );
    setNewItem(emptyItem());
    setEditingItem(null);
    setEditingData(null);
  };

  const calcTotal = () => {
    const itemsTotal = items.reduce((sum, item) => {
      const base = item.quantity * item.rate;
      return sum + base + base * (item.taxRate / 100);
    }, 0);
    const shipping = parseFloat(formData.shippingCharge) || 0;
    const adj = parseFloat(formData.adjustment) || 0;
    return itemsTotal + shipping - adj;
  };

  const buildPayload = () => ({
    customerId: parseInt(formData.customerId),
    orderDate: formData.orderDate,
    saleType: formData.saleType,
    status: formData.status,
    notes: formData.notes,
    reference: formData.reference,
    expectedShipmentDate: formData.expectedShipmentDate || null,
    placeOfSupply: formData.placeOfSupply,
    deliveryMethod: formData.deliveryMethod,
    totalAmount: calcTotal(),
    adjustment: parseFloat(formData.adjustment) || 0,
    amountReceived: parseFloat(formData.amountReceived) || 0,
    shippingCharge: parseFloat(formData.shippingCharge) || 0,
    items: items.filter((i) => i.productId).map((i) => ({
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
    } catch (e: any) { toast.error(e?.message || 'Failed to create'); }
  };

  const handleUpdate = async () => {
    if (!editOrder) return;
    try {
      await dispatch(updateSalesOrder({ id: editOrder.id, data: { ...buildPayload() } })).unwrap();
      toast.success('Sales order updated');
      setEditOrder(null);
      dispatch(fetchSalesOrders({ page: currentPage, limit: 10, search }));
    } catch (e: any) { toast.error(e?.message || 'Failed to update'); }
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

  const customerOptions = customers.map((c) => ({ value: c.id.toString(), label: `${c.code} - ${c.name}` }));
  const statusOptions = Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }));

  const sharedFormProps: OrderFormProps = {
    formData, setFormData,
    items, setItems,
    newItem, setNewItem,
    editingItem, setEditingItem,
    editingData, setEditingData,
    customerOptions, statusOptions,
    calcTotal,
  };

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
        <div className="flex gap-1 items-center">
          <Button variant="ghost" size="sm" onClick={() => setViewOrder(r)} title="View"><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(r)} title="Download PDF" disabled={downloadingId === r.id}>
            {downloadingId === r.id ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <Download className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(r)} title="Edit"><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(r)} className="text-red-600 hover:text-red-700" title="Delete"><Trash2 className="h-4 w-4" /></Button>
          {/* Three-dot menu */}
          <div className="relative" ref={openMenuId === r.id ? menuRef : null}>
            <Button variant="ghost" size="sm" onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)} title="More options">
              <MoreVertical className="h-4 w-4" />
            </Button>
            {openMenuId === r.id && (
              <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => { setOpenMenuId(null); openInvoiceModal(r); }}
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  Convert to Invoice
                </button>
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

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
          <OrderForm {...sharedFormProps} />
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { setCreateModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate}>Create Sales Order</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editOrder} onClose={() => setEditOrder(null)} title={`Edit ${editOrder?.orderNo}`} size="xl">
        <div className="space-y-4">
          <OrderForm {...sharedFormProps} />
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setEditOrder(null)}>Cancel</Button>
            <Button onClick={handleUpdate}>Update Sales Order</Button>
          </div>
        </div>
      </Modal>

      {/* Convert to Invoice Modal */}
      <Modal isOpen={!!invoiceModalOrder} onClose={() => setInvoiceModalOrder(null)} title={`Convert to Invoice - ${invoiceModalOrder?.orderNo}`} size="lg">
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
                      <div key={item.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium text-sm">{item.product?.name || `Product #${item.productId}`}</span>
                            {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                          </div>
                          <span className="text-sm text-gray-600">Qty: {item.quantity} {item.unit}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Stock Batch *</label>
                            <select
                              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              value={sel.stockBatchId}
                              onChange={(e) => setBatchSelections((prev) => ({ ...prev, [item.id]: { ...sel, stockBatchId: e.target.value } }))}
                            >
                              <option value="">Select batch...</option>
                              {batches.map((b: StockBatch) => (
                                <option key={b.id} value={b.id}>
                                  [{b.location?.name}] {b.vendor?.name} - {formatDate(b.inwardDate)} | {b.remainingBoxes} boxes, {b.packPerBox} pack/box, {b.remainingPacks} packs, {b.packPerPiece} pcs/pack, {b.remainingPcs} pcs
                                </option>
                              ))}
                            </select>
                            {batches.length === 0 && <p className="text-xs text-red-500 mt-1">No stock available</p>}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Sale Unit *</label>
                            <select
                              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              value={sel.saleUnit}
                              onChange={(e) => setBatchSelections((prev) => ({ ...prev, [item.id]: { ...sel, saleUnit: e.target.value } }))}
                            >
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
