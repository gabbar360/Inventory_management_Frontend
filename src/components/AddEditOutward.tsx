import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ChevronDown, ChevronRight, X, Edit2, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createOutwardInvoice, updateOutwardInvoice } from '@/slices/outwardSlice';
import { fetchAvailableStock } from '@/slices/inventorySlice';
import { fetchCustomers, createCustomer } from '@/slices/customerSlice';
import { OutwardInvoice, StockBatch, Product } from '@/types';
import { formatDate, formatCurrency, generateInvoiceNumber, cn } from '@/utils';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Modal from '@/components/Modal';
import ProductSearch from '@/components/ProductSearch';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';

const playSuccessSound = () => {
  try {
    console.log('🔊 Attempting to play SUCCESS sound from /sounds/success.mpeg');
    const audio = new Audio('/sounds/success.mpeg');
    audio.volume = 1.0;
    audio.play()
      .then(() => console.log('✅ SUCCESS sound played successfully'))
      .catch(err => console.warn('❌ Could not play success sound:', err));
  } catch (err) {
    console.error('💥 SUCCESS sound error:', err);
  }
};

const playErrorSound = () => {
  try {
    console.log('🔊 Attempting to play ERROR sound from /sounds/warnning.mpeg');
    const audio = new Audio('/sounds/warnning.mpeg');
    audio.volume = 1.0;
    audio.play()
      .then(() => console.log('✅ ERROR sound played successfully'))
      .catch(err => console.warn('❌ Could not play error sound:', err));
  } catch (err) {
    console.error('💥 ERROR sound error:', err);
  }
};

// ─── Types & Schemas ────────────────────────────────────────────────────────

interface OutwardItem {
  productId: string;
  stockBatchId: string;
  locationId: string;
  saleUnit: 'box' | 'pack' | 'piece';
  quantity: number;
  ratePerUnit: number;
  description: string;
  product?: Product;
  stockBatch?: StockBatch;
}

interface OutwardInvoiceFormData {
  invoiceNo: string;
  date: string;
  customerId: string;
  saleType: 'export' | 'domestic';
  expense: number;
  adjustment: string;
  amountReceived: string;
  referenceNo: string;
  shippingCharge: string;
  discount: string;
  items: OutwardItem[];
}

const outwardSchema = z.object({
  invoiceNo: z.string().min(1, 'Invoice number is required'),
  date: z.string().min(1, 'Date is required'),
  customerId: z.union([z.string(), z.number()]).pipe(z.coerce.string().min(1, 'Customer is required')),
  saleType: z.enum(['export', 'domestic'], {
    required_error: 'Sale type is required',
  }),
  expense: z.number().min(0, 'Expense must be positive').default(0),
  adjustment: z.string().optional().default('0'),
  amountReceived: z.string().optional().default('0'),
  referenceNo: z.string().optional().default(''),
  shippingCharge: z.string().optional().default('0'),
  discount: z.string().optional().default('0'),
  items: z
    .array(
      z.object({
        productId: z.union([z.string(), z.number()]).transform((val) => val.toString()),
        stockBatchId: z.union([z.string(), z.number()]).transform((val) => val.toString()),
        locationId: z.union([z.string(), z.number()]).transform((val) => val.toString()),
        saleUnit: z.enum(['box', 'pack', 'piece'], {
          required_error: 'Sale unit is required',
        }),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
        ratePerUnit: z.number().min(0, 'Rate per unit must be positive'),
        description: z.string().optional().default(''),
      })
    )
    .min(1, 'At least one item is required'),
});

// ─── MultiLineSelect (For Stock Batches Selection) ───────────────────────────

interface MultiLineOption {
  value: string;
  line1: string;
  line2: string;
}

interface MultiLineSelectProps {
  options: MultiLineOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  showLabel?: boolean;
}

const MultiLineSelect: React.FC<MultiLineSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  disabled = false,
  error,
  showLabel = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      {showLabel && <label className="block text-xs font-semibold text-gray-700 mb-1">Stock Batch *</label>}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex h-8.5 w-full items-center justify-between rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500'
        )}
      >
        <div className="text-left flex-1 min-w-0">
          {selectedOption ? (
            <div>
              <div className="font-medium truncate text-[10px]">{selectedOption.line1}</div>
              <div className="text-[9px] text-gray-500 truncate">{selectedOption.line2}</div>
            </div>
          ) : (
            <span className="text-gray-400 text-[10px]">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={cn('h-3.5 w-3.5 ml-1 flex-shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded border border-gray-300 bg-white shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'w-full text-left px-2 py-1.5 hover:bg-gray-100 border-b border-gray-100 last:border-b-0',
                value === option.value && 'bg-primary-50'
              )}
            >
              <div className="text-[10px] font-medium">{option.line1}</div>
              <div className="text-[9px] text-gray-500">{option.line2}</div>
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-[9px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
};

// ─── AddEditOutward Props ───────────────────────────────────────────────────

interface AddEditOutwardProps {
  invoice?: OutwardInvoice;
  onSuccess: () => void;
  onCancel: () => void;
}

// ─── Main Component ─────────────────────────────────────────────────────────

const AddEditOutward: React.FC<AddEditOutwardProps> = ({ invoice, onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const { customers } = useAppSelector((state) => state.customers);

  const [availableStockCache, setAvailableStockCache] = useState<{ [key: string]: StockBatch[] }>({});
  const [productsCache, setProductsCache] = useState<{ [key: string]: Product }>({});
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', email: '', phone: '', address: '', state: '', gstNumber: '' });
  const [stateSearch, setStateSearch] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const [indianStates, setIndianStates] = useState<string[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  
  // Local state for outward item rows (QuoteForm style)
  const [items, setItems] = useState<OutwardItem[]>([]);
  const [newItem, setNewItem] = useState<OutwardItem>({
    productId: '',
    stockBatchId: '',
    locationId: '',
    saleUnit: 'box',
    quantity: 1,
    ratePerUnit: 0,
    description: '',
  });
  const [newItemSelections, setNewItemSelections] = useState<Array<{
    id: string;
    stockBatchId: string;
    saleUnit: 'box' | 'pack' | 'piece';
    quantity: number;
    ratePerUnit: number;
  }>>([{ id: '1', stockBatchId: '', saleUnit: 'box', quantity: 1, ratePerUnit: 0 }]);

  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<OutwardItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const [scannerOpen, setScannerOpen] = useState(false);

  const handleScanSuccess = async (barcode: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/v1/barcodes/lookup/${barcode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.success && response.data?.data) {
        const box = response.data.data;
        
        // 1. Verify box status
        if (box.status === 'expected') {
          playErrorSound();
          toast.error("This box has not been inwarded yet.");
          return;
        }
        if (box.status === 'outwarded') {
          if (!invoice || box.outwardInvoiceId !== invoice.id) {
            playErrorSound();
            toast.error("This box has already been outwarded.");
            return;
          }
        }
        if (!box.stockBatchId) {
          playErrorSound();
          toast.error("Box is not linked to any stock batch.");
          return;
        }

        // 2. Fetch available stock cache for this product
        const batches = await loadAvailableStock(box.productId.toString());
        const selectedBatch = batches.find((b: any) => b.id.toString() === box.stockBatchId.toString());
        if (!selectedBatch) {
          playErrorSound();
          toast.error("Stock batch associated with this box was not found or is empty.");
          return;
        }

        // Cache the product
        if (box.product) {
          setProductsCache((prev) => ({ ...prev, [box.productId]: box.product }));
        }

        // 3. Check if we already have this batch + unit in the invoice list
        const existingIdx = items.findIndex(
          (it) => it.stockBatchId.toString() === box.stockBatchId.toString() && it.saleUnit === 'box'
        );

        const currentQty = existingIdx >= 0 ? items[existingIdx].quantity : 0;
        const maxQty = selectedBatch.remainingBoxes + (invoice ? (invoice.items?.find((oi: any) => oi.stockBatchId.toString() === box.stockBatchId.toString() && oi.saleUnit === 'box')?.quantity || 0) : 0);

        if (currentQty + 1 > maxQty) {
          playErrorSound();
          toast.error(`Cannot add box. Available stock in batch is only ${maxQty} boxes.`);
          return;
        }

        if (existingIdx >= 0) {
          const updated = [...items];
          updated[existingIdx].quantity += 1;
          setItems(updated);
          playSuccessSound();
          toast.success(`Incremented quantity for product: ${box.product?.name} in stock batch.`);
        } else {
          const suggestedRate = Math.round(selectedBatch.costPerBox * 1.2 * 100) / 100;
          const itemToAdd: OutwardItem = {
            productId: String(box.productId),
            stockBatchId: String(box.stockBatchId),
            locationId: String(selectedBatch.locationId || box.locationId || 1),
            saleUnit: 'box',
            quantity: 1,
            ratePerUnit: suggestedRate,
            description: box.product?.description || '',
            product: box.product,
            stockBatch: selectedBatch
          };
          setItems([...items, itemToAdd]);
          playSuccessSound();
          toast.success(`Added box for product: ${box.product?.name}`);
        }
      } else {
        playErrorSound();
        toast.error("Scanned barcode not found or invalid.");
      }
    } catch (err: any) {
      console.error(err);
      playErrorSound();
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to look up barcode.";
      toast.error(errorMsg, { duration: 4000 });
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OutwardInvoiceFormData>({
    resolver: zodResolver(outwardSchema),
    defaultValues: {
      expense: 0,
      adjustment: '0',
      amountReceived: '0',
      referenceNo: '',
      shippingCharge: '0',
      discount: '0',
      items: [],
    },
  });

  const watchedExpense = watch('expense') || 0;
  const watchedReceived = watch('amountReceived') || '0';
  const watchedShipping = watch('shippingCharge') || '0';
  const watchedDiscount = watch('discount') || '0';

  // ── Sync items with react-hook-form ──
  useEffect(() => {
    setValue('items', items, { shouldValidate: true });
  }, [items, setValue]);

  const [adjustmentLocked, setAdjustmentLocked] = useState(false);

  // ── Auto-calculate rounding adjustment (only for new invoices or when cache is ready) ──
  useEffect(() => {
    if (adjustmentLocked) return;
    // Don't recalculate if cache is empty but items exist (cache not loaded yet)
    const cacheReady = items.every((item) => !item.productId || availableStockCache[item.productId]);
    if (!cacheReady) return;
    let totalBase = 0;
    let totalGst = 0;
    items.forEach((item) => {
      const { baseAmount, gstAmount } = getPreviewDetails(item);
      totalBase += baseAmount;
      totalGst += gstAmount;
    });
    const expenseVal = parseFloat((watchedExpense ?? 0).toString()) || 0;
    const shippingVal = parseFloat((watchedShipping ?? '0').toString()) || 0;
    const discountVal = parseFloat((watchedDiscount ?? '0').toString()) || 0;
    const allTaxRates = items.map((i) => getPreviewDetails(i).gstRate);
    const shippingGstRate = allTaxRates.includes(18) ? 18 : allTaxRates.includes(5) ? 5 : 0;
    const shippingGstAmt = shippingVal > 0 ? shippingVal * (shippingGstRate / 100) : 0;
    const raw = totalBase + totalGst + shippingGstAmt + expenseVal + shippingVal - discountVal;
    const rounding = raw - Math.round(raw);
    setValue('adjustment', rounding.toFixed(2), { shouldValidate: false, shouldDirty: false });
  }, [items, watchedExpense, watchedShipping, watchedDiscount, availableStockCache, adjustmentLocked]);

  // ── Load customers & Indian states ──
  useEffect(() => {
    dispatch(fetchCustomers({ limit: 1000 }));
  }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
        setShowStateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: 'India' }),
        });
        const result = await response.json();
        if (!result.error && result.data?.states) {
          setIndianStates(result.data.states.map((s: { name: string }) => s.name));
        }
      } catch (err) {
        console.error('Error fetching Indian states:', err);
      } finally {
        setLoadingStates(false);
      }
    };
    fetchStates();
  }, []);

  // ── Populate form when editing (Edit mode) ──
  useEffect(() => {
    if (invoice) {
      setAdjustmentLocked(true); // lock until stock cache is loaded
      reset({
        invoiceNo: invoice.invoiceNo,
        date: invoice.date.split('T')[0],
        customerId: invoice.customerId,
        saleType: invoice.saleType,
        expense: invoice.expense,
        adjustment: (invoice.adjustment ?? 0).toString(),
        amountReceived: (invoice.amountReceived ?? 0).toString(),
        referenceNo: invoice.referenceNo || '',
        shippingCharge: (invoice.shippingCharge ?? 0).toString(),
        discount: (invoice.discount ?? 0).toString(),
      });

      const mappedItems = invoice.items?.map((item) => ({
        productId: String(item.productId),
        stockBatchId: String(item.stockBatchId),
        locationId: String(item.locationId),
        saleUnit: item.saleUnit,
        quantity: item.quantity,
        ratePerUnit: item.ratePerUnit,
        description: item.description || '',
        product: item.product,
        stockBatch: item.stockBatch,
      })) || [];
      setItems(mappedItems);
      setExpandedItems(new Set(mappedItems.map((_, i) => i)));

      // Pre-populate productsCache from existing items so GST shows immediately
      const productsCacheUpdate: { [key: string]: Product } = {};
      invoice.items?.forEach((item) => {
        if (item.product) productsCacheUpdate[String(item.productId)] = item.product as Product;
      });
      if (Object.keys(productsCacheUpdate).length > 0) {
        setProductsCache((prev) => ({ ...prev, ...productsCacheUpdate }));
      }

      // Load stock batches for editing items, then unlock adjustment
      if (invoice.items) {
        const uniqueProductIds = [...new Set(invoice.items.map((i) => i.productId))];
        Promise.all(
          uniqueProductIds.map((pid) => {
            const batchIds = invoice.items?.filter((i) => i.productId === pid).map((i) => i.stockBatchId.toString()) || [];
            return loadAvailableStock(pid.toString(), batchIds);
          })
        ).then(() => setAdjustmentLocked(false));
      } else {
        setAdjustmentLocked(false);
      }
    } else {
      reset({
        invoiceNo: generateInvoiceNumber('OUT'),
        date: new Date().toISOString().split('T')[0],
        customerId: '',
        saleType: 'domestic',
        expense: 0,
        adjustment: '0',
        amountReceived: '0',
        referenceNo: '',
        shippingCharge: '0',
        discount: '0',
      });
      setItems([]);
    }
  }, [invoice, reset]);

  // ── Load Stock batches from API ──
  const loadAvailableStock = async (productId: string, includeIds?: string[]) => {
    try {
      const result = await dispatch(fetchAvailableStock({ productId, includeIds })).unwrap();
      setAvailableStockCache((prev) => ({ ...prev, [productId]: result }));
      return result;
    } catch {
      return [];
    }
  };

  // ── Calculations ──
  const getPreviewDetails = (item: OutwardItem) => {
    const stockBatches = availableStockCache[item.productId] || [];
    const selectedBatch = stockBatches.find((b) => b.id.toString() === item.stockBatchId?.toString());
    // Fallback chain: productsCache → cache batch product → item's own product (edit mode)
    const product = productsCache[item.productId] || selectedBatch?.product || item.product;
    const gstRate = product?.category?.gstRate ?? item.stockBatch?.product?.category?.gstRate ?? 0;

    const baseAmount = (item.quantity || 0) * (item.ratePerUnit || 0);
    const gstAmount = (baseAmount * gstRate) / 100;
    const totalAmount = baseAmount + gstAmount;

    return {
      gstRate,
      baseAmount,
      gstAmount,
      totalAmount,
      selectedBatch,
      product,
    };
  };

  const calculateGrandTotal = () => {
    let totalBase = 0;
    let totalGst = 0;

    items.forEach((item) => {
      const { baseAmount, gstAmount } = getPreviewDetails(item);
      totalBase += baseAmount;
      totalGst += gstAmount;
    });

    const expenseVal = parseFloat(watchedExpense.toString()) || 0;
    const shippingVal = parseFloat(watchedShipping.toString()) || 0;
    const discountVal = parseFloat(watchedDiscount.toString()) || 0;
    const allTaxRates = items.map((i) => getPreviewDetails(i).gstRate);
    const shippingGstRate = allTaxRates.includes(18) ? 18 : allTaxRates.includes(5) ? 5 : 0;
    const shippingGstAmt = shippingVal > 0 ? shippingVal * (shippingGstRate / 100) : 0;
    totalGst += shippingGstAmt;

    const rawTotal = totalBase + totalGst + expenseVal + shippingVal - discountVal;
    const adjustmentVal = rawTotal - Math.round(rawTotal); // auto rounding
    const grandTotal = Math.round(rawTotal);
    const receivedVal = parseFloat(watchedReceived.toString()) || 0;
    const balanceDue = grandTotal - receivedVal;

    return {
      totalBase,
      totalGst,
      expenseVal,
      adjustmentVal,
      shippingVal,
      discountVal,
      grandTotal,
      receivedVal,
      balanceDue,
    };
  };

  // Calculate Max stock available for selected unit
  const getMaxStock = (item: OutwardItem, isEditingRow = false, index = -1) => {
    if (!item.productId || !item.stockBatchId) return 0;
    const batches = availableStockCache[item.productId] || [];
    // Fallback to item's own stockBatch if cache not loaded yet (edit mode)
    const selectedBatch = batches.find((b) => b.id.toString() === item.stockBatchId?.toString()) || item.stockBatch;
    if (!selectedBatch) return 0;

    const addedOfSameBatchUnit = items
      .filter((added, idx) => {
        if (isEditingRow && idx === index) return false;
        return added.stockBatchId.toString() === item.stockBatchId.toString() && added.saleUnit === item.saleUnit;
      })
      .reduce((sum, added) => sum + (Number(added.quantity) || 0), 0);

    const originalItem = invoice?.items?.find(
      (oi) => oi.stockBatchId.toString() === item.stockBatchId.toString() && oi.saleUnit === item.saleUnit
    );
    const originalQty = originalItem?.quantity || 0;

    const remaining =
      item.saleUnit === 'box'
        ? selectedBatch.remainingBoxes
        : item.saleUnit === 'pack'
        ? selectedBatch.remainingPacks
        : selectedBatch.remainingPcs;

    return (remaining || 0) + (invoice ? originalQty : 0) - addedOfSameBatchUnit;
  };

  // ── Item modification handlers ──
  const handleAddItem = () => {
    if (!newItem.productId) {
      toast.error('Select a product');
      return;
    }

    const itemsToAdd: OutwardItem[] = [];

    for (const sel of newItemSelections) {
      if (!sel.stockBatchId) {
        toast.error('Select a stock batch for all selection rows');
        return;
      }
      if (!sel.quantity || sel.quantity <= 0) {
        toast.error('Quantity must be at least 1 for all selection rows');
        return;
      }

      // Check stock availability
      const batches = availableStockCache[newItem.productId] || [];
      const selectedBatch = batches.find((b) => b.id.toString() === sel.stockBatchId.toString());
      if (!selectedBatch) {
        toast.error('Selected batch not found. Please wait for stock to load.');
        return;
      }

      const product = productsCache[newItem.productId] || selectedBatch.product || newItem.product;

      // Validate quantity against remaining stock
      const addedOfSameBatchUnit = items
        .filter((added) => added.stockBatchId.toString() === sel.stockBatchId.toString() && added.saleUnit === sel.saleUnit)
        .reduce((sum, added) => sum + (Number(added.quantity) || 0), 0);

      // also check other selection rows in newItemSelections
      const otherSelections = newItemSelections
        .filter((s) => s !== sel && s.stockBatchId.toString() === sel.stockBatchId.toString() && s.saleUnit === sel.saleUnit)
        .reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);

      const originalItem = invoice?.items?.find(
        (oi) => oi.stockBatchId.toString() === sel.stockBatchId.toString() && oi.saleUnit === sel.saleUnit
      );
      const originalQty = originalItem?.quantity || 0;

      const remaining =
        sel.saleUnit === 'box'
          ? selectedBatch.remainingBoxes
          : sel.saleUnit === 'pack'
          ? selectedBatch.remainingPacks
          : selectedBatch.remainingPcs;

      const maxQty = (remaining || 0) + (invoice ? originalQty : 0) - addedOfSameBatchUnit - otherSelections;

      if (sel.quantity > maxQty) {
        toast.error(`Quantity ${sel.quantity} for batch ${selectedBatch.batchCode || selectedBatch.id} exceeds available stock of ${maxQty}`);
        return;
      }

      itemsToAdd.push({
        productId: newItem.productId,
        stockBatchId: sel.stockBatchId,
        locationId: selectedBatch.locationId?.toString() || '1',
        saleUnit: sel.saleUnit,
        quantity: sel.quantity,
        ratePerUnit: sel.ratePerUnit,
        description: newItem.description || '',
        product,
        stockBatch: selectedBatch
      });
    }

    // Append all validated items
    const updatedItems = [...items];
    itemsToAdd.forEach((itemToAdd) => {
      // Check if duplicate entry exists in main items list
      const existingIdx = updatedItems.findIndex(
        (it) => it.stockBatchId.toString() === itemToAdd.stockBatchId.toString() && it.saleUnit === itemToAdd.saleUnit
      );

      if (existingIdx >= 0) {
        updatedItems[existingIdx].quantity += itemToAdd.quantity;
      } else {
        updatedItems.push(itemToAdd);
      }
    });

    setItems(updatedItems);
    toast.success(`Items added successfully`);

    // Reset newItem & selections
    setNewItem({
      productId: '',
      stockBatchId: '',
      locationId: '',
      saleUnit: 'box',
      quantity: 1,
      ratePerUnit: 0,
      description: '',
    });
    setNewItemSelections([{ id: Math.random().toString(), stockBatchId: '', saleUnit: 'box', quantity: 1, ratePerUnit: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingData(null);
    }
  };

  const handleRemoveGroup = (productId: string, saleUnit: string, ratePerUnit: number) => {
    setItems((prev) =>
      prev.filter(
        (it) =>
          !(
            it.productId.toString() === productId.toString() &&
            it.saleUnit === saleUnit &&
            it.ratePerUnit === ratePerUnit
          )
      )
    );
    setEditingIndex(null);
    setEditingData(null);
    toast.success('Product line removed successfully');
  };

  const handleEditGroup = (productId: string, saleUnit: string, ratePerUnit: number) => {
    const matchingItems = items.filter(
      (it) =>
        it.productId.toString() === productId.toString() &&
        it.saleUnit === saleUnit &&
        it.ratePerUnit === ratePerUnit
    );
    if (matchingItems.length === 0) return;

    const firstItem = matchingItems[0];
    const product = productsCache[firstItem.productId] || firstItem.product;

    // Set main newItem with full product info so ProductSearch shows correctly
    setNewItem({
      productId: firstItem.productId,
      stockBatchId: '',
      locationId: '',
      saleUnit: firstItem.saleUnit as 'box' | 'pack' | 'piece',
      quantity: 1,
      ratePerUnit: firstItem.ratePerUnit,
      description: firstItem.description || '',
      product,
    });

    // Cache the product so ProductSearch can display it
    if (product) {
      setProductsCache((prev) => ({ ...prev, [firstItem.productId]: product }));
    }

    // Populate multi-selection row splits
    const selections = matchingItems.map((it) => ({
      id: Math.random().toString(),
      stockBatchId: it.stockBatchId,
      saleUnit: it.saleUnit as 'box' | 'pack' | 'piece',
      quantity: it.quantity,
      ratePerUnit: it.ratePerUnit,
    }));
    setNewItemSelections(selections);

    // Load fresh stock for this product including existing batch ids (so they show in dropdown)
    const batchIds = matchingItems.map((it) => it.stockBatchId.toString());
    loadAvailableStock(firstItem.productId.toString(), batchIds);

    // Remove matching items from list (loaded back to form for editing)
    setItems((prev) =>
      prev.filter(
        (it) =>
          !(
            it.productId.toString() === productId.toString() &&
            it.saleUnit === saleUnit &&
            it.ratePerUnit === ratePerUnit
          )
      )
    );

    toast.success('Item loaded into form for editing');
  };

  const toggleItemCollapse = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      return newSet;
    });
  };

  // Submit form data
  const onSubmit = async (data: OutwardInvoiceFormData) => {
    try {
      if (invoice) {
        await dispatch(updateOutwardInvoice({ id: invoice.id, data })).unwrap();
        toast.success('Outward invoice updated successfully');
      } else {
        await dispatch(createOutwardInvoice(data)).unwrap();
        toast.success('Outward invoice created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save invoice');
    }
  };

  // ── Search & Filter Options ──
  const customerOptions = customers.map((c) => ({
    value: c.id.toString(),
    label: `${c.code} - ${c.name}`,
  }));

  const saleTypeOptions = [
    { value: 'domestic', label: 'Domestic' },
    { value: 'export', label: 'Export' },
  ];

  const saleUnitOptions = [
    { value: 'box', label: 'Box' },
    { value: 'pack', label: 'Pack' },
    { value: 'piece', label: 'Piece' },
  ];

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Control Breadcrumb Bar */}
      <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="hover:text-primary-600 cursor-pointer" onClick={onCancel}>
            Outward Invoices
          </span>
          <span>/</span>
          <span className="font-semibold text-gray-700">
            {invoice ? invoice.invoiceNo : 'New Invoice'}
          </span>
        </div>
      </div>

      {/* Main Odoo Sheet */}
      <div className="bg-white border border-gray-200 rounded shadow-md p-4 sm:p-5 max-w-5xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            {/* Searchable Customer Dropdown */}
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => {
                const [custSearch, setCustSearch] = useState('');
                const [custOpen, setCustOpen] = useState(false);
                
                useEffect(() => {
                  if (field.value) {
                    const sel = customerOptions.find((o) => o.value === String(field.value));
                    if (sel) setCustSearch(sel.label);
                  } else {
                    setCustSearch('');
                  }
                }, [field.value, customerOptions]);

                const filtered = customerOptions.filter((o) =>
                  o.label.toLowerCase().includes(custSearch.toLowerCase())
                );

                return (
                  <div className="relative">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Customer *</label>
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="Search customer..."
                      value={custSearch}
                      onChange={(e) => {
                        setCustSearch(e.target.value);
                        field.onChange('');
                        setCustOpen(true);
                      }}
                      onFocus={() => setCustOpen(true)}
                      onBlur={() => setTimeout(() => setCustOpen(false), 150)}
                      className="w-full border border-gray-300 rounded px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <input type="text" required value={field.value || ''} onChange={() => {}} className="sr-only" tabIndex={-1} />
                    {errors.customerId && <p className="text-[10px] text-red-650 mt-0.5">{errors.customerId.message}</p>}
                    
                    {custOpen && (
                      <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto mt-1">
                        {filtered.map((o) => (
                          <li
                            key={o.value}
                            onMouseDown={() => {
                              field.onChange(o.value);
                              setCustSearch(o.label);
                              setCustOpen(false);
                            }}
                            className="px-3 py-1.5 cursor-pointer hover:bg-blue-50 text-xs"
                          >
                            {o.label}
                          </li>
                        ))}
                        <li className="border-t border-gray-200 px-3 py-1.5 sticky bottom-0 bg-gray-50">
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setAddCustomerModalOpen(true);
                            }}
                            className="w-full text-left text-xs text-blue-600 hover:text-blue-755 font-medium flex items-center gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add New Customer
                          </button>
                        </li>
                        {filtered.length === 0 && <li className="px-3 py-1.5 text-xs text-gray-400">No customers found</li>}
                      </ul>
                    )}
                  </div>
                );
              }}
            />

            <div className="grid grid-cols-3 gap-2">
              <Select
                label="Sale Type"
                options={saleTypeOptions}
                error={errors.saleType?.message}
                {...register('saleType')}
              />
              <Input label="Ref#" placeholder="SO-0001" {...register('referenceNo')} />
              <Input
                label="Expense"
                type="number"
                step="0.01"
                min="0"
                error={errors.expense?.message}
                {...register('expense', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Outward Items Section */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-gray-800">Outward Items & Lines</h3>
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

            {/* Input fields to add new items */}
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-4 mb-4">
              <div className="grid grid-cols-1 gap-3">
                <ProductSearch
                  value={newItem.productId}
                  onChange={(productId, prod) => {
                    setNewItem({
                      ...newItem,
                      productId,
                      stockBatchId: '',
                      locationId: '',
                      ratePerUnit: 0,
                      description: prod?.description || '',
                    });
                    if (prod) setProductsCache((prev) => ({ ...prev, [productId]: prod }));
                    if (productId) {
                      loadAvailableStock(productId.toString()).then((batches) => {
                        const defaultBatch = batches[0];
                        const defaultUnit = 'box';
                        const suggestedRate = defaultBatch ? defaultBatch.costPerBox * 1.2 : 0;
                        setNewItemSelections([{
                          id: Math.random().toString(),
                          stockBatchId: defaultBatch ? defaultBatch.id.toString() : '',
                          saleUnit: defaultUnit,
                          quantity: 1,
                          ratePerUnit: Math.round(suggestedRate * 100) / 100
                        }]);
                      });
                    } else {
                      setNewItemSelections([{ id: Math.random().toString(), stockBatchId: '', saleUnit: 'box', quantity: 1, ratePerUnit: 0 }]);
                    }
                  }}
                />
              </div>

              {newItem.productId && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-gray-700">Stock Batches & Quantities Selection</div>
                  
                  <div className="space-y-2">
                    {newItemSelections.map((sel, idx) => {
                      const batches = availableStockCache[newItem.productId] || [];
                      const stockBatchOptions = batches.map((batch) => ({
                        value: batch.id.toString(),
                        line1: `[${batch.location?.name}] ${batch.vendor?.name} - ${formatDate(batch.inwardDate)}`,
                        line2: `${batch.remainingBoxes} boxes, ${batch.packPerBox} pack/box, ${batch.remainingPacks || 0} packs, ${batch.packPerPiece} pcs/pack, ${batch.remainingPcs} pcs`,
                      }));

                      // Calculate max stock available for this row
                      const maxQty = (() => {
                        if (!newItem.productId || !sel.stockBatchId) return 0;
                        const selectedBatch = batches.find((b) => b.id.toString() === sel.stockBatchId.toString());
                        if (!selectedBatch) return 0;

                        const addedOfSameBatchUnit = items
                          .filter((added) => added.stockBatchId.toString() === sel.stockBatchId.toString() && added.saleUnit === sel.saleUnit)
                          .reduce((sum, added) => sum + (Number(added.quantity) || 0), 0);

                        const otherSelections = newItemSelections
                          .filter((s, i) => i !== idx && s.stockBatchId.toString() === sel.stockBatchId.toString() && s.saleUnit === sel.saleUnit)
                          .reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);

                        const originalItem = invoice?.items?.find(
                          (oi) => oi.stockBatchId.toString() === sel.stockBatchId.toString() && oi.saleUnit === sel.saleUnit
                        );
                        const originalQty = originalItem?.quantity || 0;

                        const remaining =
                          sel.saleUnit === 'box'
                            ? selectedBatch.remainingBoxes
                            : sel.saleUnit === 'pack'
                            ? selectedBatch.remainingPacks
                            : selectedBatch.remainingPcs;

                        return (remaining || 0) + (invoice ? originalQty : 0) - addedOfSameBatchUnit - otherSelections;
                      })();

                      return (
                        <div key={sel.id} style={{ zIndex: newItemSelections.length - idx }} className="flex flex-col lg:flex-row items-stretch lg:items-end gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-primary-200 transition-colors duration-150 relative">
                          {/* Stock Batch Select */}
                          <div className="flex-1 min-w-[280px]">
                            <MultiLineSelect
                              options={stockBatchOptions}
                              value={sel.stockBatchId}
                              onChange={(val) => {
                                const selectedBatch = batches.find((b) => b.id.toString() === val.toString());
                                const suggestedRate = selectedBatch
                                  ? (sel.saleUnit === 'box'
                                      ? selectedBatch.costPerBox * 1.2
                                      : sel.saleUnit === 'pack'
                                      ? (selectedBatch.costPerPack || selectedBatch.costPerBox / (selectedBatch.packPerBox || 1)) * 1.2
                                      : selectedBatch.costPerPcs * 1.2)
                                  : 0;

                                const updated = [...newItemSelections];
                                updated[idx] = {
                                  ...sel,
                                  stockBatchId: val,
                                  ratePerUnit: Math.round(suggestedRate * 100) / 100
                                };
                                setNewItemSelections(updated);
                              }}
                              placeholder="Select stock batch"
                              showLabel={true}
                            />
                          </div>

                          {/* Sale Unit Dropdown */}
                          <div className="w-full lg:w-28">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Sale Unit *</label>
                            <select
                              className="w-full h-8.5 border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white font-medium text-gray-800 shadow-sm"
                              value={sel.saleUnit}
                              onChange={(e) => {
                                const unit = e.target.value as 'box' | 'pack' | 'piece';
                                const selectedBatch = batches.find((b) => b.id.toString() === sel.stockBatchId.toString());
                                const suggestedRate = selectedBatch
                                  ? (unit === 'box'
                                      ? selectedBatch.costPerBox * 1.2
                                      : unit === 'pack'
                                      ? (selectedBatch.costPerPack || selectedBatch.costPerBox / (selectedBatch.packPerBox || 1)) * 1.2
                                      : selectedBatch.costPerPcs * 1.2)
                                  : 0;

                                const updated = [...newItemSelections];
                                updated[idx] = {
                                  ...sel,
                                  saleUnit: unit,
                                  ratePerUnit: Math.round(suggestedRate * 100) / 100
                                };
                                setNewItemSelections(updated);
                              }}
                            >
                              <option value="box">Box</option>
                              <option value="pack">Pack</option>
                              <option value="piece">Piece</option>
                            </select>
                          </div>

                          {/* Quantity Input */}
                          <div className="w-full lg:w-28">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Qty * <span className="text-[10px] text-gray-400 font-normal">(Max: {maxQty})</span>
                            </label>
                            <input
                              type="number"
                              className="w-full h-8.5 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 font-bold"
                              placeholder={`Max: ${maxQty}`}
                              value={sel.quantity || ''}
                              onChange={(e) => {
                                const updated = [...newItemSelections];
                                updated[idx] = { ...sel, quantity: Number(e.target.value) || 0 };
                                setNewItemSelections(updated);
                              }}
                              min="1"
                            />
                          </div>

                          {/* Rate Input */}
                          <div className="w-full lg:w-28">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Rate *</label>
                            <input
                              type="number"
                              step="0.01"
                              className="w-full h-8.5 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="Rate"
                              value={sel.ratePerUnit || ''}
                              onChange={(e) => {
                                const updated = [...newItemSelections];
                                updated[idx] = { ...sel, ratePerUnit: Number(e.target.value) || 0 };
                                setNewItemSelections(updated);
                              }}
                              min="0"
                            />
                          </div>

                          {/* Action Button */}
                          <div className="flex items-center justify-end pb-1 h-8.5">
                            {newItemSelections.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewItemSelections(newItemSelections.filter((_, i) => i !== idx));
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-55/60 hover:text-red-700 rounded-md transition-colors border border-red-100 lg:border-none"
                                title="Remove batch selection"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const batches = availableStockCache[newItem.productId] || [];
                      const defaultBatch = batches[0] ? batches[0].id.toString() : '';
                      const suggestedRate = batches[0] ? batches[0].costPerBox * 1.2 : 0;
                      setNewItemSelections([
                        ...newItemSelections,
                        {
                          id: Math.random().toString(),
                          stockBatchId: defaultBatch,
                          saleUnit: 'box',
                          quantity: 1,
                          ratePerUnit: Math.round(suggestedRate * 100) / 100
                        }
                      ]);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-750 hover:underline transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Another Batch Row
                  </button>

                  <div className="flex flex-col gap-1 mt-2">
                    <label className="text-[10px] font-semibold text-gray-700">Line Description</label>
                    <input
                      type="text"
                      placeholder="Line description details..."
                      className="w-full text-xs p-1 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-primary-500"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="button" onClick={handleAddItem} className="odoo-btn-primary px-3 h-7 text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Items to List
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Added Items List Table */}
            {items.length > 0 ? (
              <div className="odoo-table-container">
                <table className="odoo-table table-responsive">
                  <thead>
                    <tr className="bg-gray-50 text-gray-650 text-[10px] sm:text-xs">
                      <th className="w-8 text-center p-2">#</th>
                      <th className="min-w-[150px] p-2 text-left">Product</th>
                      <th className="w-24 p-2 text-left">SKU</th>
                      <th className="min-w-[150px] p-2 text-left">Stock Batch</th>
                      <th className="w-20 p-2 text-left">Unit</th>
                      <th className="w-20 p-2 text-center">Qty</th>
                      <th className="w-20 p-2 text-left">Rate</th>
                      <th className="min-w-[100px] p-2 text-right">GST</th>
                      <th className="min-w-[100px] p-2 text-right">Total</th>
                      <th className="w-16 p-2 text-center">Info</th>
                      <th className="w-16 p-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const groupedItemsMap = new Map<string, any>();
                      items.forEach((item, originalIndex) => {
                        const key = `${item.productId}-${item.saleUnit}-${item.ratePerUnit}`;
                        if (groupedItemsMap.has(key)) {
                          const existing = groupedItemsMap.get(key)!;
                          existing.quantity += item.quantity;
                          existing.originalIndices.push(originalIndex);
                          if (item.stockBatch && !existing.stockBatches.some((b: any) => b.id.toString() === item.stockBatchId.toString())) {
                            existing.stockBatches.push(item.stockBatch);
                          }
                          if (item.description && !existing.descriptions.includes(item.description)) {
                            existing.descriptions.push(item.description);
                          }
                        } else {
                          groupedItemsMap.set(key, {
                            ...item,
                            originalIndices: [originalIndex],
                            stockBatches: item.stockBatch ? [item.stockBatch] : [],
                            descriptions: item.description ? [item.description] : [],
                          });
                        }
                      });
                      const grouped = Array.from(groupedItemsMap.values());

                      return grouped.map((item, idx) => {
                        const { gstRate, gstAmount, totalAmount, product } = getPreviewDetails(item);

                        return (
                          <React.Fragment key={idx}>
                            <tr className="border-b border-gray-150 hover:bg-gray-50/40">
                              <td className="p-2 text-center text-gray-500 font-bold text-xs" data-label="#">{idx + 1}</td>
                              <td className="p-2 min-w-[150px]" data-label="Product">
                                <div className="font-semibold text-xs text-gray-800">
                                  {product?.name || 'Unknown Product'}
                                  {product?.grade && <span className="ml-1 text-[10px] text-gray-500 font-normal">({product.grade})</span>}
                                </div>
                                {item.descriptions.length > 0 && (
                                  <div className="text-[9px] text-gray-500 italic mt-0.5">{item.descriptions.join(', ')}</div>
                                )}
                              </td>
                              <td className="p-2 text-xs text-gray-800" data-label="SKU">{product?.sku || '—'}</td>
                              <td className="p-2 min-w-[150px] text-xs text-gray-700" data-label="Stock Batch">
                                {item.stockBatches.length > 0 ? (
                                  <div>
                                    {item.stockBatches.map((batch: any, bIdx: number) => {
                                      const matchingItems = items.filter(
                                        (it) => it.productId.toString() === item.productId.toString() && it.stockBatchId.toString() === batch.id.toString() && it.saleUnit === item.saleUnit
                                      );
                                      const batchQty = matchingItems.reduce((sum, it) => sum + it.quantity, 0);
                                      return (
                                        <div key={bIdx} className="mb-1 last:mb-0 border-b last:border-0 border-gray-150 pb-1 last:pb-0">
                                          <div className="font-medium text-[10px]">
                                            {`[${batch.location?.name}] ${batch.vendor?.name} `}
                                            <span className="text-primary-600 font-bold ml-1">({batchQty} {item.saleUnit}s)</span>
                                          </div>
                                          <div className="text-[9px] text-gray-400">{`Inward: ${formatDate(batch.inwardDate)}`}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  'N/A'
                                )}
                              </td>
                              <td className="p-2 text-xs text-gray-800 uppercase" data-label="Unit">{item.saleUnit}</td>
                              <td className="p-2 text-center text-xs text-gray-800 font-bold" data-label="Qty">{item.quantity}</td>
                              <td className="p-2 text-xs text-gray-800" data-label="Rate">{formatCurrency(item.ratePerUnit)}</td>
                              <td className="p-2 text-right text-[10px]" data-label="GST">
                                <div className="text-gray-800">{formatCurrency(gstAmount)}</div>
                                <div className="text-[8px] text-gray-400 font-bold">({gstRate}%)</div>
                              </td>
                              <td className="p-2 text-right text-xs font-extrabold text-primary-650" data-label="Total">{formatCurrency(totalAmount)}</td>
                              <td className="p-2 text-center" data-label="Info">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    toggleItemCollapse(idx);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors mx-auto"
                                >
                                  {expandedItems.has(idx) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  <span>Detail</span>
                                </button>
                              </td>
                              <td className="p-2 text-center" data-label="Actions">
                                <div className="flex gap-1.5 justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleEditGroup(item.productId, item.saleUnit, item.ratePerUnit)}
                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveGroup(item.productId, item.saleUnit, item.ratePerUnit)}
                                    className="text-red-500 hover:text-red-700 text-lg font-bold leading-none"
                                    title="Remove"
                                  >
                                    ×
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Info Details Row */}
                            {expandedItems.has(idx) && (
                              <tr className="bg-gray-50/45 border-b border-gray-150">
                                <td colSpan={11} className="p-2.5">
                                  <div className="space-y-3 pl-4 border-l-2 border-primary-500 text-[10px] leading-tight text-gray-600">
                                    {item.stockBatches.map((batch: any, bIdx: number) => (
                                      <div key={bIdx} className="space-y-1 py-1 border-b last:border-b-0 border-gray-200/40 pb-1.5 last:pb-0">
                                        <div className="font-bold text-gray-700 text-[11px] mb-0.5">
                                          Batch: {batch.batchCode || batch.id} ({`[${batch.location?.name}] ${batch.vendor?.name}`})
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                          <div><span className="font-bold">Original Batch Stock:</span> {batch.boxes} boxes / {batch.totalPacks} packs / {batch.totalPcs} pcs</div>
                                          <div><span className="font-bold">Remaining Batch Stock:</span> {batch.remainingBoxes} boxes / {batch.totalPacks ? batch.remainingPacks : 0} packs / {batch.remainingPcs} pcs</div>
                                          <div><span className="font-bold">Costing:</span> ₹{batch.costPerBox}/box, ₹{batch.costPerPack || (batch.costPerBox / (batch.packPerBox || 1)).toFixed(2)}/pack, ₹{batch.costPerPcs}/pcs</div>
                                        </div>
                                      </div>
                                    ))}
                                    {item.descriptions.length > 0 && (
                                      <div>
                                        <span className="font-bold block text-[9px] uppercase tracking-wider text-gray-400 mb-0.5">Line Description</span>
                                        <div className="text-xs text-gray-800 italic">{item.descriptions.join(', ')}</div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-gray-300 rounded text-xs text-gray-400">
                No items added to this invoice yet. Select a product and batch above to add items.
              </div>
            )}
          </div>

          {/* Rounding & Received inputs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
            <Input label="Shipping Charge" type="number" step="0.01" min="0" {...register('shippingCharge')} placeholder="500.00" />
            <Input label="Discount" type="number" step="0.01" min="0" {...register('discount')} placeholder="100.00" />
            <Input label="Amount Rounding" type="number" step="0.01" readOnly {...register('adjustment')} placeholder="Auto-calculated" />
            <Input label="Amount Received" type="number" step="0.01" min="0" error={errors.amountReceived?.message} {...register('amountReceived')} placeholder="5000.00" />
          </div>

          {/* Grand Total Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              {(() => {
                const { totalBase, totalGst, expenseVal, adjustmentVal, shippingVal, discountVal, grandTotal, receivedVal, balanceDue } = calculateGrandTotal();
                return (
                  <div className="w-full sm:w-auto sm:min-w-[300px] bg-green-50 border border-green-200 p-4 rounded space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(totalBase)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Total Tax:</span>
                      <span className="font-semibold text-gray-900">+{formatCurrency(totalGst)}</span>
                    </div>
                    {expenseVal > 0 && (
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Additional Expense:</span>
                        <span className="font-semibold">{formatCurrency(expenseVal)}</span>
                      </div>
                    )}
                    {shippingVal > 0 && (
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Shipping Charge:</span>
                        <span className="font-semibold">{formatCurrency(shippingVal)}</span>
                      </div>
                    )}
                    {discountVal > 0 && (
                      <div className="flex justify-between text-xs text-red-650">
                        <span>Discount:</span>
                        <span className="font-semibold">- {formatCurrency(discountVal)}</span>
                      </div>
                    )}
                    {adjustmentVal !== 0 && (
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Round Off:</span>
                        <span className="font-semibold">
                          {adjustmentVal < 0 ? '+' : '-'}{formatCurrency(Math.abs(adjustmentVal))}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-green-200 pt-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-gray-700">Grand Total:</span>
                        <span className="text-lg font-bold text-green-700">{formatCurrency(grandTotal)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-emerald-600 font-medium mt-1">
                        <span>Amount Received:</span>
                        <span>{formatCurrency(receivedVal)}</span>
                      </div>
                      <div className={`flex justify-between text-xs font-bold border-t border-dashed border-green-300 pt-2 mt-1.5 ${balanceDue > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        <span>Balance Due:</span>
                        <span>{formatCurrency(balanceDue)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <Button
              type="submit"
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
        </form>
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={addCustomerModalOpen}
        onClose={() => {
          setAddCustomerModalOpen(false);
          setNewCustomerData({ name: '', email: '', phone: '', address: '', state: '', gstNumber: '' });
          setStateSearch('');
          setShowStateDropdown(false);
        }}
        title="Add New Customer"
        size="lg"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const created = await dispatch(createCustomer({
                name: newCustomerData.name,
                email: newCustomerData.email,
                phone: newCustomerData.phone,
                address: newCustomerData.address,
                state: newCustomerData.state,
                gstNumber: newCustomerData.gstNumber,
              })).unwrap();
              toast.success('Customer added successfully');
              await dispatch(fetchCustomers({ limit: 1000 }));
              setValue('customerId', String(created.id), { shouldValidate: true });
              setAddCustomerModalOpen(false);
              setNewCustomerData({ name: '', email: '', phone: '', address: '', state: '', gstNumber: '' });
              setStateSearch('');
              setShowStateDropdown(false);
            } catch (error: any) {
              toast.error(error?.message || 'Failed to add customer');
            }
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Customer Name"
              placeholder="Enter customer name"
              value={newCustomerData.name}
              onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="Enter email address"
              value={newCustomerData.email}
              onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
            />
            <Input
              label="Phone"
              placeholder="Enter phone number"
              value={newCustomerData.phone}
              onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
            />
            <Input
              label="Address"
              placeholder="Enter address"
              value={newCustomerData.address}
              onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
            />

            {/* Searchable State Dropdown */}
            <div className="relative space-y-1" ref={stateDropdownRef}>
              <label className="block text-xs font-medium text-gray-700">State (Optional)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search or Indian state/UT"
                  className={cn('flex h-8.5 w-full rounded border border-gray-300 bg-white pl-3 pr-10 py-1.5 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500')}
                  value={stateSearch}
                  onChange={(e) => {
                    setStateSearch(e.target.value);
                    setNewCustomerData({ ...newCustomerData, state: e.target.value });
                    setShowStateDropdown(true);
                  }}
                  onFocus={() => setShowStateDropdown(true)}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {stateSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setStateSearch('');
                        setNewCustomerData({ ...newCustomerData, state: '' });
                        setShowStateDropdown(true);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
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
                    <div className="px-4 py-3 text-gray-500">Fetching Indian states...</div>
                  ) : indianStates.filter((s) => s.toLowerCase().includes(stateSearch.toLowerCase())).length > 0 ? (
                    indianStates.filter((s) => s.toLowerCase().includes(stateSearch.toLowerCase())).map((state) => (
                      <button
                        key={state}
                        type="button"
                        className={cn('w-full text-left px-4 py-1.5 hover:bg-primary-50', stateSearch.toLowerCase() === state.toLowerCase() && 'bg-primary-50 font-medium')}
                        onClick={() => {
                          setStateSearch(state);
                          setNewCustomerData({ ...newCustomerData, state });
                          setShowStateDropdown(false);
                        }}
                      >
                        {state}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-400 italic">No matching states found</div>
                  )}
                </div>
              )}
            </div>

            <Input
              label="GST Number"
              placeholder="Enter GST number"
              value={newCustomerData.gstNumber || ''}
              onChange={(e) => setNewCustomerData({ ...newCustomerData, gstNumber: e.target.value })}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddCustomerModalOpen(false);
                setNewCustomerData({ name: '', email: '', phone: '', address: '', state: '', gstNumber: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Add Customer
            </Button>
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

export default AddEditOutward;