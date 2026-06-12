import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ChevronDown, ChevronRight, Edit2, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createInwardInvoice, updateInwardInvoice } from '@/slices/inwardSlice';
import { fetchVendors, createVendor } from '@/slices/vendorSlice';
import { fetchLocations } from '@/slices/locationSlice';
import { fetchProducts } from '@/slices/productSlice';
import { fetchPurchaseOrders } from '@/slices/purchaseOrderSlice';
import { InwardInvoice } from '@/types';
import { formatCurrency, generateInvoiceNumber } from '@/utils';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Modal from '@/components/Modal';
import ProductSearch from '@/components/ProductSearch';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';

interface InwardItem {
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

interface InwardInvoiceFormData {
  invoiceNo: string;
  date: string;
  vendorId: string;
  locationId: string;
  expense: number;
  items: InwardItem[];
  purchaseOrderId?: string;
  scannedBarcodes?: string[];
}

const inwardSchema = z.object({
  invoiceNo: z.string().min(1, 'Invoice number is required'),
  date: z.string().min(1, 'Date is required'),
  vendorId: z.union([z.string(), z.number()]).pipe(z.coerce.string().min(1, 'Vendor is required')),
  locationId: z.union([z.string(), z.number()]).pipe(z.coerce.string().min(1, 'Location is required')),
  expense: z.number().min(0, 'Expense must be positive').default(0),
  purchaseOrderId: z.string().optional(),
  scannedBarcodes: z.array(z.string()).optional(),
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

interface AddEditInwardProps {
  invoice?: InwardInvoice;
  onSuccess: () => void;
  onCancel: () => void;
}

const AddEditInward: React.FC<AddEditInwardProps> = ({ invoice, onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const { vendors } = useAppSelector((state) => state.vendors);
  const { locations } = useAppSelector((state) => state.locations);
  const { products } = useAppSelector((state) => state.products);
  const { orders: purchaseOrders } = useAppSelector((state) => state.purchaseOrders);

  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [addVendorModalOpen, setAddVendorModalOpen] = useState(false);
  const [newVendorData, setNewVendorData] = useState({ name: '', email: '', phone: '', address: '' });
  const vendorDropdownRef = useRef<HTMLDivElement>(null);

  // Items State (like QuoteForm)
  const [items, setItems] = useState<InwardItem[]>([]);
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([]);
  const [newItem, setNewItem] = useState<InwardItem>({
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
  const [scannerOpen, setScannerOpen] = useState(false);

  // Item Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<InwardItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<InwardInvoiceFormData>({
    resolver: zodResolver(inwardSchema),
    defaultValues: {
      expense: 0,
      items: [],
    },
  });

  useEffect(() => {
    dispatch(fetchProducts({ limit: 1000 }));
    dispatch(fetchVendors({ limit: 100 }));
    dispatch(fetchLocations({ limit: 100 }));
    dispatch(fetchPurchaseOrders({ limit: 1000 }));
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

  // Populate data when invoice changes (Edit mode)
  useEffect(() => {
    if (invoice && vendors.length > 0) {
      const selectedVendor = vendors.find((v: any) => v.id === invoice.vendorId || String(v.id) === String(invoice.vendorId));
      if (selectedVendor) setVendorSearch(`${(selectedVendor as any).code} - ${(selectedVendor as any).name}`);

      reset({
        invoiceNo: invoice.invoiceNo,
        date: invoice.date.split('T')[0],
        vendorId: String(invoice.vendorId),
        locationId: String(invoice.locationId),
        expense: invoice.expense || 0,
        purchaseOrderId: invoice.purchaseOrderId ? String(invoice.purchaseOrderId) : undefined,
      });

      const mappedItems = invoice.items?.map((item) => {
        let actualRate = item.ratePerBox;
        if (item.unit === 'pack') {
          actualRate = item.ratePerPack;
        } else if (item.unit === 'piece') {
          actualRate = item.ratePerPcs;
        }

        return {
          productId: String(item.productId),
          boxes: item.boxes,
          packPerBox: item.packPerBox || item.pcsPerBox || 1,
          packPerPiece: item.packPerPiece || 1,
          unit: (item.unit || 'box') as 'box' | 'pack' | 'piece',
          ratePerBox: actualRate,
          product: item.product,
          batchCode: item.batchCode || '',
          mfgDate: item.mfgDate ? item.mfgDate.split('T')[0] : '',
          color: item.color || '',
          brand: item.brand || '',
          subItems: item.subItems?.map((subItem) => {
            let subActualRate = subItem.ratePerBox;
            if (subItem.unit === 'pack') {
              subActualRate = subItem.ratePerPack;
            } else if (subItem.unit === 'piece') {
              subActualRate = subItem.ratePerPcs;
            }

            return {
              boxes: subItem.boxes,
              packPerBox: subItem.packPerBox,
              packPerPiece: subItem.packPerPiece,
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
    } else if (!invoice) {
      reset({
        invoiceNo: generateInvoiceNumber('INW'),
        date: new Date().toISOString().split('T')[0],
        vendorId: '',
        locationId: '',
        expense: 0,
        purchaseOrderId: undefined,
      });
      setItems([]);
    }
  }, [invoice, vendors, reset]);

  const handlePurchaseOrderChange = (poId: string) => {
    setValue('purchaseOrderId', poId || undefined);
    if (!poId) {
      setItems([]);
      return;
    }

    const po = purchaseOrders.find((o) => String(o.id) === poId);
    if (po) {
      // Set vendor
      setValue('vendorId', String(po.vendorId));
      const vendor = vendors.find((v) => String(v.id) === String(po.vendorId));
      if (vendor) {
        setVendorSearch(`${vendor.code} - ${vendor.name}`);
      }

      // Map PO items to Inward items
      const poItems = po.items?.map((item) => {
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

      setItems(poItems);
      toast.success(`Loaded items from Purchase Order ${po.poNo}`);
    }
  };

  const handleScanSuccess = async (barcode: string) => {
    try {
      // Check if barcode already scanned
      if (scannedBarcodes.includes(barcode)) {
        toast.error('This barcode has already been scanned in this invoice.');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/v1/barcodes/lookup/${barcode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.success && response.data?.data) {
        const box = response.data.data;
        
        // Track individual barcode scan
        setScannedBarcodes((prev) => [...prev, barcode]);

        if (box.purchaseOrderId) {
          setValue('purchaseOrderId', String(box.purchaseOrderId));
          setValue('vendorId', String(box.purchaseOrder?.vendorId));
          if (box.purchaseOrder?.vendor) {
            setVendorSearch(`${box.purchaseOrder.vendor.code} - ${box.purchaseOrder.vendor.name}`);
          }
        }
        
        const matchingPoItem = box.purchaseOrder?.items?.find(
          (item: any) => String(item.productId) === String(box.productId)
        );
        const rate = matchingPoItem?.ratePerBox || matchingPoItem?.rate || 0;
        const batchCode = box.batchCode || box.product?.batchCode || '';
        const mfgDate = box.mfgDate ? box.mfgDate.split('T')[0] : (box.product?.mfgDate || '');
        const color = box.color || box.product?.color || '';
        const brand = box.brand || box.product?.brand || '';

        const newItemToAdd: InwardItem = {
          productId: String(box.productId),
          boxes: 1,
          packPerBox: box.packPerBox || 28,
          packPerPiece: box.packPerPiece || 25,
          unit: 'box',
          ratePerBox: rate,
          batchCode: batchCode,
          mfgDate: mfgDate,
          color: color,
          brand: brand,
          product: box.product
        };
        setItems([...items, newItemToAdd]);
        toast.success(`Added product: ${box.product?.name}`);
      } else {
        toast.error("Scanned barcode not found or invalid.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to look up barcode.");
    }
  };

  // Calculations
  const calculateItemTotal = (item: InwardItem) => {
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

  const getPreviewDetails = (item: InwardItem) => {
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
      toast.error('Boxes must be at least 1');
      return;
    }
    if (!newItem.ratePerBox || newItem.ratePerBox < 0) {
      toast.error('Rate must be positive');
      return;
    }

    const selectedProduct = products.find((p) => String(p.id) === String(newItem.productId));
    const itemToAdd = {
      ...newItem,
      product: selectedProduct,
    };

    setItems([...items, itemToAdd]);
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
  };

  // Remove Item from Table
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingData(null);
    }
    setScannedBarcodes([]);
  };

  // Save Edit Item
  const handleSaveEdit = (index: number) => {
    if (!editingData) return;
    if (!editingData.productId) {
      toast.error('Please select a product');
      return;
    }
    if (!editingData.boxes || editingData.boxes <= 0) {
      toast.error('Boxes must be at least 1');
      return;
    }
    if (editingData.ratePerBox < 0) {
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

  // Submit invoice
  const onSubmit = async (data: InwardInvoiceFormData) => {
    try {
      const payload = {
        ...data,
        scannedBarcodes,
      };
      if (invoice) {
        await dispatch(updateInwardInvoice({ id: invoice.id.toString(), data: payload })).unwrap();
        toast.success('Inward invoice updated successfully');
      } else {
        await dispatch(createInwardInvoice(payload)).unwrap();
        toast.success('Inward invoice created successfully');
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

  const locationOptions = locations.map((l) => ({
    value: l.id.toString(),
    label: l.name,
  }));

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Control Bar (Odoo Style) */}
      <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="hover:text-primary-600 cursor-pointer" onClick={onCancel}>Inwards</span>
          <span>/</span>
          <span className="font-semibold text-gray-700">{invoice ? 'Edit Inward Invoice' : 'Create Inward Invoice'}</span>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Link Purchase Order (Optional)"
              error={errors.purchaseOrderId?.message}
              value={watch('purchaseOrderId') || ''}
              onChange={(e) => handlePurchaseOrderChange(e.target.value)}
            >
              <option value="">-- Select PO --</option>
              {purchaseOrders?.map((po: any) => (
                <option key={po.id} value={po.id}>
                  {po.poNo} ({po.vendor?.name})
                </option>
              ))}
            </Select>
            <Input
              label="Invoice Number"
              error={errors.invoiceNo?.message}
              {...register('invoiceNo')}
            />
            <Input
              label="Date"
              type="date"
              error={errors.date?.message}
              {...register('date')}
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

            <Select
              label="Location"
              options={locationOptions}
              placeholder="Select location"
              error={errors.locationId?.message}
              {...register('locationId')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Expense"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              error={errors.expense?.message}
              {...register('expense', { valueAsNumber: true })}
            />
          </div>

          {/* Item Lines Section Header */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-gray-800">Inward Items & Lines</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setScannerOpen(true)}
                className="odoo-btn-secondary h-7 text-xs flex items-center gap-1 border-primary-300 text-primary-700 hover:bg-primary-50"
              >
                <Camera className="h-3.5 w-3.5" /> Scan Box Barcode
              </Button>
            </div>

            {/* Quote-style Input Section for New Items */}
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
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value as 'box' | 'pack' | 'piece' })}
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
                              { boxes: 1, packPerBox: 1, packPerPiece: 1, unit: 'box', ratePerBox: 0, color: newItem.color || '', brand: newItem.brand || '' },
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
                              <th className="p-1 w-20">Color</th>
                              <th className="p-1 w-20">Brand</th>
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
                                    placeholder="Color"
                                    value={sub.color || ''}
                                    onChange={(e) => {
                                      const updated = [...(newItem.subItems || [])];
                                      updated[sIdx] = { ...updated[sIdx], color: e.target.value };
                                      setNewItem({ ...newItem, subItems: updated });
                                    }}
                                  />
                                </td>
                                <td className="p-1">
                                  <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded p-0.5"
                                    placeholder="Brand"
                                    value={sub.brand || ''}
                                    onChange={(e) => {
                                      const updated = [...(newItem.subItems || [])];
                                      updated[sIdx] = { ...updated[sIdx], brand: e.target.value };
                                      setNewItem({ ...newItem, subItems: updated });
                                    }}
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
                    <tr className="bg-gray-50 text-gray-650 text-[10px] sm:text-xs">
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
                              <div><span className="font-bold text-gray-600">Total Packs:</span> {totalPacks}</div>
                              <div><span className="font-bold text-gray-600">Total PCS:</span> {totalPcs}</div>
                              <div><span className="font-bold text-gray-600">Rate/Pack:</span> {formatCurrency(ratePerPack)}</div>
                              <div><span className="font-bold text-gray-600">Rate/PCS:</span> {formatCurrency(ratePerPcs)}</div>
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

                          {/* Editing nested row (QuoteForm style) */}
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
                                        className="odoo-btn-secondary h-6 text-[10px] px-2 border-blue-300 text-blue-800 hover:bg-blue-100/50"
                                      >
                                        <Plus className="h-3 w-3 mr-1" /> Add Sub Line
                                      </Button>
                                    </div>

                                    {editingData.subItems && editingData.subItems.length > 0 ? (
                                      <div className="overflow-x-auto border border-blue-200 rounded bg-white max-w-3xl">
                                        <table className="min-w-full divide-y divide-blue-100 text-[10px]">
                                          <thead>
                                            <tr className="bg-blue-50 text-blue-800 font-bold">
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
                                                <td className="p-1">
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full text-center border border-blue-200 rounded p-0.5"
                                                    value={sub.boxes}
                                                    onChange={(e) => {
                                                      const subLines = [...(editingData.subItems || [])];
                                                      subLines[sIdx] = { ...subLines[sIdx], boxes: Number(e.target.value) || 0 };
                                                      setEditingData({ ...editingData, subItems: subLines });
                                                    }}
                                                  />
                                                </td>
                                                <td className="p-1">
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full text-center border border-blue-200 rounded p-0.5"
                                                    value={sub.packPerBox}
                                                    onChange={(e) => {
                                                      const subLines = [...(editingData.subItems || [])];
                                                      subLines[sIdx] = { ...subLines[sIdx], packPerBox: Number(e.target.value) || 0 };
                                                      setEditingData({ ...editingData, subItems: subLines });
                                                    }}
                                                  />
                                                </td>
                                                <td className="p-1">
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full text-center border border-blue-200 rounded p-0.5"
                                                    value={sub.packPerPiece}
                                                    onChange={(e) => {
                                                      const subLines = [...(editingData.subItems || [])];
                                                      subLines[sIdx] = { ...subLines[sIdx], packPerPiece: Number(e.target.value) || 0 };
                                                      setEditingData({ ...editingData, subItems: subLines });
                                                    }}
                                                  />
                                                </td>
                                                <td className="p-1">
                                                  <select
                                                    className="w-full border border-blue-200 rounded p-0.5"
                                                    value={sub.unit}
                                                    onChange={(e) => {
                                                      const subLines = [...(editingData.subItems || [])];
                                                      subLines[sIdx] = { ...subLines[sIdx], unit: e.target.value as any };
                                                      setEditingData({ ...editingData, subItems: subLines });
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
                                                    className="w-full border border-blue-200 rounded p-0.5"
                                                    value={sub.ratePerBox}
                                                    onChange={(e) => {
                                                      const subLines = [...(editingData.subItems || [])];
                                                      subLines[sIdx] = { ...subLines[sIdx], ratePerBox: Number(e.target.value) || 0 };
                                                      setEditingData({ ...editingData, subItems: subLines });
                                                    }}
                                                  />
                                                </td>
                                                <td className="p-1 text-center">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const subLines = (editingData.subItems || []).filter((_, i) => i !== sIdx);
                                                      setEditingData({ ...editingData, subItems: subLines });
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
                                      <div className="text-[9px] italic text-gray-400 text-center py-1 bg-white border border-gray-200 border-dashed rounded max-w-3xl">
                                        No sub items added yet. Click "Add Sub Line" to split.
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex gap-2 justify-end pt-1">
                                    <Button
                                      type="button"
                                      onClick={() => handleSaveEdit(idx)}
                                      className="odoo-btn-primary px-3 h-7 text-xs bg-blue-700 hover:bg-blue-800"
                                    >
                                      Save Line Change
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingIndex(null);
                                        setEditingData(null);
                                      }}
                                      className="odoo-btn-secondary px-3 h-7 text-xs border-blue-300 text-blue-800"
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
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-gray-300 rounded text-xs text-gray-400">
                No items added to this invoice yet. Select a product and fill the details above to add items.
              </div>
            )}
          </div>

          {/* Grand Total Summary Card */}
          <div className="border-t pt-4 flex justify-end">
            <div className="w-full sm:w-auto sm:min-w-[300px] bg-green-50 border border-green-200 p-4 rounded space-y-1.5">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Grand Total (incl. GST):</span>
                <span className="text-lg font-bold text-green-700">{formatCurrency(calculateGrandTotal() + (Number(control._formValues.expense) || 0))}</span>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Add Vendor Modal (Duplicate of original functionality) */}
      <Modal
        isOpen={addVendorModalOpen}
        onClose={() => {
          setAddVendorModalOpen(false);
          setNewVendorData({ name: '', email: '', phone: '', address: '' });
        }}
        title="Add New Vendor"
        size="md"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const created = await dispatch(createVendor(newVendorData)).unwrap();
              toast.success('Vendor added successfully');
              await dispatch(fetchVendors({ limit: 100 }));
              setValue('vendorId', String(created.id));
              setVendorSearch(`${(created as any).code} - ${created.name}`);
              setAddVendorModalOpen(false);
              setNewVendorData({ name: '', email: '', phone: '', address: '' });
            } catch (error: any) {
              toast.error(error?.message || 'Failed to add vendor');
            }
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Vendor Name"
              placeholder="Enter vendor name"
              value={newVendorData.name}
              onChange={(e) => setNewVendorData({ ...newVendorData, name: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="Enter email address"
              value={newVendorData.email}
              onChange={(e) => setNewVendorData({ ...newVendorData, email: e.target.value })}
            />
            <Input
              label="Phone"
              placeholder="Enter phone number"
              value={newVendorData.phone}
              onChange={(e) => setNewVendorData({ ...newVendorData, phone: e.target.value })}
            />
            <Input
              label="Address"
              placeholder="Enter address"
              value={newVendorData.address}
              onChange={(e) => setNewVendorData({ ...newVendorData, address: e.target.value })}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddVendorModalOpen(false);
                setNewVendorData({ name: '', email: '', phone: '', address: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Add Vendor</Button>
          </div>
        </form>
      </Modal>

      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
};

export default AddEditInward;