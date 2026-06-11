import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ChevronDown, ChevronRight, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createPurchaseOrder, updatePurchaseOrder } from '@/slices/purchaseOrderSlice';
import { fetchVendors, createVendor } from '@/slices/vendorSlice';
import { fetchProducts } from '@/slices/productSlice';
import { PurchaseOrder } from '@/types';
import { formatCurrency } from '@/utils';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Modal from '@/components/Modal';
import ProductSearch from '@/components/ProductSearch';

interface POItem {
  productId: string;
  boxes: number;
  packPerBox: number;
  packPerPiece: number;
  unit: 'box' | 'pack' | 'piece';
  ratePerBox: number;
  product?: any;
  batchCode?: string;
  mfgDate?: string;
  color?: string;
  brand?: string;
  subItems?: {
    boxes: number;
    packPerBox: number;
    packPerPiece: number;
    unit: 'box' | 'pack' | 'piece';
    ratePerBox: number;
    batchCode?: string;
    mfgDate?: string;
    color?: string;
    brand?: string;
  }[];
}

interface PurchaseOrderFormData {
  poNo: string;
  poDate: string;
  expectedDeliveryDate?: string;
  vendorId: string;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  notes?: string;
  reference?: string;
  items: POItem[];
}

const poSchema = z.object({
  poNo: z.string().min(1, 'PO number is required'),
  poDate: z.string().min(1, 'PO date is required'),
  expectedDeliveryDate: z.string().optional(),
  vendorId: z.union([z.string(), z.number()]).pipe(z.coerce.string().min(1, 'Vendor is required')),
  status: z.enum(['draft', 'sent', 'confirmed', 'received', 'cancelled']),
  notes: z.string().optional(),
  reference: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.union([z.string(), z.number()]).pipe(z.coerce.string().min(1, 'Product is required')),
        boxes: z.number().min(1, 'Boxes must be at least 1'),
        packPerBox: z.number().min(1, 'Pack per box must be at least 1'),
        packPerPiece: z.number().min(1, 'Pack per piece must be at least 1'),
        unit: z.enum(['box', 'pack', 'piece']).default('box'),
        ratePerBox: z.number().min(0, 'Rate must be positive'),
        batchCode: z.string().optional(),
        mfgDate: z.string().optional(),
        color: z.string().optional(),
        brand: z.string().optional(),
        subItems: z.array(
          z.object({
            boxes: z.number().min(1, 'Boxes must be at least 1'),
            packPerBox: z.number().min(1, 'Pack per box must be at least 1'),
            packPerPiece: z.number().min(1, 'Pack per piece must be at least 1'),
            unit: z.enum(['box', 'pack', 'piece']).default('box'),
            ratePerBox: z.number().min(0, 'Rate must be positive'),
            batchCode: z.string().optional(),
            mfgDate: z.string().optional(),
            color: z.string().optional(),
            brand: z.string().optional(),
          })
        ).optional(),
      })
    )
    .min(1, 'At least one item is required'),
});

interface AddEditPurchaseOrderProps {
  purchaseOrder?: PurchaseOrder;
  onSuccess: () => void;
  onCancel: () => void;
}

const AddEditPurchaseOrder: React.FC<AddEditPurchaseOrderProps> = ({ purchaseOrder, onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const { vendors } = useAppSelector((state) => state.vendors);
  const { products } = useAppSelector((state) => state.products);

  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [addVendorModalOpen, setAddVendorModalOpen] = useState(false);
  const [newVendorData, setNewVendorData] = useState({ name: '', email: '', phone: '', address: '' });
  const vendorDropdownRef = useRef<HTMLDivElement>(null);

  // Items State (like Inward)
  const [items, setItems] = useState<POItem[]>([]);
  const [newItem, setNewItem] = useState<POItem>({
    productId: '',
    boxes: 1,
    packPerBox: 1,
    packPerPiece: 1,
    unit: 'box',
    ratePerBox: 0,
    subItems: [],
    batchCode: '',
    mfgDate: '',
    color: '',
    brand: '',
  });
  const [showNewSubItems, setShowNewSubItems] = useState(false);

  // Item Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<POItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      poNo: '',
      poDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: '',
      vendorId: '',
      status: 'draft',
      notes: '',
      reference: '',
      items: [],
    },
  });

  useEffect(() => {
    dispatch(fetchProducts({ limit: 1000 }));
    dispatch(fetchVendors({ limit: 100 }));
  }, [dispatch]);

  // Click outside vendor searchable select dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(e.target as Node)) {
        setShowVendorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync local items with react-hook-form
  useEffect(() => {
    setValue('items', items, { shouldValidate: true });
  }, [items, setValue]);

  // Populate data when purchaseOrder changes (Edit mode)
  useEffect(() => {
    if (purchaseOrder && vendors.length > 0) {
      const selectedVendor = vendors.find((v: any) => v.id === purchaseOrder.vendorId || String(v.id) === String(purchaseOrder.vendorId));
      if (selectedVendor) setVendorSearch(`${(selectedVendor as any).code} - ${(selectedVendor as any).name}`);

      reset({
        poNo: purchaseOrder.poNo,
        poDate: purchaseOrder.poDate.split('T')[0],
        expectedDeliveryDate: purchaseOrder.expectedDeliveryDate ? purchaseOrder.expectedDeliveryDate.split('T')[0] : '',
        vendorId: String(purchaseOrder.vendorId),
        status: purchaseOrder.status,
        notes: purchaseOrder.notes || '',
        reference: purchaseOrder.reference || '',
      });

      const mappedItems = purchaseOrder.items?.map((item) => {
        let actualRate = item.ratePerBox || item.rate;
        if (item.unit === 'pack') {
          actualRate = item.ratePerPack || item.rate;
        } else if (item.unit === 'piece') {
          actualRate = item.ratePerPcs || item.rate;
        }

        return {
          productId: String(item.productId),
          boxes: item.boxes || 1,
          packPerBox: item.packPerBox || 1,
          packPerPiece: item.packPerPiece || 1,
          unit: (item.unit || 'box') as 'box' | 'pack' | 'piece',
          ratePerBox: actualRate,
          product: item.product,
          batchCode: item.batchCode || '',
          mfgDate: item.mfgDate ? item.mfgDate.split('T')[0] : '',
          color: item.color || '',
          brand: item.brand || '',
          subItems: item.subItems?.map((subItem) => {
            let subActualRate = subItem.ratePerBox || subItem.rate;
            if (subItem.unit === 'pack') {
              subActualRate = subItem.ratePerPack || subItem.rate;
            } else if (subItem.unit === 'piece') {
              subActualRate = subItem.ratePerPcs || subItem.rate;
            }
            return {
              boxes: subItem.boxes || 1,
              packPerBox: subItem.packPerBox || 1,
              packPerPiece: subItem.packPerPiece || 1,
              unit: (subItem.unit || 'box') as 'box' | 'pack' | 'piece',
              ratePerBox: subActualRate,
              batchCode: subItem.batchCode || '',
              mfgDate: subItem.mfgDate ? subItem.mfgDate.split('T')[0] : '',
              color: subItem.color || '',
              brand: subItem.brand || '',
            };
          }) || [],
        };
      }) || [];
      setItems(mappedItems);
    } else if (!purchaseOrder) {
      reset({
        poNo: '',
        poDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '',
        vendorId: '',
        status: 'draft',
        notes: '',
        reference: '',
      });
      setItems([]);
    }
  }, [purchaseOrder, vendors, reset]);

  // Calculations
  const calculateItemTotal = (item: POItem) => {
    const product = products.find((p) => String(p.id) === String(item.productId));
    if (!product || !item.boxes || !item.ratePerBox) return 0;

    const totalPacks = item.boxes * item.packPerBox;
    const totalPcs = totalPacks * item.packPerPiece;
    const unit = item.unit || 'box';

    let baseAmount = 0;
    if (unit === 'box') {
      baseAmount = item.boxes * item.ratePerBox;
    } else if (unit === 'pack') {
      baseAmount = totalPacks * item.ratePerBox;
    } else {
      baseAmount = totalPcs * item.ratePerBox;
    }

    const gstRate = product.category?.gstRate || 0;
    const gstAmount = (baseAmount * gstRate) / 100;
    let total = baseAmount + gstAmount;

    // Add sub-items total
    if (item.subItems && item.subItems.length > 0) {
      item.subItems.forEach((subItem) => {
        const subTotalPacks = subItem.boxes * subItem.packPerBox;
        const subTotalPcs = subTotalPacks * subItem.packPerPiece;
        const subUnit = subItem.unit || 'box';

        let subBaseAmount = 0;
        if (subUnit === 'box') {
          subBaseAmount = subItem.boxes * subItem.ratePerBox;
        } else if (subUnit === 'pack') {
          subBaseAmount = subTotalPacks * subItem.ratePerBox;
        } else {
          subBaseAmount = subTotalPcs * subItem.ratePerBox;
        }

        const subGstAmount = (subBaseAmount * gstRate) / 100;
        total += subBaseAmount + subGstAmount;
      });
    }

    return total;
  };

  const calculateGrandTotal = () => {
    return items.reduce((total, item) => total + calculateItemTotal(item), 0);
  };

  const getPreviewDetails = (item: POItem) => {
    const product = products.find((p) => String(p.id) === String(item.productId));
    const gstRate = product?.category?.gstRate || 0;
    
    const boxes = Number(item.boxes) || 0;
    const packPerBox = Number(item.packPerBox) || 0;
    const packPerPiece = Number(item.packPerPiece) || 0;
    const rate = Number(item.ratePerBox) || 0;
    const unit = item.unit || 'box';

    const totalPacks = boxes * packPerBox;
    const totalPcs = totalPacks * packPerPiece;

    let ratePerPack = 0;
    let ratePerPcs = 0;
    let baseAmount = 0;

    if (unit === 'box') {
      ratePerPack = packPerBox > 0 ? rate / packPerBox : 0;
      ratePerPcs = (packPerBox > 0 && packPerPiece > 0) ? rate / (packPerBox * packPerPiece) : 0;
      baseAmount = boxes * rate;
    } else if (unit === 'pack') {
      ratePerPack = rate;
      ratePerPcs = packPerPiece > 0 ? rate / packPerPiece : 0;
      baseAmount = totalPacks * rate;
    } else {
      ratePerPcs = rate;
      ratePerPack = rate * packPerPiece;
      baseAmount = totalPcs * rate;
    }

    const gstAmount = (baseAmount * gstRate) / 100;
    const totalAmount = baseAmount + gstAmount;

    // Add sub-items total if any
    let totalSubAmount = 0;
    let totalSubBase = 0;
    let totalSubGst = 0;
    if (item.subItems && item.subItems.length > 0) {
      item.subItems.forEach((sub) => {
        const subBoxes = Number(sub.boxes) || 0;
        const subPackPerBox = Number(sub.packPerBox) || 0;
        const subPackPerPiece = Number(sub.packPerPiece) || 0;
        const subRate = Number(sub.ratePerBox) || 0;
        const subUnit = sub.unit || 'box';

        const subPacks = subBoxes * subPackPerBox;
        const subPcs = subPacks * subPackPerPiece;

        let subBase = 0;
        if (subUnit === 'box') {
          subBase = subBoxes * subRate;
        } else if (subUnit === 'pack') {
          subBase = subPacks * subRate;
        } else {
          subBase = subPcs * subRate;
        }

        const subGst = (subBase * gstRate) / 100;
        totalSubBase += subBase;
        totalSubGst += subGst;
        totalSubAmount += subBase + subGst;
      });
    }

    return {
      totalPacks,
      totalPcs,
      ratePerPack,
      ratePerPcs,
      baseAmount: baseAmount + totalSubBase,
      gstAmount: gstAmount + totalSubGst,
      totalAmount: totalAmount + totalSubAmount,
      gstRate,
    };
  };

  // Add Item to Table
  const handleAddItem = () => {
    if (!newItem.productId) {
      toast.error('Please select a product');
      return;
    }
    if (!newItem.boxes || newItem.boxes <= 0) {
      toast.error('Boxes must be greater than 0');
      return;
    }
    if (!newItem.packPerBox || newItem.packPerBox <= 0) {
      toast.error('Packs per Box must be greater than 0');
      return;
    }
    if (!newItem.packPerPiece || newItem.packPerPiece <= 0) {
      toast.error('Pcs per Pack must be greater than 0');
      return;
    }
    if (!newItem.ratePerBox || newItem.ratePerBox < 0) {
      toast.error('Rate must be positive');
      return;
    }

    const selectedProduct = products.find((p) => String(p.id) === String(newItem.productId));

    setItems([...items, { ...newItem, product: selectedProduct }]);
    setNewItem({
      productId: '',
      boxes: 1,
      packPerBox: 1,
      packPerPiece: 1,
      unit: 'box',
      ratePerBox: 0,
      subItems: [],
      batchCode: '',
      mfgDate: '',
      color: '',
      brand: '',
    });
    setShowNewSubItems(false);
    toast.success('Item added to line');
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    toast.success('Item removed');
  };

  // Save edited row
  const handleSaveEdit = (index: number) => {
    if (!editingData) return;
    if (!editingData.boxes || editingData.boxes <= 0) {
      toast.error('Boxes must be greater than 0');
      return;
    }
    if (!editingData.packPerBox || editingData.packPerBox <= 0) {
      toast.error('Packs per Box must be greater than 0');
      return;
    }
    if (!editingData.packPerPiece || editingData.packPerPiece <= 0) {
      toast.error('Pcs per Pack must be greater than 0');
      return;
    }
    if (editingData.ratePerBox === undefined || editingData.ratePerBox < 0) {
      toast.error('Rate must be positive');
      return;
    }

    const selectedProduct = products.find((p) => String(p.id) === String(editingData.productId));
    const updatedItems = [...items];
    updatedItems[index] = {
      ...editingData,
      product: selectedProduct,
    };

    setItems(updatedItems);
    setEditingIndex(null);
    setEditingData(null);
  };

  // Submit purchase order
  const onSubmit = async (data: PurchaseOrderFormData) => {
    try {
      if (purchaseOrder) {
        await dispatch(updatePurchaseOrder({ id: purchaseOrder.id.toString(), data })).unwrap();
        toast.success('Purchase order updated successfully');
      } else {
        await dispatch(createPurchaseOrder(data)).unwrap();
        toast.success('Purchase order created successfully');
      }
      onSuccess();
    } catch (error) {
      // Error handled by Redux
    }
  };

  const toggleSubItemsCollapse = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Create vendor handler
  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorData.name) {
      toast.error('Vendor name is required');
      return;
    }
    try {
      const res = await dispatch(createVendor(newVendorData)).unwrap();
      if (res) {
        toast.success('Vendor created successfully');
        setValue('vendorId', String(res.id));
        setVendorSearch(`${res.code} - ${res.name}`);
        setAddVendorModalOpen(false);
        setNewVendorData({ name: '', email: '', phone: '', address: '' });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create vendor');
    }
  };

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Control Bar (Odoo Style) */}
      <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="hover:text-primary-600 cursor-pointer" onClick={onCancel}>Purchase Orders</span>
          <span>/</span>
          <span className="font-semibold text-gray-700">{purchaseOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}</span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            className="odoo-btn-primary px-4 h-8 text-xs font-semibold"
            loading={isSubmitting}
          >
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="odoo-btn-secondary px-4 h-8 text-xs"
          >
            Discard
          </Button>
        </div>
      </div>

      {/* Main Form Sheet */}
      <div className="bg-white border border-gray-200 rounded shadow-md p-4 sm:p-5 max-w-5xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="PO Number"
              error={errors.poNo?.message}
              {...register('poNo')}
            />
            <Input
              label="PO Date"
              type="date"
              error={errors.poDate?.message}
              {...register('poDate')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Searchable Vendor Dropdown */}
            <div className="relative" ref={vendorDropdownRef}>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Vendor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Search vendor..."
                value={vendorSearch}
                onChange={(e) => {
                  setVendorSearch(e.target.value);
                  setValue('vendorId', '');
                  setShowVendorDropdown(true);
                }}
                onFocus={() => setShowVendorDropdown(true)}
                className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-sm outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                autoComplete="off"
              />
              <input type="text" required value={control._formValues.vendorId || ''} onChange={() => {}} className="sr-only" tabIndex={-1} />
              {errors.vendorId && <p className="mt-1 text-[10px] text-red-600">{errors.vendorId.message}</p>}
              
              {showVendorDropdown && (
                <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto mt-1">
                  {vendors
                    .filter((v: any) => `${v.code} ${v.name}`.toLowerCase().includes(vendorSearch.toLowerCase()))
                    .map((v: any) => (
                      <li
                        key={v.id}
                        onMouseDown={() => {
                          setValue('vendorId', String(v.id));
                          setVendorSearch(`${v.code} - ${v.name}`);
                          setShowVendorDropdown(false);
                        }}
                        className="px-3 py-1.5 cursor-pointer hover:bg-blue-50 text-xs"
                      >
                        {v.code} - {v.name}
                      </li>
                    ))}
                  {vendors.filter((v: any) => `${v.code} ${v.name}`.toLowerCase().includes(vendorSearch.toLowerCase())).length === 0 && (
                    <li className="px-3 py-1.5 text-xs text-gray-400">No vendors found</li>
                  )}
                  <li className="border-t border-gray-200 px-3 py-1.5 sticky bottom-0 bg-gray-50">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setAddVendorModalOpen(true);
                        setShowVendorDropdown(false);
                      }}
                      className="w-full text-left text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add New Vendor
                    </button>
                  </li>
                </ul>
              )}
            </div>

            <Input
              label="Expected Delivery Date"
              type="date"
              error={errors.expectedDeliveryDate?.message}
              {...register('expectedDeliveryDate')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Status"
              error={errors.status?.message}
              {...register('status')}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="confirmed">Confirmed</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </Select>

            <Input
              label="Reference"
              error={errors.reference?.message}
              {...register('reference')}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              placeholder="Add PO notes..."
              {...register('notes')}
              className={`flex w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                errors.notes ? 'border-red-500 focus:ring-red-500' : ''
              }`}
              rows={3}
            />
          </div>

          {/* Item Lines Section Header */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-gray-800">PO Items & Lines</h3>
            </div>

            {/* Input Section for New Items */}
            <div className="bg-gray-50 border border-gray-200 p-3 rounded space-y-3 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ProductSearch
                  value={newItem.productId}
                  onChange={(productId) => {
                    const selected = products.find((p) => String(p.id) === String(productId));
                    setNewItem({
                      ...newItem,
                      productId: productId,
                      packPerBox: 1,
                      packPerPiece: 1,
                      color: selected?.color || '',
                      brand: selected?.brand || '',
                    });
                  }}
                />

                <Input
                  type="number"
                  label="Boxes *"
                  value={newItem.boxes || ''}
                  onChange={(e) => setNewItem({ ...newItem, boxes: Number(e.target.value) || 0 })}
                  min="1"
                />

                <Input
                  type="number"
                  label="Pack/Box *"
                  value={newItem.packPerBox || ''}
                  onChange={(e) => setNewItem({ ...newItem, packPerBox: Number(e.target.value) || 0 })}
                  min="1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  type="number"
                  label="Pcs/Pack *"
                  value={newItem.packPerPiece || ''}
                  onChange={(e) => setNewItem({ ...newItem, packPerPiece: Number(e.target.value) || 0 })}
                  min="1"
                />

                <Select
                  label="Unit *"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value as any })}
                >
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                  <option value="piece">Piece</option>
                </Select>

                <Input
                  type="number"
                  label="Rate *"
                  value={newItem.ratePerBox || ''}
                  onChange={(e) => setNewItem({ ...newItem, ratePerBox: Number(e.target.value) || 0 })}
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Batch Code"
                  value={newItem.batchCode || ''}
                  onChange={(e) => setNewItem({ ...newItem, batchCode: e.target.value })}
                  placeholder="Enter batch code"
                />

                <Input
                  type="date"
                  label="MFG Date"
                  value={newItem.mfgDate || ''}
                  onChange={(e) => setNewItem({ ...newItem, mfgDate: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Color"
                  value={newItem.color || ''}
                  onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                  placeholder="Enter color"
                />

                <Input
                  label="Brand"
                  value={newItem.brand || ''}
                  onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
                  placeholder="Enter brand"
                />
              </div>

              {/* Calculations Preview for New Item */}
              {newItem.productId && (
                (() => {
                  const prev = getPreviewDetails(newItem);
                  return (
                    <div className="bg-white border border-gray-200 rounded p-2.5 text-[10px] grid grid-cols-2 md:grid-cols-4 gap-2 text-gray-600 shadow-sm leading-tight">
                      <div><span className="font-bold text-gray-500">Total Packs:</span> {prev.totalPacks}</div>
                      <div><span className="font-bold text-gray-500">Total PCS:</span> {prev.totalPcs}</div>
                      <div><span className="font-bold text-gray-500">Rate/Pack:</span> {formatCurrency(prev.ratePerPack)}</div>
                      <div><span className="font-bold text-gray-500">Rate/PCS:</span> {formatCurrency(prev.ratePerPcs)}</div>
                      <div><span className="font-bold text-gray-500">Base Amount:</span> {formatCurrency(prev.baseAmount)}</div>
                      <div><span className="font-bold text-gray-500">GST ({prev.gstRate}%):</span> {formatCurrency(prev.gstAmount)}</div>
                      <div className="col-span-2 md:col-span-1 font-bold text-primary-700"><span className="text-gray-500">Total Amount:</span> {formatCurrency(prev.totalAmount)}</div>
                    </div>
                  );
                })()
              )}

              {/* Sub items layout in add section */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSubItems(!showNewSubItems)}
                  className="text-xs text-primary-700 hover:text-primary-800 font-semibold flex items-center gap-1"
                >
                  {showNewSubItems ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span>Split Sub Items ({newItem.subItems?.length || 0})</span>
                </button>

                {showNewSubItems && (
                  <div className="mt-2 border-t border-gray-200 pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Sub Item Split Lines</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currentSubItems = newItem.subItems || [];
                          setNewItem({
                            ...newItem,
                            subItems: [
                              ...currentSubItems,
                              {
                                boxes: 1,
                                packPerBox: 1,
                                packPerPiece: 1,
                                unit: 'box',
                                ratePerBox: 0,
                                color: newItem.color || '',
                                brand: newItem.brand || '',
                              },
                            ],
                          });
                        }}
                        className="odoo-btn-secondary h-6 text-[10px] px-2"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Sub Line
                      </Button>
                    </div>

                    {newItem.subItems && newItem.subItems.length > 0 ? (
                      <div className="overflow-x-auto border border-gray-200 rounded bg-white">
                        <table className="min-w-full divide-y divide-gray-150 text-[10px]">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500 font-bold">
                              <th className="p-1 w-8 text-center">#</th>
                              <th className="p-1 w-16 text-center">Boxes</th>
                              <th className="p-1 w-16 text-center">Pack/Box</th>
                              <th className="p-1 w-16 text-center">Pcs/Pack</th>
                              <th className="p-1 w-20">Unit</th>
                              <th className="p-1 w-20">Rate</th>
                              <th className="p-1 w-24">Color</th>
                              <th className="p-1 w-24">Brand</th>
                              <th className="p-1 text-center w-8">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {newItem.subItems.map((sub, sIdx) => (
                              <tr key={sIdx}>
                                <td className="p-1 text-center font-bold text-gray-400">{sIdx + 1}</td>
                                <td className="p-1">
                                  <input
                                    type="number"
                                    min="1"
                                    className="w-full text-center border border-gray-300 rounded p-0.5"
                                    value={sub.boxes}
                                    onChange={(e) => {
                                      const updated = [...(newItem.subItems || [])];
                                      updated[sIdx] = { ...updated[sIdx], boxes: Number(e.target.value) || 0 };
                                      setNewItem({ ...newItem, subItems: updated });
                                    }}
                                  />
                                </td>
                                <td className="p-1">
                                  <input
                                    type="number"
                                    min="1"
                                    className="w-full text-center border border-gray-300 rounded p-0.5"
                                    value={sub.packPerBox}
                                    onChange={(e) => {
                                      const updated = [...(newItem.subItems || [])];
                                      updated[sIdx] = { ...updated[sIdx], packPerBox: Number(e.target.value) || 0 };
                                      setNewItem({ ...newItem, subItems: updated });
                                    }}
                                  />
                                </td>
                                <td className="p-1">
                                  <input
                                    type="number"
                                    min="1"
                                    className="w-full text-center border border-gray-300 rounded p-0.5"
                                    value={sub.packPerPiece}
                                    onChange={(e) => {
                                      const updated = [...(newItem.subItems || [])];
                                      updated[sIdx] = { ...updated[sIdx], packPerPiece: Number(e.target.value) || 0 };
                                      setNewItem({ ...newItem, subItems: updated });
                                    }}
                                  />
                                </td>
                                <td className="p-1">
                                  <select
                                    className="w-full border border-gray-300 rounded p-0.5"
                                    value={sub.unit}
                                    onChange={(e) => {
                                      const updated = [...(newItem.subItems || [])];
                                      updated[sIdx] = { ...updated[sIdx], unit: e.target.value as any };
                                      setNewItem({ ...newItem, subItems: updated });
                                    }}
                                  >
                                    <option value="box">Box</option>
                                    <option value="pack">Pack</option>
                                    <option value="piece">Piece</option>
                                  </select>
                                </td>
                                <td className="p-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full border border-gray-300 rounded p-0.5"
                                    value={sub.ratePerBox}
                                    onChange={(e) => {
                                      const updated = [...(newItem.subItems || [])];
                                      updated[sIdx] = { ...updated[sIdx], ratePerBox: Number(e.target.value) || 0 };
                                      setNewItem({ ...newItem, subItems: updated });
                                    }}
                                  />
                                </td>
                                <td className="p-1">
                                  <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded p-0.5"
                                    value={sub.color || ''}
                                    onChange={(e) => {
                                      const updated = [...(newItem.subItems || [])];
                                      updated[sIdx] = { ...updated[sIdx], color: e.target.value };
                                      setNewItem({ ...newItem, subItems: updated });
                                    }}
                                    placeholder="Color"
                                  />
                                </td>
                                <td className="p-1">
                                  <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded p-0.5"
                                    value={sub.brand || ''}
                                    onChange={(e) => {
                                      const updated = [...(newItem.subItems || [])];
                                      updated[sIdx] = { ...updated[sIdx], brand: e.target.value };
                                      setNewItem({ ...newItem, subItems: updated });
                                    }}
                                    placeholder="Brand"
                                  />
                                </td>
                                <td className="p-1 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = (newItem.subItems || []).filter((_, i) => i !== sIdx);
                                      setNewItem({ ...newItem, subItems: updated });
                                    }}
                                    className="text-red-500 hover:text-red-700 text-xs font-bold"
                                  >
                                    ×
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-[9px] italic text-gray-400 text-center py-1 bg-white border border-gray-200 border-dashed rounded">
                        No sub items added yet. Click "Add Sub Line" to split.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <Button type="button" onClick={handleAddItem} className="odoo-btn-primary px-3 h-7 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                </Button>
              </div>
            </div>

            {/* List Table of Items */}
            {items.length > 0 ? (
              <div className="odoo-table-container">
                <table className="odoo-table table-responsive">
                  <thead>
                    <tr className="bg-gray-50 text-gray-655 text-[10px] sm:text-xs">
                      <th className="w-8 text-center p-2">#</th>
                      <th className="min-w-[150px] p-2 text-left">Product</th>
                      <th className="w-24 p-2 text-left">SKU</th>
                      <th className="w-16 p-2 text-center">Boxes</th>
                      <th className="w-16 p-2 text-center">Pack/Box</th>
                      <th className="w-16 p-2 text-center">Pcs/Pack</th>
                      <th className="w-20 p-2 text-left">Unit</th>
                      <th className="w-20 p-2 text-left">Rate</th>
                      <th className="min-w-[120px] p-2 text-left">Details</th>
                      <th className="min-w-[120px] p-2 text-right">Totals</th>
                      <th className="w-20 p-2 text-center">Sub Items</th>
                      <th className="w-16 p-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const isEditing = editingIndex === idx;
                      const product = item.product || products.find((p) => String(p.id) === String(item.productId));
                      const unit = item.unit || 'box';
                      const gstRate = product?.category?.gstRate || 0;

                      const totalPacks = (item.boxes || 0) * (item.packPerBox || 0);
                      const totalPcs = totalPacks * (item.packPerPiece || 0);

                      let ratePerBox = 0, ratePerPack = 0, ratePerPcs = 0, baseAmount = 0;
                      if (unit === 'box') {
                        ratePerBox = item.ratePerBox || 0;
                        ratePerPack = ratePerBox / (item.packPerBox || 1);
                        ratePerPcs = ratePerPack / (item.packPerPiece || 1);
                        baseAmount = (item.boxes || 0) * ratePerBox;
                      } else if (unit === 'pack') {
                        ratePerPack = item.ratePerBox || 0;
                        ratePerBox = ratePerPack * (item.packPerBox || 1);
                        ratePerPcs = ratePerPack / (item.packPerPiece || 1);
                        baseAmount = totalPacks * ratePerPack;
                      } else {
                        ratePerPcs = item.ratePerBox || 0;
                        ratePerPack = ratePerPcs * (item.packPerPiece || 1);
                        ratePerBox = ratePerPack * (item.packPerBox || 1);
                        baseAmount = totalPcs * ratePerPcs;
                      }

                      const gstAmount = (baseAmount * gstRate) / 100;
                      const itemTotal = baseAmount + gstAmount;

                      return (
                        <React.Fragment key={idx}>
                          <tr className="border-b border-gray-150 hover:bg-gray-50/40">
                            <td className="p-2 text-center text-gray-500 font-bold text-xs" data-label="#">{idx + 1}</td>
                            <td className="p-2 min-w-[150px]" data-label="Product">
                              <div className="font-semibold text-xs text-gray-800">
                                {product?.name || 'Unknown Product'}
                                {product?.grade && <span className="ml-1 text-[10px] text-gray-500 font-normal">({product.grade})</span>}
                              </div>
                              <div className="text-[9px] text-gray-400 font-semibold">
                                {product?.category?.name || 'Select Product'} (GST: {gstRate}%)
                              </div>
                              {item.batchCode && (
                                <div className="text-[9px] text-blue-600 font-medium">
                                  Batch: {item.batchCode} {item.mfgDate && `| MFG: ${item.mfgDate}`}
                                </div>
                              )}
                              {(item.color || item.brand) && (
                                <div className="text-[9px] text-purple-600 font-medium">
                                  {item.color && `Color: ${item.color}`} {item.brand && `| Brand: ${item.brand}`}
                                </div>
                              )}
                            </td>
                            <td className="p-2 text-xs text-gray-800" data-label="SKU">
                              {product?.sku || products.find((p) => String(p.id) === String(item.productId))?.sku || '—'}
                            </td>
                            <td className="p-2 text-center text-xs text-gray-800" data-label="Boxes">{item.boxes}</td>
                            <td className="p-2 text-center text-xs text-gray-800" data-label="Pack/Box">{item.packPerBox}</td>
                            <td className="p-2 text-center text-xs text-gray-800" data-label="Pcs/Pack">{item.packPerPiece}</td>
                            <td className="p-2 text-xs text-gray-800 uppercase" data-label="Unit">{item.unit}</td>
                            <td className="p-2 text-xs text-gray-800" data-label="Rate">{formatCurrency(item.ratePerBox)}</td>
                            
                            <td className="p-2 text-[9px] text-gray-500 space-y-0.5 leading-none" data-label="Details">
                              <div><span className="font-bold text-gray-650">Total Packs:</span> {totalPacks}</div>
                              <div><span className="font-bold text-gray-655">Total PCS:</span> {totalPcs}</div>
                              <div><span className="font-bold text-gray-655">Rate/Pack:</span> {formatCurrency(ratePerPack)}</div>
                              <div><span className="font-bold text-gray-655">Rate/PCS:</span> {formatCurrency(ratePerPcs)}</div>
                            </td>

                            <td className="p-2 text-right text-[9px] space-y-0.5 leading-none" data-label="Totals">
                              <div><span className="text-gray-400">Base:</span> <span className="font-semibold text-gray-800">{formatCurrency(baseAmount)}</span></div>
                              <div><span className="text-gray-400">GST:</span> <span className="text-gray-800">{formatCurrency(gstAmount)}</span></div>
                              <div className="pt-0.5 border-t border-gray-150"><span className="text-gray-500 font-bold">Total:</span> <span className="font-extrabold text-primary-650">{formatCurrency(itemTotal)}</span></div>
                            </td>

                            <td className="p-2 text-center" data-label="Sub Items">
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); toggleSubItemsCollapse(idx); }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 text-gray-600 active:bg-gray-200 transition-colors mx-auto"
                              >
                                {expandedItems.has(idx) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                <span>{item.subItems?.length || 0}</span>
                              </button>
                            </td>

                            <td className="p-2 text-center" data-label="Actions">
                              <div className="flex gap-1.5 justify-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingIndex(null);
                                      setEditingData(null);
                                    } else {
                                      setEditingIndex(idx);
                                      setEditingData({ ...item });
                                    }
                                  }}
                                  className="text-blue-600 hover:text-blue-800 transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-red-500 hover:text-red-700 text-lg font-bold leading-none"
                                  title="Remove"
                                >
                                  ×
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Collapsible Sub Items View (Read-Only) */}
                          {expandedItems.has(idx) && (
                            <tr className="bg-gray-50/45 border-b border-gray-150">
                              <td colSpan={12} className="p-2">
                                <div className="space-y-1.5 pl-4 border-l-2 border-primary-500">
                                  <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Sub Items Split Details</h4>
                                  {item.subItems && item.subItems.length > 0 ? (
                                    <div className="overflow-x-auto border border-gray-200 rounded max-w-2xl bg-white">
                                      <table className="min-w-full divide-y divide-gray-150 text-[9px]">
                                        <thead>
                                          <tr className="bg-gray-50 text-gray-500 font-bold text-left">
                                            <th className="p-1 w-8 text-center">#</th>
                                            <th className="p-1 w-16 text-center">Boxes</th>
                                            <th className="p-1 w-16 text-center">Pack/Box</th>
                                            <th className="p-1 w-16 text-center">Pcs/Pack</th>
                                            <th className="p-1 w-16">Unit</th>
                                            <th className="p-1 w-20">Rate</th>
                                            <th className="p-1 w-20">Color</th>
                                            <th className="p-1 w-20">Brand</th>
                                            <th className="p-1 text-right">Base Amount</th>
                                            <th className="p-1 text-right">Total (with GST)</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                          {item.subItems.map((sub, sIdx) => {
                                            const subPacks = sub.boxes * sub.packPerBox;
                                            const subPcs = subPacks * sub.packPerPiece;
                                            let subBase = 0;
                                            if (sub.unit === 'box') subBase = sub.boxes * sub.ratePerBox;
                                            else if (sub.unit === 'pack') subBase = subPacks * sub.ratePerBox;
                                            else subBase = subPcs * sub.ratePerBox;
                                            
                                            const subGst = (subBase * gstRate) / 100;
                                            return (
                                              <tr key={sIdx} className="hover:bg-gray-50/50">
                                                <td className="p-1 text-center font-bold text-gray-400">{sIdx + 1}</td>
                                                <td className="p-1 text-center">{sub.boxes}</td>
                                                <td className="p-1 text-center">{sub.packPerBox}</td>
                                                <td className="p-1 text-center">{sub.packPerPiece}</td>
                                                <td className="p-1 uppercase">{sub.unit}</td>
                                                <td className="p-1">{formatCurrency(sub.ratePerBox)}</td>
                                                <td className="p-1">{sub.color || '—'}</td>
                                                <td className="p-1">{sub.brand || '—'}</td>
                                                <td className="p-1 text-right">{formatCurrency(subBase)}</td>
                                                <td className="p-1 text-right font-semibold text-gray-800">{formatCurrency(subBase + subGst)}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="text-[9px] text-gray-400 italic">No sub-items split configured.</div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Editing nested row */}
                          {isEditing && editingData && (
                            <tr className="bg-blue-50/50 border-b border-blue-200">
                              <td colSpan={12} className="p-3">
                                <div className="space-y-3">
                                  <div className="font-bold text-xs text-blue-900 border-b border-blue-150 pb-1">
                                    Edit Line Item #{idx + 1}
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <ProductSearch
                                      value={editingData.productId}
                                      onChange={(productId) => {
                                        const selected = products.find((p) => String(p.id) === String(productId));
                                        setEditingData({
                                          ...editingData,
                                          productId: productId,
                                          packPerBox: 1,
                                          packPerPiece: 1,
                                          color: selected?.color || '',
                                          brand: selected?.brand || '',
                                        });
                                      }}
                                    />

                                    <Input
                                      type="number"
                                      label="Boxes *"
                                      value={editingData.boxes || ''}
                                      onChange={(e) => setEditingData({ ...editingData, boxes: Number(e.target.value) || 0 })}
                                      min="1"
                                    />

                                    <Input
                                      type="number"
                                      label="Pack/Box *"
                                      value={editingData.packPerBox || ''}
                                      onChange={(e) => setEditingData({ ...editingData, packPerBox: Number(e.target.value) || 0 })}
                                      min="1"
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <Input
                                      type="number"
                                      label="Pcs/Pack *"
                                      value={editingData.packPerPiece || ''}
                                      onChange={(e) => setEditingData({ ...editingData, packPerPiece: Number(e.target.value) || 0 })}
                                      min="1"
                                    />

                                    <Select
                                      label="Unit *"
                                      value={editingData.unit}
                                      onChange={(e) => setEditingData({ ...editingData, unit: e.target.value as any })}
                                    >
                                      <option value="box">Box</option>
                                      <option value="pack">Pack</option>
                                      <option value="piece">Piece</option>
                                    </Select>

                                    <Input
                                      type="number"
                                      label="Rate *"
                                      value={editingData.ratePerBox || ''}
                                      onChange={(e) => setEditingData({ ...editingData, ratePerBox: Number(e.target.value) || 0 })}
                                      step="0.01"
                                      min="0"
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Input
                                      label="Batch Code"
                                      value={editingData.batchCode || ''}
                                      onChange={(e) => setEditingData({ ...editingData, batchCode: e.target.value })}
                                      placeholder="Enter batch code"
                                    />

                                    <Input
                                      type="date"
                                      label="MFG Date"
                                      value={editingData.mfgDate || ''}
                                      onChange={(e) => setEditingData({ ...editingData, mfgDate: e.target.value })}
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Input
                                      label="Color"
                                      value={editingData.color || ''}
                                      onChange={(e) => setEditingData({ ...editingData, color: e.target.value })}
                                      placeholder="Enter color"
                                    />

                                    <Input
                                      label="Brand"
                                      value={editingData.brand || ''}
                                      onChange={(e) => setEditingData({ ...editingData, brand: e.target.value })}
                                      placeholder="Enter brand"
                                    />
                                  </div>

                                  {/* Calculations Preview for Edit Item */}
                                  {editingData.productId && (
                                    (() => {
                                      const prev = getPreviewDetails(editingData);
                                      return (
                                        <div className="bg-white border border-blue-150 rounded p-2.5 text-[10px] grid grid-cols-2 md:grid-cols-4 gap-2 text-blue-900 shadow-sm leading-tight">
                                          <div><span className="font-bold text-blue-700">Total Packs:</span> {prev.totalPacks}</div>
                                          <div><span className="font-bold text-blue-700">Total PCS:</span> {prev.totalPcs}</div>
                                          <div><span className="font-bold text-blue-700">Rate/Pack:</span> {formatCurrency(prev.ratePerPack)}</div>
                                          <div><span className="font-bold text-blue-700">Rate/PCS:</span> {formatCurrency(prev.ratePerPcs)}</div>
                                          <div><span className="font-bold text-blue-700">Base Amount:</span> {formatCurrency(prev.baseAmount)}</div>
                                          <div><span className="font-bold text-blue-700">GST ({prev.gstRate}%):</span> {formatCurrency(prev.gstAmount)}</div>
                                          <div className="col-span-2 md:col-span-1 font-bold text-green-700"><span className="text-blue-700">Total Amount:</span> {formatCurrency(prev.totalAmount)}</div>
                                        </div>
                                      );
                                    })()
                                  )}

                                  {/* Sub items edit section */}
                                  <div className="border-t border-blue-150 pt-2 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-blue-900 uppercase">Sub Item Split Lines</span>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const subLines = editingData.subItems || [];
                                          setEditingData({
                                            ...editingData,
                                            subItems: [
                                              ...subLines,
                                              { boxes: 1, packPerBox: 1, packPerPiece: 1, unit: 'box', ratePerBox: 0 },
                                            ],
                                          });
                                        }}
                                        className="odoo-btn-secondary h-6 text-[10px] px-2"
                                      >
                                        <Plus className="h-3 w-3 mr-1" /> Add Sub Line
                                      </Button>
                                    </div>

                                    {editingData.subItems && editingData.subItems.length > 0 ? (
                                      <div className="overflow-x-auto border border-blue-150 rounded bg-white">
                                        <table className="min-w-full divide-y divide-blue-100 text-[10px]">
                                          <thead>
                                            <tr className="bg-blue-50/50 text-blue-900 font-bold">
                                              <th className="p-1 w-8 text-center">#</th>
                                              <th className="p-1 w-16 text-center">Boxes</th>
                                              <th className="p-1 w-16 text-center">Pack/Box</th>
                                              <th className="p-1 w-16 text-center">Pcs/Pack</th>
                                              <th className="p-1 w-20">Unit</th>
                                              <th className="p-1 w-20">Rate</th>
                                              <th className="p-1 text-center w-8">Action</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-blue-50">
                                            {editingData.subItems.map((sub, sIdx) => (
                                              <tr key={sIdx}>
                                                <td className="p-1 text-center font-bold text-blue-400">{sIdx + 1}</td>
                                                <td>
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full text-center border border-blue-200 rounded p-0.5"
                                                    value={sub.boxes}
                                                    onChange={(e) => {
                                                      const updated = [...(editingData.subItems || [])];
                                                      updated[sIdx] = { ...updated[sIdx], boxes: Number(e.target.value) || 0 };
                                                      setEditingData({ ...editingData, subItems: updated });
                                                    }}
                                                  />
                                                </td>
                                                <td>
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full text-center border border-blue-200 rounded p-0.5"
                                                    value={sub.packPerBox}
                                                    onChange={(e) => {
                                                      const updated = [...(editingData.subItems || [])];
                                                      updated[sIdx] = { ...updated[sIdx], packPerBox: Number(e.target.value) || 0 };
                                                      setEditingData({ ...editingData, subItems: updated });
                                                    }}
                                                  />
                                                </td>
                                                <td>
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full text-center border border-blue-200 rounded p-0.5"
                                                    value={sub.packPerPiece}
                                                    onChange={(e) => {
                                                      const updated = [...(editingData.subItems || [])];
                                                      updated[sIdx] = { ...updated[sIdx], packPerPiece: Number(e.target.value) || 0 };
                                                      setEditingData({ ...editingData, subItems: updated });
                                                    }}
                                                  />
                                                </td>
                                                <td>
                                                  <select
                                                    className="w-full border border-blue-200 rounded p-0.5"
                                                    value={sub.unit}
                                                    onChange={(e) => {
                                                      const updated = [...(editingData.subItems || [])];
                                                      updated[sIdx] = { ...updated[sIdx], unit: e.target.value as any };
                                                      setEditingData({ ...editingData, subItems: updated });
                                                    }}
                                                  >
                                                    <option value="box">Box</option>
                                                    <option value="pack">Pack</option>
                                                    <option value="piece">Piece</option>
                                                  </select>
                                                </td>
                                                <td>
                                                  <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    className="w-full border border-blue-200 rounded p-0.5"
                                                    value={sub.ratePerBox}
                                                    onChange={(e) => {
                                                      const updated = [...(editingData.subItems || [])];
                                                      updated[sIdx] = { ...updated[sIdx], ratePerBox: Number(e.target.value) || 0 };
                                                      setEditingData({ ...editingData, subItems: updated });
                                                    }}
                                                  />
                                                </td>
                                                <td className="p-1 text-center">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const updated = (editingData.subItems || []).filter((_, i) => i !== sIdx);
                                                      setEditingData({ ...editingData, subItems: updated });
                                                    }}
                                                    className="text-red-500 hover:text-red-700 text-xs font-bold"
                                                  >
                                                    ×
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="text-[9px] italic text-blue-400 text-center py-1 bg-white border border-blue-250 border-dashed rounded">
                                        No sub items added yet. Click "Add Sub Line" to split.
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex justify-end gap-2 pt-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleSaveEdit(idx)}
                                      className="odoo-btn-primary px-3 h-7 text-xs"
                                    >
                                      Save Line
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingIndex(null);
                                        setEditingData(null);
                                      }}
                                      className="odoo-btn-secondary px-3 h-7 text-xs"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>

                {/* Grand Total Bar */}
                <div className="bg-gray-50 border-t border-gray-150 p-3 flex justify-end font-bold text-xs sm:text-sm text-gray-800">
                  <div className="flex gap-4">
                    <span>Grand Total:</span>
                    <span className="text-primary-650">{formatCurrency(calculateGrandTotal())}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs italic text-gray-400 text-center py-4 bg-gray-50/50 border border-gray-200 border-dashed rounded">
                No PO items added to the line. Fill the section above and click "Add Item".
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Add Vendor Modal */}
      <Modal
        isOpen={addVendorModalOpen}
        onClose={() => setAddVendorModalOpen(false)}
        title="Add New Vendor"
      >
        <form onSubmit={handleCreateVendor} className="space-y-4">
          <Input
            label="Name"
            required
            value={newVendorData.name}
            onChange={(e) => setNewVendorData({ ...newVendorData, name: e.target.value })}
            placeholder="Enter vendor name"
          />
          <Input
            label="Email"
            type="email"
            value={newVendorData.email}
            onChange={(e) => setNewVendorData({ ...newVendorData, email: e.target.value })}
            placeholder="Enter email"
          />
          <Input
            label="Phone"
            value={newVendorData.phone}
            onChange={(e) => setNewVendorData({ ...newVendorData, phone: e.target.value })}
            placeholder="Enter phone number"
          />
          <Input
            label="Address"
            value={newVendorData.address}
            onChange={(e) => setNewVendorData({ ...newVendorData, address: e.target.value })}
            placeholder="Enter address"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddVendorModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Save Vendor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AddEditPurchaseOrder;
