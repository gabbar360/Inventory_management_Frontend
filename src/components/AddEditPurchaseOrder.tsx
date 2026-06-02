import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createPurchaseOrder, updatePurchaseOrder } from '@/slices/purchaseOrderSlice';
import { fetchVendors } from '@/slices/vendorSlice';
import { fetchProducts } from '@/slices/productSlice';
import { PurchaseOrder, PurchaseOrderItem, Product } from '@/types';
import Button from '@/components/Button';
import Input from '@/components/Input';
import ProductSearch from '@/components/ProductSearch';

interface AddEditPurchaseOrderProps {
  purchaseOrder?: PurchaseOrder;
  onSuccess: () => void;
  onCancel: () => void;
}

interface POFormData {
  poNo: string;
  vendorId: string;
  poDate: string;
  expectedDeliveryDate: string;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  notes: string;
  reference: string;
  items: PurchaseOrderItem[];
}

const poSchema = z.object({
  poNo: z.string().min(1, 'PO number is required'),
  vendorId: z.string().min(1, 'Vendor is required'),
  poDate: z.string().min(1, 'PO date is required'),
  expectedDeliveryDate: z.string().optional(),
  status: z.enum(['draft', 'sent', 'confirmed', 'received', 'cancelled']),
  notes: z.string().optional(),
  reference: z.string().optional(),
  items: z.array(z.object({
    productId: z.union([z.string(), z.number()]).transform(String),
    quantity: z.union([z.string(), z.number()]).transform(v => typeof v === 'string' ? parseFloat(v) : v).refine(v => v > 0, 'Quantity must be greater than 0'),
    unit: z.string().min(1, 'Unit is required'),
    rate: z.union([z.string(), z.number()]).transform(v => typeof v === 'string' ? parseFloat(v) : v).refine(v => v > 0, 'Rate must be greater than 0'),
    taxRate: z.union([z.string(), z.number()]).transform(v => typeof v === 'string' ? parseFloat(v) : v).refine(v => v >= 0 && v <= 100, 'Tax rate must be between 0 and 100'),
    description: z.string().optional(),
    amount: z.union([z.string(), z.number()]).transform(v => typeof v === 'string' ? parseFloat(v) : v).optional(),
  })).min(1, 'At least one item is required'),
});

const AddEditPurchaseOrder: React.FC<AddEditPurchaseOrderProps> = ({ purchaseOrder, onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const { vendors } = useAppSelector((state) => state.vendors);
  const { products } = useAppSelector((state) => state.products);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<POFormData>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      poNo: '',
      vendorId: '',
      poDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: '',
      status: 'draft',
      notes: '',
      reference: '',
      items: [],
    },
  });

  const formData = watch();
  const [itemForm, setItemForm] = useState({
    productId: '',
    quantity: '',
    unit: '',
    rate: '',
    taxRate: 0,
    description: '',
  });
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    dispatch(fetchVendors());
    dispatch(fetchProducts());
  }, [dispatch]);

  useEffect(() => {
    if (purchaseOrder) {
      const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().split('T')[0];
      };
      setValue('poNo', purchaseOrder.poNo);
      setValue('vendorId', purchaseOrder.vendorId);
      setValue('poDate', formatDate(purchaseOrder.poDate));
      setValue('expectedDeliveryDate', formatDate(purchaseOrder.expectedDeliveryDate || ''));

      setValue('status', purchaseOrder.status);
      setValue('notes', purchaseOrder.notes || '');
      setValue('reference', purchaseOrder.reference || '');
      setValue('items', purchaseOrder.items || []);
    }
  }, [purchaseOrder, setValue]);

  const getProductName = (item: PurchaseOrderItem) => {
    return item.product?.name || products?.find((p) => p.id === item.productId)?.name || 'N/A';
  };

  const handleProductSelect = (productId: string, product?: Product) => {
    const gstRate = product?.category?.gstRate || 0;
    setItemForm({
      ...itemForm,
      productId,
      description: product?.description || '',
      taxRate: gstRate,
    });
  };

  const validateItem = () => {
    const errors: Record<string, string> = {};
    if (!itemForm.productId) errors.productId = 'Product is required';
    if (!itemForm.quantity || parseFloat(itemForm.quantity as any) <= 0) errors.quantity = 'Quantity must be greater than 0';
    if (!itemForm.unit) errors.unit = 'Unit is required';
    if (!itemForm.rate || parseFloat(itemForm.rate as any) <= 0) errors.rate = 'Rate must be greater than 0';
    if (itemForm.taxRate === undefined || itemForm.taxRate === null) errors.taxRate = 'Tax rate is required';
    if (itemForm.taxRate < 0 || itemForm.taxRate > 100) errors.taxRate = 'Tax rate must be between 0 and 100';
    return errors;
  };

  const handleAddItem = () => {
    const errors = validateItem();
    if (Object.keys(errors).length > 0) {
      setItemErrors(errors);
      return;
    }
    setItemErrors({});
    const quantity = parseFloat(itemForm.quantity as any);
    const rate = parseFloat(itemForm.rate as any);
    const amount = quantity * rate;
    
    if (editingItemIndex !== null) {
      const updatedItems = [...formData.items];
      updatedItems[editingItemIndex] = { 
        ...itemForm, 
        quantity,
        rate,
        amount, 
        unit: itemForm.unit || 'piece',
        description: itemForm.description
      };
      setValue('items', updatedItems);
      setEditingItemIndex(null);
      toast.success('Item updated');
    } else {
      setValue('items', [...formData.items, { 
        ...itemForm, 
        quantity,
        rate,
        amount, 
        unit: itemForm.unit || 'piece',
        description: itemForm.description
      }]);
      toast.success('Item added');
    }
    setItemForm({ productId: '', quantity: '', unit: '', rate: '', taxRate: 0, description: '' });
  };

  const handleEditItem = (index: number) => {
    const item = formData.items[index];
    setItemForm({
      productId: item.productId,
      quantity: String(item.quantity),
      unit: item.unit,
      rate: String(item.rate),
      taxRate: item.taxRate,
      description: item.description || '',
    });
    setEditingItemIndex(index);
  };

  const handleRemoveItem = (index: number) => {
    setValue('items', formData.items.filter((_, i) => i !== index));
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
      setItemForm({ productId: '', quantity: '', unit: '', rate: '', taxRate: 0, description: '' });
    }
  };

  const calculateItemTotal = (item: PurchaseOrderItem) => {
    const baseAmount = item.amount || (item.quantity * item.rate);
    const tax = baseAmount * (item.taxRate || 0) / 100;
    return baseAmount + tax;
  };

  const calculateGrandTotal = () => {
    const itemsTotal = formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    return itemsTotal;
  };

  const onSubmit = async (data: POFormData) => {
    try {
      if (!data.items || data.items.length === 0) {
        toast.error('Please add at least one item');
        return;
      }
      
      const totalAmount = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      const payload = { ...data, totalAmount };
      
      if (purchaseOrder) {
        await dispatch(updatePurchaseOrder({ id: purchaseOrder.id, data: payload })).unwrap();
        toast.success('Purchase Order updated');
      } else {
        await dispatch(createPurchaseOrder(payload)).unwrap();
        toast.success('Purchase Order created');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save');
    }
  };

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Odoo style Breadcrumb Navigation & Control Bar */}
      <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="hover:text-primary-600 cursor-pointer" onClick={onCancel}>Purchase Orders</span>
          <span>/</span>
          <span className="font-semibold text-gray-700">{purchaseOrder ? purchaseOrder.poNo : 'New Purchase Order'}</span>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={handleSubmit(onSubmit)} className="odoo-btn-primary px-4 h-8 text-xs font-semibold" loading={isSubmitting}>
            Save
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="odoo-btn-secondary px-4 h-8 text-xs">
            Discard
          </Button>
        </div>
      </div>

      {/* Odoo Sheet Form Card */}
      <div className="odoo-sheet max-w-6xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Row 1: PO No and Vendor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                PO Number
              </label>
              <Input
                placeholder="Enter PO number"
                error={errors.poNo?.message}
                {...register('poNo')}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Vendor
              </label>
              <select
                {...register('vendorId')}
                className={`flex h-8.5 w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.vendorId ? 'border-red-500 focus:ring-red-500' : ''
                }`}
              >
                <option value="">Select a vendor</option>
                {vendors && vendors.length > 0 ? vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                )) : null}
              </select>
              {errors.vendorId?.message && <p className="text-xs text-red-650 mt-1">{errors.vendorId.message}</p>}
            </div>
          </div>

          {/* Row 2: Dates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                PO Date
              </label>
              <Input
                type="date"
                error={errors.poDate?.message}
                {...register('poDate')}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Expected Delivery
              </label>
              <Input
                type="date"
                error={errors.expectedDeliveryDate?.message}
                {...register('expectedDeliveryDate')}
                className="w-full"
              />
            </div>
          </div>

          {/* Row 3: Status and Reference */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Status
              </label>
              <select
                {...register('status')}
                className={`flex h-8.5 w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.status ? 'border-red-500 focus:ring-red-500' : ''
                }`}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="confirmed">Confirmed</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {errors.status?.message && <p className="text-xs text-red-650 mt-1">{errors.status.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reference
              </label>
              <Input
                placeholder="Enter reference"
                error={errors.reference?.message}
                {...register('reference')}
                className="w-full"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              placeholder="Add notes..."
              {...register('notes')}
              className={`flex w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                errors.notes ? 'border-red-500 focus:ring-red-500' : ''
              }`}
              rows={3}
            />
          </div>

          {/* Items Section */}
          <div className="border-t pt-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Items</h2>
            
            <div className="space-y-3 mb-4 p-3 bg-gray-50/50 rounded border border-gray-200">
              <ProductSearch
                value={itemForm.productId}
                onChange={(productId, product) => handleProductSelect(productId, product)}
                error={itemErrors.productId}
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <Input 
                  label="Quantity" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  error={itemErrors.quantity} 
                  value={itemForm.quantity} 
                  onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} 
                />
                <div>
                  <label className="block text-xs font-semibold text-gray-750 mb-1">Unit</label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className={`flex h-8.5 w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                      itemErrors.unit ? 'border-red-500 focus:ring-red-500' : ''
                    }`}
                  >
                    <option value="">Select unit</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Pack">Pack</option>
                    <option value="Box">Box</option>
                  </select>
                  {itemErrors.unit && <p className="text-xs text-red-650 mt-1">{itemErrors.unit}</p>}
                </div>
                <Input 
                  label="Rate" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  error={itemErrors.rate} 
                  value={itemForm.rate} 
                  onChange={(e) => setItemForm({ ...itemForm, rate: e.target.value })} 
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Input 
                  label="Tax Rate %" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  max="100" 
                  error={itemErrors.taxRate} 
                  value={itemForm.taxRate} 
                  onChange={(e) => setItemForm({ ...itemForm, taxRate: parseFloat(e.target.value) })} 
                />
                <Input 
                  label="Description" 
                  value={itemForm.description || ''} 
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} 
                  placeholder="Auto-filled from product" 
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" onClick={handleAddItem} className="odoo-btn-primary px-3 h-8 text-xs font-semibold">
                  {editingItemIndex !== null ? 'Update Item' : 'Add Item'}
                </Button>
                {editingItemIndex !== null && (
                  <Button type="button" variant="outline" className="odoo-btn-secondary px-3 h-8 text-xs bg-red-50 border-red-200 text-red-600 hover:bg-red-100" onClick={() => { setEditingItemIndex(null); setItemForm({ productId: '', quantity: '', unit: '', rate: '', taxRate: 0, description: '' }); }}>
                    Cancel Edit
                  </Button>
                )}
              </div>
              {errors.items && <p className="text-red-500 text-xs mt-1">{errors.items.message}</p>}
            </div>

            {/* Items Table */}
            {formData.items.length > 0 && (
              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold text-gray-600">Product</th>
                      <th className="px-3 py-1.5 text-right font-semibold text-gray-600">Qty</th>
                      <th className="px-3 py-1.5 text-right font-semibold text-gray-600">Rate</th>
                      <th className="px-3 py-1.5 text-right font-semibold text-gray-600">Tax %</th>
                      <th className="px-3 py-1.5 text-right font-semibold text-gray-600">Amount</th>
                      <th className="px-3 py-1.5 text-center font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => (
                      <tr key={idx} className={`border-b border-gray-150 last:border-b-0 ${editingItemIndex === idx ? 'bg-primary-50/50' : ''}`}>
                        <td className="px-3 py-1 font-medium">{getProductName(item)}</td>
                        <td className="px-3 py-1 text-right">{item.quantity} {item.unit}</td>
                        <td className="px-3 py-1 text-right">₹{item.rate.toFixed(2)}</td>
                        <td className="px-3 py-1 text-right">{item.taxRate}%</td>
                        <td className="px-3 py-1 text-right font-semibold">₹{calculateItemTotal(item).toFixed(2)}</td>
                        <td className="px-3 py-1 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button type="button" size="sm" variant="ghost" onClick={() => handleEditItem(idx)} title="Edit" className="h-7 w-7 p-0">
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveItem(idx)} title="Delete" className="h-7 w-7 p-0">
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 bg-gray-50/50 border-t border-gray-200 space-y-1 text-xs font-semibold">
                  <div className="flex justify-end gap-6 text-gray-600">
                    <span>Subtotal:</span>
                    <span className="w-24 text-right">₹{formData.items.reduce((sum, item) => sum + (item.amount || item.quantity * item.rate), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end gap-6 text-gray-600">
                    <span>Tax:</span>
                    <span className="w-24 text-right">₹{formData.items.reduce((sum, item) => sum + calculateItemTotal(item) - (item.amount || item.quantity * item.rate), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end gap-6 text-sm text-primary-900 border-t pt-1 mt-1 font-bold">
                    <span>Grand Total:</span>
                    <span className="w-24 text-right text-primary-650">₹{calculateGrandTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditPurchaseOrder;
