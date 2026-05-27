import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPurchaseOrders, fetchPurchaseOrderById, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, downloadPurchaseOrderPDF } from '@/slices/purchaseOrderSlice';
import { fetchVendors } from '@/slices/vendorSlice';
import { fetchProducts } from '@/slices/productSlice';
import PageHeader from '@/components/PageHeader';
import Table from '@/components/Table';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import Select from '@/components/Select';
import ConfirmModal from '@/components/ConfirmModal';
import { Download, Plus, Edit2, Trash2, Eye } from 'lucide-react';
import Pagination from '@/components/Pagination';
import toast from 'react-hot-toast';
import { PurchaseOrder, PurchaseOrderItem, Product } from '@/types';
import ProductSearch from '@/components/ProductSearch';

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
    productId: z.string().min(1, 'Product is required'),
    quantity: z.coerce.number().min(1, 'Quantity must be greater than 0'),
    unit: z.string().min(1, 'Unit is required'),
    rate: z.coerce.number().min(0.01, 'Rate must be greater than 0'),
    taxRate: z.coerce.number().min(0, 'Tax rate is required').max(100, 'Tax rate must be between 0 and 100'),
    description: z.string().optional(),
    amount: z.coerce.number().optional(),
  })).min(1, 'At least one item is required'),
});

const PurchaseOrders: React.FC = () => {
  const dispatch = useAppDispatch();
  const { orders, loading, pagination } = useAppSelector((state) => state.purchaseOrders);
  const { vendors } = useAppSelector((state) => state.vendors);
  const { products } = useAppSelector((state) => state.products);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const {
    register,
    handleSubmit,
    reset,
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
    quantity: 0,
    unit: '',
    rate: 0,
    taxRate: 0,
    description: '',
  });

  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    dispatch(fetchPurchaseOrders({ page, search }));
  }, [dispatch, page, search]);

  useEffect(() => {
    dispatch(fetchVendors());
    dispatch(fetchProducts());
  }, [dispatch]);

  const getProductName = (item: PurchaseOrderItem) => {
    return item.product?.name || products?.find((p) => p.id === item.productId)?.name || 'N/A';
  };

  const getProductDescription = (productId: string) => {
    return products?.find((p) => p.id === productId)?.description || '';
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
    if (!itemForm.quantity || itemForm.quantity <= 0) errors.quantity = 'Quantity must be greater than 0';
    if (!itemForm.unit) errors.unit = 'Unit is required';
    if (!itemForm.rate || itemForm.rate <= 0) errors.rate = 'Rate must be greater than 0';
    if (itemForm.taxRate === undefined || itemForm.taxRate === null || itemForm.taxRate === '') errors.taxRate = 'Tax rate is required';
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
    const amount = itemForm.quantity * itemForm.rate;
    
    if (editingItemIndex !== null) {
      const updatedItems = [...formData.items];
      updatedItems[editingItemIndex] = { 
        ...itemForm, 
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
        amount, 
        unit: itemForm.unit || 'piece',
        description: itemForm.description
      }]);
      toast.success('Item added');
    }
    setItemForm({ productId: '', quantity: 0, unit: '', rate: 0, taxRate: 0, description: '' });
  };

  const handleEditItem = (index: number) => {
    const item = formData.items[index];
    const description = item.description || item.product?.description || getProductDescription(item.productId);
    setItemForm({
      productId: item.productId,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      taxRate: item.taxRate,
      description,
    });
    setEditingItemIndex(index);
  };

  const handleRemoveItem = (index: number) => {
    setValue('items', formData.items.filter((_, i) => i !== index));
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
      setItemForm({ productId: '', quantity: 0, unit: '', rate: 0, taxRate: 0, description: '' });
    }
  };

  const onSubmit = async (data: POFormData) => {
    try {
      const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);
      const payload = { ...data, totalAmount };
      
      if (editingId) {
        await dispatch(updatePurchaseOrder({ id: editingId, data: payload })).unwrap();
        toast.success('Purchase Order updated');
      } else {
        await dispatch(createPurchaseOrder(payload)).unwrap();
        toast.success('Purchase Order created');
      }
      closeModal();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save');
    }
  };

  const handleEdit = async (order: PurchaseOrder) => {
    try {
      const fullOrder = await dispatch(fetchPurchaseOrderById(order.id)).unwrap();
      const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().split('T')[0];
      };
      setValue('poNo', fullOrder.poNo);
      setValue('vendorId', fullOrder.vendorId);
      setValue('poDate', formatDate(fullOrder.poDate));
      setValue('expectedDeliveryDate', formatDate(fullOrder.expectedDelivery || fullOrder.expectedDeliveryDate));
      setValue('status', fullOrder.status);
      setValue('notes', fullOrder.notes || '');
      setValue('reference', fullOrder.reference || '');
      setValue('items', fullOrder.items || []);
      setEditingId(fullOrder.id);
      setIsModalOpen(true);
    } catch (error: any) {
      toast.error('Failed to load purchase order details');
    }
  };

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

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setEditingItemIndex(null);
    setItemForm({ productId: '', quantity: 0, unit: '', rate: 0, taxRate: 0, description: '' });
    setItemErrors({});
    reset();
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
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)} title="Edit">
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Purchase Orders"
        searchPlaceholder="Search PO..."
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        actions={[
          {
            label: 'New PO',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => { closeModal(); setIsModalOpen(true); },
            variant: 'primary' as const,
          },
        ]}
      />

      <div className="card overflow-hidden">
        <Table columns={columns} data={orders} loading={loading} pagination={pagination} onPageChange={setPage} />
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Edit Purchase Order' : 'Add Purchase Order'} size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="PO No" placeholder="Enter PO number" error={errors.poNo?.message} {...register('poNo')} />
            <Select label="Vendor" placeholder="Select a vendor" error={errors.vendorId?.message} {...register('vendorId')} options={vendors && vendors.length > 0 ? vendors.map((v) => ({ value: v.id, label: v.name })) : []} />
            <Input label="PO Date" type="date" error={errors.poDate?.message} {...register('poDate')} />
            <Input label="Expected Delivery" type="date" error={errors.expectedDeliveryDate?.message} {...register('expectedDeliveryDate')} />
            <Select label="Status" error={errors.status?.message} {...register('status')} options={[{ value: 'draft', label: 'Draft' }, { value: 'sent', label: 'Sent' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'received', label: 'Received' }, { value: 'cancelled', label: 'Cancelled' }]} />
            <Input label="Reference" placeholder="Enter reference" error={errors.reference?.message} {...register('reference')} />
          </div>

          <Input label="Notes" placeholder="Add notes..." error={errors.notes?.message} {...register('notes')} />

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Items</h3>
            <div className="space-y-3 mb-4">
              <ProductSearch
                value={itemForm.productId}
                onChange={(productId, product) => handleProductSelect(productId, product)}
                error={itemErrors.productId}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input label="Quantity" type="number" step="0.01" min="0" error={itemErrors.quantity} value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: parseFloat(e.target.value) })} />
                <Select label="Unit" error={itemErrors.unit} value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} options={[{ value: 'Pcs', label: 'Pcs' }, { value: 'Pack', label: 'Pack' }, { value: 'Box', label: 'Box' }]} />
                <Input label="Rate" type="number" step="0.01" min="0" error={itemErrors.rate} value={itemForm.rate} onChange={(e) => setItemForm({ ...itemForm, rate: parseFloat(e.target.value) })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tax Rate %" type="number" step="0.01" min="0" max="100" error={itemErrors.taxRate} value={itemForm.taxRate} onChange={(e) => setItemForm({ ...itemForm, taxRate: parseFloat(e.target.value) })} />
                <Input label="Description" value={itemForm.description || ''} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Auto-filled from product" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="primary" onClick={handleAddItem}>{editingItemIndex !== null ? 'Update Item' : 'Add Item'}</Button>
                {editingItemIndex !== null && (
                  <Button type="button" variant="outline" className="bg-red-50 border-red-200 text-red-600 hover:bg-red-100" onClick={() => { setEditingItemIndex(null); setItemForm({ productId: '', quantity: 0, unit: '', rate: 0, taxRate: 0, description: '' }); }}>Cancel Edit</Button>
                )}
              </div>
              {errors.items && <p className="text-red-500 text-sm">{errors.items.message}</p>}
            </div>

            {formData.items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Tax %</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => (
                      <tr key={idx} className={`border-b ${editingItemIndex === idx ? 'bg-blue-50' : ''}`}>
                        <td className="px-3 py-2 font-medium">{getProductName(item)}</td>
                        <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                        <td className="px-3 py-2 text-right">₹{item.rate.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{item.taxRate}%</td>
                        <td className="px-3 py-2 text-right font-semibold">₹{calculateItemTotal(item).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button type="button" size="sm" variant="ghost" onClick={() => handleEditItem(idx)} title="Edit">
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveItem(idx)} title="Delete">
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 space-y-2 text-sm font-semibold">
                  <div className="flex justify-end gap-4">
                    <span>Subtotal:</span>
                    <span>₹{formData.items.reduce((sum, item) => sum + (item.amount || item.quantity * item.rate), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end gap-4">
                    <span>Tax:</span>
                    <span>₹{formData.items.reduce((sum, item) => sum + calculateItemTotal(item) - (item.amount || item.quantity * item.rate), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end gap-4 text-lg text-blue-600 border-t pt-2">
                    <span>Grand Total:</span>
                    <span>₹{calculateGrandTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>{editingId ? 'Edit PO' : 'Add PO'}</Button>
          </div>
        </form>
      </Modal>

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
                <p className="font-semibold">{selectedOrder.expectedDelivery ? new Date(selectedOrder.expectedDelivery).toLocaleDateString() : selectedOrder.expectedDeliveryDate ? new Date(selectedOrder.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</p>
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
                      const description = item.description || item.product?.description || '';
                      return (
                        <tr key={idx} className="border-b">
                          <td className="px-3 py-2">
                            <div className="font-medium">{getProductName(item)}</div>
                            {description && (
                              <div className="text-xs text-gray-600 mt-1">{description}</div>
                            )}
                          </td>
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
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PurchaseOrders;
