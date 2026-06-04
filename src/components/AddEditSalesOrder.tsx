import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronDown, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSalesOrders, createSalesOrder, updateSalesOrder } from '@/slices/salesOrderSlice';
import { fetchCustomers, createCustomer } from '@/slices/customerSlice';
import { SalesOrder, Product } from '@/types';
import { cn } from '@/utils';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import ProductSearch from '@/components/ProductSearch';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending:    { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  confirmed:  { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Confirmed' },
  processing: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Processing' },
  shipped:    { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Shipped' },
  delivered:  { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Delivered' },
  cancelled:  { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Cancelled' },
};

const unitOptions = ['box', 'pack', 'piece'];

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Customer Combobox ────────────────────────────────────────────────────────

const CustomerCombobox: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  onAddNew: () => void;
}> = ({ value, onChange, options, onAddNew }) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value) {
      const selected = options.find((o) => o.value.toString() === value.toString());
      if (selected) setSearch(selected.label);
    } else {
      setSearch('');
    }
  }, [value]);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-gray-700 mb-1">Customer *</label>
      <input
        type="text"
        autoComplete="off"
        placeholder="Search customer..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); onChange(''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <input type="text" required value={value} onChange={() => {}} className="sr-only" tabIndex={-1} />
      {open && (
        <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto mt-1">
          {filtered.map((o) => (
            <li key={o.value} onMouseDown={() => { onChange(o.value); setSearch(o.label); setOpen(false); }}
              className="px-3 py-1.5 cursor-pointer hover:bg-blue-50 text-xs">{o.label}</li>
          ))}
          {filtered.length === 0 && <li className="px-3 py-1.5 text-xs text-gray-400">No customers found</li>}
          <li className="border-t border-gray-200 px-3 py-1.5 sticky bottom-0 bg-gray-50">
            <button type="button" onMouseDown={(e) => { e.preventDefault(); onAddNew(); setOpen(false); }}
              className="w-full text-left text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" /> Add New Customer
            </button>
          </li>
        </ul>
      )}
    </div>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddEditSalesOrderProps {
  order?: SalesOrder;
  onSuccess: () => void;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const AddEditSalesOrder: React.FC<AddEditSalesOrderProps> = ({ order, onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const { customers } = useAppSelector((state) => state.customers);

  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', email: '', phone: '', address: '', state: '', gstNumber: '' });
  const [stateSearch, setStateSearch] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [indianStates, setIndianStates] = useState<string[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    customerId: '',
    orderDate: new Date().toISOString().split('T')[0],
    saleType: 'domestic',
    status: 'pending',
    notes: '',
    reference: '',
    referenceBy: '',
    expectedShipmentDate: '',
    placeOfSupply: '',
    deliveryMethod: '',
    adjustment: '0',
    amountReceived: '0',
    shippingCharge: '0',
    discount: '0',
  });
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItem, setNewItem] = useState<OrderItem>(emptyItem());
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<OrderItem | null>(null);
  const [currentPage] = useState(1);
  const [search] = useState('');

  // ── Load customers ──
  useEffect(() => {
    dispatch(fetchCustomers({ limit: 1000 }));
  }, [dispatch]);

  // ── State dropdown outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(e.target as Node)) setShowStateDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Fetch Indian states ──
  useEffect(() => {
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: 'India' }),
        });
        const result = await res.json();
        if (!result.error && result.data?.states) {
          setIndianStates(result.data.states.map((s: { name: string }) => s.name));
        }
      } catch { /* silent */ } finally { setLoadingStates(false); }
    };
    fetchStates();
  }, []);

  // ── Populate form when editing ──
  useEffect(() => {
    if (order) {
      setFormData({
        customerId: order.customerId.toString(),
        orderDate: order.orderDate.split('T')[0],
        saleType: order.saleType,
        status: order.status,
        notes: order.notes || '',
        reference: order.reference || '',
        referenceBy: order.referenceBy || '',
        expectedShipmentDate: order.expectedShipmentDate ? order.expectedShipmentDate.split('T')[0] : '',
        placeOfSupply: order.placeOfSupply || '',
        deliveryMethod: order.deliveryMethod || '',
        adjustment: (order.adjustment ?? 0).toString(),
        amountReceived: (order.amountReceived ?? 0).toString(),
        shippingCharge: (order.shippingCharge ?? 0).toString(),
        discount: (order.discount ?? 0).toString(),
      });
      setItems(
        order.items && order.items.length > 0
          ? order.items.map((i) => ({ productId: i.productId, product: i.product, quantity: i.quantity, unit: i.unit, rate: i.rate, taxRate: i.taxRate, description: i.description || '' }))
          : []
      );
    }
  }, [order]);

  // ── Calc ──
  const calcRawTotal = () => {
    const itemsTotal = items.reduce((sum, item) => {
      const base = item.quantity * item.rate;
      return sum + base + base * (item.taxRate / 100);
    }, 0);
    const shipping = parseFloat(formData.shippingCharge) || 0;
    const discount = parseFloat(formData.discount) || 0;
    return itemsTotal + shipping - discount;
  };

  const calcTotal = () => Math.round(calcRawTotal());

  // Auto-calculate rounding adjustment whenever items/shipping/discount change
  useEffect(() => {
    const raw = calcRawTotal();
    const rounding = raw - Math.round(raw); // negative = rounded up, positive = rounded down
    setFormData((prev) => ({ ...prev, adjustment: rounding.toFixed(2) }));
  }, [items, formData.shippingCharge, formData.discount]);

  const buildPayload = () => ({
    customerId: parseInt(formData.customerId),
    orderDate: formData.orderDate,
    saleType: formData.saleType,
    status: formData.status,
    notes: formData.notes,
    reference: formData.reference,
    referenceBy: formData.referenceBy,
    expectedShipmentDate: formData.expectedShipmentDate || null,
    placeOfSupply: formData.placeOfSupply,
    deliveryMethod: formData.deliveryMethod,
    totalAmount: calcTotal(),
    adjustment: parseFloat(formData.adjustment) || 0,
    amountReceived: parseFloat(formData.amountReceived) || 0,
    shippingCharge: parseFloat(formData.shippingCharge) || 0,
    discount: parseFloat(formData.discount) || 0,
    items: items.filter((i) => i.productId).map((i) => ({
      productId: parseInt(i.productId),
      quantity: i.quantity,
      unit: i.unit,
      rate: i.rate,
      taxRate: i.taxRate,
      description: i.description,
    })),
  });

  const handleSave = async () => {
    if (!formData.customerId || !formData.orderDate) return toast.error('Customer and date are required');
    if (!items.some((i) => i.productId)) return toast.error('Add at least one product');
    setSaving(true);
    try {
      if (order) {
        await dispatch(updateSalesOrder({ id: order.id, data: buildPayload() })).unwrap();
        toast.success('Sales order updated');
      } else {
        await dispatch(createSalesOrder(buildPayload())).unwrap();
        toast.success('Sales order created');
      }
      dispatch(fetchSalesOrders({ page: currentPage, limit: 10, search }));
      onSuccess();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = () => {
    if (!newItem.productId || newItem.quantity < 1 || newItem.rate < 0) return;
    setItems((prev) => [...prev, { ...newItem }]);
    setNewItem(emptyItem());
  };

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const customerOptions = customers.map((c) => ({ value: c.id.toString(), label: `${c.code} - ${c.name}` }));
  const statusOptions = Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }));

  const subtotal = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const totalTax = items.reduce((s, i) => s + i.quantity * i.rate * i.taxRate / 100, 0);
  const shippingVal = parseFloat(formData.shippingCharge) || 0;
  const adjustmentVal = parseFloat(formData.adjustment) || 0;
  const discountVal = parseFloat(formData.discount) || 0;
  const grandTotal = calcTotal();
  const receivedVal = parseFloat(formData.amountReceived) || 0;
  const balanceDue = grandTotal - receivedVal;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Breadcrumb + Control Bar */}
      <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="hover:text-primary-600 cursor-pointer" onClick={onCancel}>Sales Orders</span>
          <span>/</span>
          <span className="font-semibold text-gray-700">{order ? `${order.orderNo}` : 'New Sales Order'}</span>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={handleSave} loading={saving} className="odoo-btn-primary px-4 h-8 text-xs font-semibold">
            {order ? 'Update Order' : 'Save Order'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="odoo-btn-secondary px-4 h-8 text-xs">
            Discard
          </Button>
        </div>
      </div>

      {/* Odoo Sheet */}
      <div className="odoo-sheet max-w-6xl mx-auto">
        <div className="space-y-4">

          {/* Row 1: Customer + Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomerCombobox
              value={formData.customerId}
              onChange={(val) => setFormData({ ...formData, customerId: val })}
              options={customerOptions}
              onAddNew={() => setAddCustomerModalOpen(true)}
            />
            <Input label="Order Date *" type="date" value={formData.orderDate}
              onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })} />
          </div>

          {/* Row 2: Status, Reference, Reference By, Shipment Date, Delivery */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <Input label="Reference" value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })} />
            <Input label="Reference By" value={formData.referenceBy}
              onChange={(e) => setFormData({ ...formData, referenceBy: e.target.value })} />
            <Input label="Expected Shipment" type="date" value={formData.expectedShipmentDate}
              onChange={(e) => setFormData({ ...formData, expectedShipmentDate: e.target.value })} />
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Delivery Method</label>
              <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                value={formData.deliveryMethod} onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value })}>
                <option value="">Select method...</option>
                <option value="ex_works">Ex-Works</option>
                <option value="for">FOR</option>
              </select>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2 border-t pt-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider pb-1 border-b border-gray-200">
              Products / Line Items *
            </h3>

            {/* Add Item Row */}
            <div className="bg-gray-50 border border-gray-200 rounded p-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-2">
                <div className="md:col-span-2">
                  <ProductSearch
                    value={newItem.productId}
                    onChange={(productId, product) =>
                      setNewItem({ ...newItem, productId, product, taxRate: product?.category?.gstRate || 0, description: product?.description || '' })
                    }
                  />
                </div>
                <Input label="Quantity" type="number" min="1" value={newItem.quantity || ''}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })} />
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unit</label>
                  <select value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500">
                    {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <Input label="Rate (₹)" type="number" min="0" step="0.01" value={newItem.rate || ''}
                  onChange={(e) => setNewItem({ ...newItem, rate: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tax Rate (%)" type="number" min="0" step="0.01" value={newItem.taxRate || ''}
                  onChange={(e) => setNewItem({ ...newItem, taxRate: parseFloat(e.target.value) || 0 })} />
                <Input label="Description" value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Auto-filled from product" />
              </div>
              <Button type="button" onClick={handleAddItem} className="mt-2 odoo-btn-primary h-7 text-xs px-3">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
              </Button>
            </div>

            {/* Items Table */}
            {items.length > 0 && (
              <div className="odoo-table-container">
                <table className="odoo-table">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-[10px] sm:text-xs">
                      <th className="w-8 text-center p-2">#</th>
                      <th className="min-w-[160px] p-2 text-left">Product</th>
                      <th className="w-24 p-2 text-left">SKU</th>
                      <th className="w-16 p-2 text-right">Qty</th>
                      <th className="w-20 p-2 text-left">Unit</th>
                      <th className="w-24 p-2 text-right">Rate (₹)</th>
                      <th className="w-20 p-2 text-right">Tax%</th>
                      <th className="w-28 p-2 text-right">Tax Amt</th>
                      <th className="w-28 p-2 text-right">Amount</th>
                      <th className="w-20 p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <React.Fragment key={idx}>
                        <tr className="border-b border-gray-150 hover:bg-gray-50/40">
                          <td className="p-2 text-center text-gray-500 font-bold text-xs">{idx + 1}</td>
                          <td className="p-2">
                            <div className="text-xs font-medium">{item.product?.name || '-'}</div>
                            {item.description && <div className="text-[9px] text-gray-400 mt-0.5">{item.description}</div>}
                          </td>
                          <td className="p-2 text-xs text-gray-800" data-label="SKU">{item.product?.sku || '—'}</td>
                          <td className="p-2 text-right text-xs">{item.quantity}</td>
                          <td className="p-2 text-xs capitalize">{item.unit}</td>
                          <td className="p-2 text-right text-xs">₹{Number(item.rate).toFixed(2)}</td>
                          <td className="p-2 text-right text-xs">{item.taxRate}%</td>
                          <td className="p-2 text-right text-xs">₹{(item.quantity * item.rate * item.taxRate / 100).toFixed(2)}</td>
                          <td className="p-2 text-right text-xs font-semibold text-primary-700">₹{(item.quantity * item.rate).toFixed(2)}</td>
                          <td className="p-2 text-center">
                            <div className="flex gap-1 justify-center">
                              <button type="button"
                                onClick={() => { if (editingItem === idx) { setEditingItem(null); setEditingData(null); } else { setEditingItem(idx); setEditingData({ ...item }); } }}
                                className="text-blue-600 hover:text-blue-800 text-xs" title="Edit">✏️</button>
                              <button type="button" onClick={() => removeItem(idx)}
                                className="text-red-600 hover:text-red-800 font-bold text-sm" title="Delete">×</button>
                            </div>
                          </td>
                        </tr>
                        {editingItem === idx && editingData && (
                          <tr className="bg-blue-50 border-t border-blue-200">
                            <td colSpan={10} className="p-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                <div className="md:col-span-2">
                                  <ProductSearch
                                    value={editingData.productId}
                                    onChange={(productId, product) =>
                                      setEditingData({ ...editingData, productId, product, taxRate: product?.category?.gstRate || 0, description: product?.description || '' })
                                    }
                                  />
                                </div>
                                <Input label="Quantity" type="number" min="1" value={editingData.quantity}
                                  onChange={(e) => setEditingData({ ...editingData, quantity: parseInt(e.target.value) || 1 })} />
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unit</label>
                                  <select value={editingData.unit} onChange={(e) => setEditingData({ ...editingData, unit: e.target.value })}
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500">
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
                                placeholder="Product description" />
                              <div className="flex gap-2 mt-3">
                                <Button type="button" className="h-7 text-xs px-3 odoo-btn-primary"
                                  onClick={() => { const updated = [...items]; updated[idx] = editingData; setItems(updated); setEditingItem(null); setEditingData(null); }}>
                                  Save
                                </Button>
                                <Button type="button" variant="outline" className="h-7 text-xs px-3"
                                  onClick={() => { setEditingItem(null); setEditingData(null); }}>
                                  Cancel
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Adjustments Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
            <Input label="Shipping Charge" type="number" step="0.01" min="0" value={formData.shippingCharge}
              onChange={(e) => setFormData({ ...formData, shippingCharge: e.target.value })} placeholder="e.g. 500" />
            <Input label="Discount" type="number" step="0.01" min="0" value={formData.discount}
              onChange={(e) => setFormData({ ...formData, discount: e.target.value })} placeholder="e.g. 100" />
            <Input label="Amount Rounding" type="number" step="0.01" value={formData.adjustment}
              onChange={() => {}} readOnly placeholder="Auto-calculated" />
            <Input label="Amount Received" type="number" step="0.01" min="0" value={formData.amountReceived}
              onChange={(e) => setFormData({ ...formData, amountReceived: e.target.value })} placeholder="e.g. 5000" />
          </div>

          {/* Totals + Notes Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
              <textarea className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" rows={4}
                value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>

            {/* Totals Summary */}
            <div className="bg-green-50 border border-green-200 p-4 rounded space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-gray-900">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Total Tax:</span>
                <span className="font-semibold text-gray-900">+₹{totalTax.toFixed(2)}</span>
              </div>
              {shippingVal > 0 && (
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Shipping Charge:</span>
                  <span className="font-semibold">+₹{shippingVal.toFixed(2)}</span>
                </div>
              )}
              {discountVal > 0 && (
                <div className="flex justify-between text-xs text-red-600">
                  <span>Discount:</span>
                  <span className="font-semibold">-₹{discountVal.toFixed(2)}</span>
                </div>
              )}
              {adjustmentVal !== 0 && (
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Round Off:</span>
                  <span className="font-semibold">{adjustmentVal < 0 ? '+' : '-'}₹{Math.abs(adjustmentVal).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-green-200 pt-2">
                <span className="text-sm font-semibold text-gray-700">Grand Total:</span>
                <span className="text-lg font-bold text-green-700">₹{grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-600 font-medium">
                <span>Amount Received:</span>
                <span>₹{receivedVal.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between text-xs font-bold border-t border-dashed border-green-300 pt-2 ${balanceDue > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                <span>Balance Due:</span>
                <span>₹{balanceDue.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={addCustomerModalOpen}
        onClose={() => { setAddCustomerModalOpen(false); setNewCustomerData({ name: '', email: '', phone: '', address: '', state: '', gstNumber: '' }); setStateSearch(''); setShowStateDropdown(false); }}
        title="Add New Customer"
        size="lg"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const created = await dispatch(createCustomer({
                name: newCustomerData.name, email: newCustomerData.email,
                phone: newCustomerData.phone, address: newCustomerData.address,
                state: newCustomerData.state, gstNumber: newCustomerData.gstNumber,
              })).unwrap();
              toast.success('Customer added successfully');
              await dispatch(fetchCustomers({ limit: 1000 }));
              setFormData((prev) => ({ ...prev, customerId: created.id.toString() }));
              setAddCustomerModalOpen(false);
              setNewCustomerData({ name: '', email: '', phone: '', address: '', state: '', gstNumber: '' });
              setStateSearch(''); setShowStateDropdown(false);
            } catch (error: any) { toast.error(error?.message || 'Failed to add customer'); }
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Input label="Customer Name" placeholder="Enter customer name" value={newCustomerData.name}
              onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })} required />
            <Input label="Email" type="email" placeholder="Enter email address" value={newCustomerData.email}
              onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })} />
            <Input label="Phone" placeholder="Enter phone number" value={newCustomerData.phone}
              onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })} />
            <Input label="Address" placeholder="Enter address" value={newCustomerData.address}
              onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })} />

            {/* Searchable State Dropdown */}
            <div className="relative space-y-1" ref={stateDropdownRef}>
              <label className="block text-xs font-medium text-gray-700">State (Optional)</label>
              <div className="relative">
                <input type="text" placeholder="Search or select Indian state/UT"
                  className="flex h-8.5 w-full rounded border border-gray-300 bg-white pl-3 pr-10 py-1.5 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={stateSearch}
                  onChange={(e) => { setStateSearch(e.target.value); setNewCustomerData({ ...newCustomerData, state: e.target.value }); setShowStateDropdown(true); }}
                  onFocus={() => setShowStateDropdown(true)}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {stateSearch && (
                    <button type="button" onClick={() => { setStateSearch(''); setNewCustomerData({ ...newCustomerData, state: '' }); setShowStateDropdown(true); }} className="text-gray-400 hover:text-gray-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button type="button" onClick={() => setShowStateDropdown(!showStateDropdown)} className="text-gray-400 hover:text-gray-600">
                    <ChevronDown className={cn('h-4 w-4 transition-transform', showStateDropdown && 'rotate-180')} />
                  </button>
                </div>
              </div>
              {showStateDropdown && (
                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded border border-gray-200 bg-white shadow-lg text-xs">
                  {loadingStates ? (
                    <div className="px-4 py-3 text-gray-500">Fetching states...</div>
                  ) : indianStates.filter((s) => s.toLowerCase().includes(stateSearch.toLowerCase())).length > 0 ? (
                    indianStates.filter((s) => s.toLowerCase().includes(stateSearch.toLowerCase())).map((state) => (
                      <button key={state} type="button"
                        className={cn('w-full text-left px-4 py-1.5 hover:bg-primary-50', stateSearch.toLowerCase() === state.toLowerCase() && 'bg-primary-50 font-medium')}
                        onClick={() => { setStateSearch(state); setNewCustomerData({ ...newCustomerData, state }); setShowStateDropdown(false); }}>
                        {state}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-400 italic">No matching states found</div>
                  )}
                </div>
              )}
            </div>

            <Input label="GST Number" placeholder="Enter GST number" value={newCustomerData.gstNumber || ''}
              onChange={(e) => setNewCustomerData({ ...newCustomerData, gstNumber: e.target.value })} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => { setAddCustomerModalOpen(false); setNewCustomerData({ name: '', email: '', phone: '', address: '', state: '', gstNumber: '' }); }}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Add Customer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AddEditSalesOrder;
