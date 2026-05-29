import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Trash2,
  Eye,
  Upload,
  Download,
  Edit,
  ChevronDown,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchOutwardInvoices,
  fetchOutwardInvoiceById,
  createOutwardInvoice,
  updateOutwardInvoice,
  deleteOutwardInvoice,
  clearError,
} from '@/slices/outwardSlice';
import { fetchAvailableStock } from '@/slices/inventorySlice';
import { fetchCustomers, createCustomer } from '@/slices/customerSlice';
import { bulkUploadService } from '@/services/bulkUploadService';
import { outwardService } from '@/services/outwardService';
import { OutwardInvoice, StockBatch, Product } from '@/types';
import {
  formatDate,
  formatCurrency,
  generateInvoiceNumber,
  debounce,
  cn,
} from '@/utils';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import ProductSearch from '@/components/ProductSearch';
import BulkUpload from '@/components/BulkUpload';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';

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
  items: {
    productId: string;
    stockBatchId: string;
    locationId: string;
    saleUnit: 'box' | 'pack' | 'piece';
    quantity: number;
    ratePerUnit: number;
    description: string;
  }[];
}

const outwardSchema = z.object({
  invoiceNo: z.string().min(1, 'Invoice number is required'),
  date: z.string().min(1, 'Date is required'),
  customerId: z.union([z.string(), z.number()]).transform(val => val.toString()),
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
        productId: z.union([z.string(), z.number()]).transform(val => val.toString()),
        stockBatchId: z.union([z.string(), z.number()]).transform(val => val.toString()),
        locationId: z.union([z.string(), z.number()]).transform(val => val.toString()),
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

// Multi-line Select Component
interface MultiLineOption {
  value: string;
  line1: string;
  line2: string;
}

interface MultiLineSelectProps {
  label?: string;
  options: MultiLineOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

const MultiLineSelect: React.FC<MultiLineSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select option',
  disabled = false,
  error,
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
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-500'
          )}
        >
          <div className="text-left flex-1 min-w-0">
            {selectedOption ? (
              <div className="space-y-0.5">
                <div className="font-medium truncate">{selectedOption.line1}</div>
                <div className="text-xs text-gray-600 truncate">{selectedOption.line2}</div>
              </div>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <ChevronDown className={cn('h-4 w-4 ml-2 flex-shrink-0 transition-transform', isOpen && 'rotate-180')} />
        </button>
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md bg-white border border-gray-300 shadow-lg">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0',
                  value === option.value && 'bg-primary-50'
                )}
              >
                <div className="space-y-0.5">
                  <div className="font-medium text-sm">{option.line1}</div>
                  <div className="text-xs text-gray-600">{option.line2}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

const Outward: React.FC = () => {
  const dispatch = useAppDispatch();
  const { invoices, pagination, loading, error } =
    useAppSelector((state) => state.outward);
  const { customers } = useAppSelector((state) => state.customers);
  const [availableStockCache, setAvailableStockCache] = useState<{
    [key: string]: StockBatch[];
  }>({});
  const [productsCache, setProductsCache] = useState<{
    [key: string]: Product;
  }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', email: '', phone: '', address: '', state: '', gstNumber: '' });
  const [stateSearch, setStateSearch] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const [indianStates, setIndianStates] = useState<string[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OutwardInvoice | null>(
    null
  );
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentTxnId, setPaymentTxnId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<number | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<OutwardInvoice | null>(
    null
  );
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
      items: [
        {
          productId: '',
          stockBatchId: '',
          locationId: '',
          saleUnit: 'box',
          quantity: 1,
          ratePerUnit: 0,
        },
      ],
      expense: 0,
      adjustment: '0',
      amountReceived: '0',
      referenceNo: '',
      shippingCharge: '0',
      discount: '0',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const watchedExpense = watch('expense') || 0;
  const watchedAdjustment = watch('adjustment') || '0';
  const watchedReceived = watch('amountReceived') || '0';
  const watchedShipping = watch('shippingCharge') || '0';
  const watchedDiscount = watch('discount') || '0';

  const calculateGrandTotal = () => {
    let totalBase = 0;
    let totalGst = 0;

    watchedItems.forEach((item) => {
      if (!item?.productId || !item?.quantity || !item?.ratePerUnit) return;
      
      const stockBatches = availableStockCache[item.productId] || [];
      const selectedBatch = stockBatches.find(
        (b) => b.id.toString() === item.stockBatchId?.toString()
      );
      const product = productsCache[item.productId] || selectedBatch?.product;
      const gstRate = product?.category?.gstRate || 0;
      const baseAmount = item.quantity * item.ratePerUnit;
      const gstAmount = (baseAmount * gstRate) / 100;
      
      totalBase += baseAmount;
      totalGst += gstAmount;
    });

    const expenseVal = parseFloat(watchedExpense.toString()) || 0;
    const adjustmentVal = parseFloat(watchedAdjustment.toString()) || 0;
    const shippingVal = parseFloat(watchedShipping.toString()) || 0;
    const discountVal = parseFloat(watchedDiscount.toString()) || 0;
    const grandTotal = totalBase + totalGst + expenseVal + shippingVal - adjustmentVal - discountVal;
    const receivedVal = parseFloat(watchedReceived.toString()) || 0;
    const balanceDue = grandTotal - receivedVal;

    return { totalBase, totalGst, expenseVal, adjustmentVal, shippingVal, discountVal, grandTotal, receivedVal, balanceDue };
  };

  useEffect(() => {
    dispatch(fetchOutwardInvoices({ page: currentPage, limit: 10, search, startDate, endDate }));
    loadMasterData();
  }, [dispatch, search, currentPage, startDate, endDate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        stateDropdownRef.current &&
        !stateDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ country: 'India' }),
        });
        const result = await response.json();
        if (!result.error && result.data && result.data.states) {
          const statesList = result.data.states.map((s: { name: string }) => s.name);
          setIndianStates(statesList);
        } else {
          throw new Error('Failed to fetch from API');
        }
      } catch (err) {
        console.error('Error fetching Indian states:', err);
      } finally {
        setLoadingStates(false);
      }
    };

    fetchStates();
  }, []);

  const loadMasterData = async () => {
    dispatch(fetchCustomers({ limit: 1000 }));
  };

  const loadAvailableStock = async (productId: string, includeIds?: string[]) => {
    try {
      const result = await dispatch(
        fetchAvailableStock({ productId, includeIds })
      ).unwrap();
      setAvailableStockCache((prev) => ({
        ...prev,
        [productId]: result,
      }));
      return result;
    } catch (error) {
      console.error('Failed to load stock:', error);
      return [];
    }
  };

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const handleDateFilter = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setCurrentPage(1);
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const toggleItem = (index: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };


  const openModal = () => {
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
      items: [
        {
          productId: '',
          stockBatchId: '',
          locationId: '',
          saleUnit: 'box',
          quantity: 1,
          ratePerUnit: 0,
          description: '',
        },
      ],
    });
    setAvailableStockCache({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingInvoice(null);
    reset();
    setAvailableStockCache({});
  };

  const editInvoice = async (invoice: OutwardInvoice) => {
    try {
      console.log('🔵 Edit Invoice - Starting for ID:', invoice.id);
      const fullInvoice = await dispatch(fetchOutwardInvoiceById(invoice.id)).unwrap();
      console.log('🟢 Edit Invoice - Fetched data:', fullInvoice);
      
      if (fullInvoice) {
        setEditingInvoice(fullInvoice);

        // Populate form with existing data
        const formData = {
          invoiceNo: fullInvoice.invoiceNo,
          date: fullInvoice.date.split('T')[0],
          customerId: fullInvoice.customerId,
          saleType: fullInvoice.saleType,
          expense: fullInvoice.expense,
          adjustment: (fullInvoice.adjustment ?? 0).toString(),
          amountReceived: (fullInvoice.amountReceived ?? 0).toString(),
          referenceNo: fullInvoice.referenceNo || '',
          shippingCharge: (fullInvoice.shippingCharge ?? 0).toString(),
          discount: (fullInvoice.discount ?? 0).toString(),
          items: fullInvoice.items?.map((item) => ({
            productId: item.productId,
            stockBatchId: item.stockBatchId,
            locationId: item.locationId,
            saleUnit: item.saleUnit,
            quantity: item.quantity,
            ratePerUnit: item.ratePerUnit,
            description: item.description || '',
          })) || [
            {
              productId: '',
              stockBatchId: '',
              locationId: '',
              saleUnit: 'box',
              quantity: 1,
              ratePerUnit: 0,
              description: '',
            },
          ],
        };
        console.log('🟡 Edit Invoice - Form data prepared:', formData);
        reset(formData);

        // Expand all existing items so stock batches are visible
        setExpandedItems(new Set(formData.items.map((_, i) => i)));

        // Load stock for existing items before opening modal, including sold-out batches
        if (fullInvoice.items) {
          const items = fullInvoice.items;
          const uniqueProductIds = [...new Set(items.map(i => i.productId))];
          await Promise.all(
            uniqueProductIds.map(pid => {
              const batchIdsForProduct = items
                .filter(i => i.productId === pid)
                .map(i => i.stockBatchId.toString());
              return loadAvailableStock(pid.toString(), batchIdsForProduct);
            })
          );
        }

        setModalOpen(true);
        console.log('✅ Edit Invoice - Modal opened with data');
      }
    } catch (error) {
      console.error('❌ Edit Invoice - Failed to load:', error);
    }
  };

  const viewInvoice = async (invoice: OutwardInvoice) => {
    try {
      console.log('🔵 View Invoice - Starting for ID:', invoice.id);
      const fullInvoice = await dispatch(fetchOutwardInvoiceById(invoice.id)).unwrap();
      console.log('🟢 View Invoice - Fetched data:', fullInvoice);
      setSelectedInvoice(fullInvoice);
      setViewModalOpen(true);
      console.log('✅ View Invoice - Modal opened');
    } catch (error) {
      console.error('❌ View Invoice - Failed to load:', error);
    }
  };

  const onSubmit = async (data: OutwardInvoiceFormData) => {
    try {
      if (editingInvoice) {
        await dispatch(
          updateOutwardInvoice({ id: editingInvoice.id, data })
        ).unwrap();
        toast.success('Outward invoice updated successfully');
      } else {
        await dispatch(createOutwardInvoice(data)).unwrap();
        toast.success('Outward invoice created successfully');
      }
      closeModal();
      dispatch(fetchOutwardInvoices({ page: currentPage, limit: 10, search }));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save invoice');
    }
  };

  const deleteInvoice = async (invoice: OutwardInvoice) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await dispatch(deleteOutwardInvoice(invoice.id)).unwrap();
        toast.success('Outward invoice deleted successfully');
        dispatch(fetchOutwardInvoices({ page: currentPage, limit: 10, search }));
      } catch (error) {
        // Error handled by Redux
      }
    }
  };

  const handleProductChange = (
    index: number,
    productId: string,
    product?: Product
  ) => {
    setValue(`items.${index}.productId`, productId);
    setValue(`items.${index}.stockBatchId`, '');
    setValue(`items.${index}.locationId`, '');
    setValue(`items.${index}.ratePerUnit`, 0);
    setValue(`items.${index}.description`, product?.description || '');

    if (product) {
      setProductsCache(prev => ({ ...prev, [productId]: product }));
    }

    if (productId) {
      loadAvailableStock(productId.toString());
    }
  };

  const handleStockBatchChange = (index: number, stockBatchId: string) => {
    setValue(`items.${index}.stockBatchId`, stockBatchId);

    const item = watchedItems[index];
    const stockBatches = availableStockCache[item?.productId] || [];
    const selectedBatch = stockBatches.find((b) => b.id.toString() === stockBatchId);

    if (selectedBatch) {
      // Auto-set locationId from the selected stock batch
      setValue(`items.${index}.locationId`, selectedBatch.locationId?.toString() || '');

      const suggestedRate =
        item?.saleUnit === 'box'
          ? selectedBatch.costPerBox * 1.2
          : item?.saleUnit === 'pack'
            ? (selectedBatch.costPerPack ||
                selectedBatch.costPerBox / (selectedBatch.packPerBox || 1)) *
              1.2
            : selectedBatch.costPerPcs * 1.2;
      setValue(
        `items.${index}.ratePerUnit`,
        Math.round(suggestedRate * 100) / 100
      );
    }
  };



  const calculateInvoiceBreakdown = (invoice: OutwardInvoice) => {
    let baseCost = 0;
    let gstCost = 0;

    invoice.items?.forEach((item) => {
      const gstRate = item.product?.category?.gstRate || 0;
      const itemBase = item.quantity * item.ratePerUnit;
      const itemGst = (itemBase * gstRate) / 100;
      baseCost += itemBase;
      gstCost += itemGst;
    });

    const expense = invoice.expense || 0;
    const adjustment = invoice.adjustment || 0;
    const shippingCharge = invoice.shippingCharge || 0;
    const discount = invoice.discount || 0;
    const amountReceived = invoice.amountReceived || 0;
    const grandTotal = baseCost + gstCost + expense + shippingCharge - adjustment - discount;
    const balanceDue = grandTotal - amountReceived;

    return { baseCost, gstCost, expense, adjustment, shippingCharge, discount, grandTotal, amountReceived, balanceDue };
  };

  const handleExport = async () => {
    try {
      const blob = await bulkUploadService.exportData('outward');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `outward_invoices_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Outward invoices exported successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to export outward invoices');
      console.error('Export error:', error);
    }
  };

  const handleDownloadPDF = async (invoice: OutwardInvoice) => {
    setDownloadingId(invoice.id);
    try {
      const blob = await outwardService.generatePDF(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.invoiceNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Invoice PDF downloaded successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    const { balanceDue } = calculateInvoiceBreakdown(selectedInvoice);
    if (amount > balanceDue + 0.01) {
      toast.error(`Payment amount exceeds the outstanding balance of ${formatCurrency(balanceDue)}`);
      return;
    }

    setSubmittingPayment(true);
    try {
      await outwardService.recordPayment(selectedInvoice.id.toString(), {
        amount,
        paymentDate,
        paymentMethod,
        transactionId: paymentTxnId,
        notes: paymentNotes
      });
      toast.success('Payment recorded successfully');
      
      // Reset payment form state
      setPaymentAmount('');
      setPaymentTxnId('');
      setPaymentNotes('');
      setRecordingPayment(false);

      // Fetch fresh details for selected invoice and list
      const fullInvoice = await dispatch(fetchOutwardInvoiceById(selectedInvoice.id)).unwrap();
      setSelectedInvoice(fullInvoice);
      dispatch(fetchOutwardInvoices({ page: currentPage, limit: 10, search }));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDownloadReceipt = async (receiptId: number, receiptNo: string) => {
    setDownloadingReceiptId(receiptId);
    try {
      const blob = await outwardService.downloadReceiptPDF(receiptId.toString());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${receiptNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Receipt PDF downloaded successfully');
    } catch (err: any) {
      toast.error('Failed to download receipt');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

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

  const columns = [
    {
      key: 'invoiceNo',
      title: 'Invoice No',
      sortable: true,
    },
    {
      key: 'date',
      title: 'Date',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'customer.name',
      title: 'Customer',
      sticky: true,
      render: (_: any, record: OutwardInvoice) => (
        <div>
          <div className="font-medium">{record.customer?.name}</div>
          <div className="text-sm text-gray-500">{record.customer?.code}</div>
        </div>
      ),
    },
    {
      key: 'location.name',
      title: 'Locations',
      render: (_: any, record: OutwardInvoice) => {
        const locations = [...new Set(record.items?.map(i => i.location?.name).filter(Boolean))];
        return locations.length > 0 ? locations.join(', ') : '-';
      },
    },
    {
      key: 'saleType',
      title: 'Type',
      render: (value: string) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            value === 'export'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-green-100 text-green-800'
          }`}
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      key: 'totalQty',
      title: 'Qty',
      render: (_: any, record: any) => record.totalQty || 0,
    },
    {
      key: 'totalBoxes',
      title: 'Boxes',
      render: (_: any, record: any) => record.totalBoxes || 0,
    },
    {
      key: 'baseCost',
      title: 'Base Cost',
      render: (_: any, record: OutwardInvoice) => formatCurrency(calculateInvoiceBreakdown(record).baseCost),
    },
    {
      key: 'gstCost',
      title: 'GST',
      render: (_: any, record: OutwardInvoice) => formatCurrency(calculateInvoiceBreakdown(record).gstCost),
    },
    {
      key: 'totalCost',
      title: 'Grand Total',
      render: (_: any, record: OutwardInvoice) => (
        <span className="font-semibold">{formatCurrency(calculateInvoiceBreakdown(record).grandTotal)}</span>
      ),
    },
    {
      key: 'balanceDue',
      title: 'Balance Due',
      render: (_: any, record: OutwardInvoice) => {
        const { balanceDue } = calculateInvoiceBreakdown(record);
        return (
          <span className={cn(
            "font-semibold",
            balanceDue > 0 ? "text-red-600" : "text-gray-900"
          )}>
            {formatCurrency(balanceDue)}
          </span>
        );
      },
    },
    {
      key: 'paymentStatus',
      title: 'Payment Status',
      render: (_: any, record: OutwardInvoice) => {
        const { balanceDue, amountReceived } = calculateInvoiceBreakdown(record);
        let status = 'Unpaid';
        let bgClass = 'bg-red-100 text-red-800 border-red-200';
        
        if (balanceDue <= 0.01) {
          status = 'Paid';
          bgClass = 'bg-green-100 text-green-800 border-green-200';
        } else if (amountReceived > 0) {
          status = 'Partially Paid';
          bgClass = 'bg-amber-100 text-amber-800 border-amber-200';
        }
        
        return (
          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", bgClass)}>
            {status}
          </span>
        );
      }
    },
    {
      key: 'grossProfit',
      title: 'Gross Profit',
      render: (_: any, record: any) => (
        <span className={record.grossProfit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
          {formatCurrency(record.grossProfit || 0)}
        </span>
      ),
    },
    {
      key: 'grossProfitMargin',
      title: 'Profit Margin',
      render: (_: any, record: any) => (
        <span className={record.grossProfitMargin >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
          {record.grossProfitMargin?.toFixed(2) || '0.00'}%
        </span>
      ),
    },
    {
      key: 'items',
      title: 'Items',
      render: (items: any[]) => items?.length || 0,
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: OutwardInvoice) => (
        <div className="flex gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => viewInvoice(record)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(record)} title="Download PDF" disabled={downloadingId === record.id}>
            {downloadingId === record.id
              ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              : <Download className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => editInvoice(record)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteInvoice(record)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Outwards"
        searchPlaceholder="Search invoices..."
        onSearch={(value) => debouncedSearch(value)}
        actions={[
          {
            label: 'Bulk Upload',
            icon: <Upload className="h-4 w-4" />,
            onClick: () => setBulkUploadOpen(true),
          },
          {
            label: 'Export',
            icon: <Download className="h-4 w-4" />,
            onClick: handleExport,
          },
          {
            label: 'Create Invoice',
            icon: <Plus className="h-4 w-4" />,
            onClick: openModal,
            variant: 'primary' as const,
          },
        ]}
      />

      {/* Date Filter */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <Button
              onClick={() => handleDateFilter(startDate, endDate)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              Apply Filter
            </Button>
            {(startDate || endDate) && (
              <Button
                onClick={clearDateFilter}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Clear
              </Button>
            )}
          </div>
          {(startDate || endDate) && (
            <div className="mt-2 text-sm text-gray-600">
              Showing data from {startDate || 'start'} to {endDate || 'end'}
            </div>
          )}
        </div>
      </div>
      <div className="card overflow-x-auto">
        <Table data={invoices} columns={columns} loading={loading} />

        <Pagination
          currentPage={pagination?.page || 1}
          totalPages={pagination?.totalPages || 1}
          total={pagination?.total || 0}
          limit={pagination?.limit || 10}
          onPageChange={setCurrentPage}
          loading={loading}
        />
      </div>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={
          editingInvoice ? 'Edit Outward Invoice' : 'Create Outward Invoice'
        }
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => {
                const [custSearch, setCustSearch] = useState('');
                const [custOpen, setCustOpen] = useState(false);
                useEffect(() => {
                  const sel = customerOptions.find((o) => o.value.toString() === field.value?.toString());
                  if (sel) setCustSearch(`${sel.label}`);
                }, [field.value, customerOptions]);
                const filtered = customerOptions.filter((o) =>
                  o.label.toLowerCase().includes(custSearch.toLowerCase())
                );
                return (
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="Search customer..."
                      value={custSearch}
                      onChange={(e) => { setCustSearch(e.target.value); field.onChange(''); setCustOpen(true); }}
                      onFocus={() => setCustOpen(true)}
                      onBlur={() => setTimeout(() => setCustOpen(false), 150)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input type="text" required value={field.value || ''} onChange={() => {}} className="sr-only" tabIndex={-1} />
                    {errors.customerId && <p className="text-sm text-red-600 mt-1">{errors.customerId.message}</p>}
                    {custOpen && (
                      <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                        {filtered.map((o) => (
                          <li key={o.value} onMouseDown={() => { field.onChange(o.value.toString()); setCustSearch(o.label); setCustOpen(false); }}
                            className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm">{o.label}</li>
                        ))}
                        <li className="border-t border-gray-200 px-3 py-2 sticky bottom-0 bg-gray-50">
                          <button
                            type="button"
                            onClick={() => {
                              setAddCustomerModalOpen(true);
                            }}
                            className="w-full text-left text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add New Customer
                          </button>
                        </li>
                        {filtered.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">No customers found</li>}
                      </ul>
                    )}
                  </div>
                );
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Sale Type"
              options={saleTypeOptions}
              error={errors.saleType?.message}
              {...register('saleType')}
            />
            <Input
              label="Ref#"
              placeholder="e.g. SO-000001 or manual ref"
              {...register('referenceNo')}
            />
            <Input
              label="Expense"
              type="number"
              step="0.01"
              min="0"
              error={errors.expense?.message}
              {...register('expense', { valueAsNumber: true })}
            />
          </div>

          {/* Items */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Items</h3>

            {fields.map((field, index) => {
              const item = watchedItems[index];
              const stockBatches = availableStockCache[item?.productId] || [];
              const selectedBatch = stockBatches.find(
                (b) => b.id.toString() === item?.stockBatchId?.toString()
              );
              const product = productsCache[item?.productId] || selectedBatch?.product;
              // In edit mode, add back the original item's quantity since backend will restore it on update
              const originalItem = editingInvoice?.items?.find(
                (oi) => oi.stockBatchId?.toString() === item?.stockBatchId?.toString() &&
                        oi.saleUnit === item?.saleUnit
              );
              const originalQty = originalItem?.quantity || 0;
              const maxQuantity =
                item?.saleUnit === 'box'
                  ? (selectedBatch?.remainingBoxes || 0) + (editingInvoice ? originalQty : 0)
                  : item?.saleUnit === 'pack'
                    ? (selectedBatch?.remainingPacks || 0) + (editingInvoice ? originalQty : 0)
                    : (selectedBatch?.remainingPcs || 0) + (editingInvoice ? originalQty : 0);
              
              const gstRate = product?.category?.gstRate || 0;
              const baseAmount = (item?.quantity || 0) * (item?.ratePerUnit || 0);
              const gstAmount = (baseAmount * gstRate) / 100;
              const totalAmount = baseAmount + gstAmount;

              const stockBatchOptions = stockBatches.map((batch) => ({
                value: batch.id.toString(),
                line1: `[${batch.location?.name}] ${batch.vendor?.name} - ${formatDate(batch.inwardDate)}`,
                line2: `${batch.remainingBoxes} boxes, ${batch.packPerBox} pack/box, ${batch.remainingPacks || 0} packs, ${batch.packPerPiece} pcs/pack, ${batch.remainingPcs} pcs`,
              }));

              const isExpanded = expandedItems.has(index);

              return (
                <div
                  key={field.id}
                  className="border border-gray-200 rounded-lg p-3 sm:p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleItem(index)}
                        className="p-1 h-auto"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <h4 className="font-medium text-sm sm:text-base">Item {index + 1}</h4>
                      {!isExpanded && product && (
                        <span className="text-sm text-gray-600">- {product.name}{product.grade ? ` (${product.grade})` : ''}</span>
                      )}
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {!isExpanded && (
                    <div className="grid grid-cols-3 gap-3 text-sm bg-gray-50 p-3 rounded">
                      <div>
                        <span className="font-medium">Base: </span>
                        <span className="text-gray-900">{formatCurrency(baseAmount)}</span>
                      </div>
                      <div>
                        <span className="font-medium">GST ({gstRate}%): </span>
                        <span className="text-gray-900">{formatCurrency(gstAmount)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Total: </span>
                        <span className="text-gray-900 font-semibold">{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ProductSearch
                      value={item?.productId}
                      onChange={(productId, product) =>
                        handleProductChange(index, productId, product)
                      }
                      error={errors.items?.[index]?.productId?.message}
                    />
                    <MultiLineSelect
                      label="Stock Batch"
                      options={stockBatchOptions}
                      value={item?.stockBatchId?.toString()}
                      onChange={(value) => {
                        setValue(`items.${index}.stockBatchId`, value);
                        handleStockBatchChange(index, value);
                      }}
                      placeholder={
                        item?.productId
                          ? 'Select stock batch'
                          : 'Select product first'
                      }
                      disabled={
                        !item?.productId || stockBatchOptions.length === 0
                      }
                      error={errors.items?.[index]?.stockBatchId?.message}
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Select
                      label="Sale Unit"
                      options={saleUnitOptions}
                      error={errors.items?.[index]?.saleUnit?.message}
                      {...register(`items.${index}.saleUnit`)}
                    />
                    <Input
                      label={`Qty (Max: ${maxQuantity})`}
                      type="number"
                      min="1"
                      max={maxQuantity}
                      error={errors.items?.[index]?.quantity?.message}
                      {...register(`items.${index}.quantity`, {
                        valueAsNumber: true,
                      })}
                    />
                    <Input
                      label="Rate/Unit"
                      type="number"
                      step="0.01"
                      min="0"
                      error={errors.items?.[index]?.ratePerUnit?.message}
                      {...register(`items.${index}.ratePerUnit`, {
                        valueAsNumber: true,
                      })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST ({gstRate}%)
                      </label>
                      <div className="text-xs sm:text-sm text-gray-900 bg-gray-50 p-2 rounded h-10 flex items-center">
                        {formatCurrency(gstAmount)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm bg-blue-50 p-3 rounded">
                    <div>
                      <span className="font-medium">Base Amount: </span>
                      <span className="text-gray-900">{formatCurrency(baseAmount)}</span>
                    </div>
                    <div>
                      <span className="font-medium">GST ({gstRate}%): </span>
                      <span className="text-gray-900">{formatCurrency(gstAmount)}</span>
                    </div>
                    <div>
                      <span className="font-medium">Total: </span>
                      <span className="text-gray-900 font-semibold">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>

                  {selectedBatch && (
                    <div className="bg-blue-50 p-3 rounded text-xs sm:text-sm">
                      <div className="font-medium text-blue-900 mb-1">
                        Stock Information
                      </div>
                      <div className="text-blue-800 space-y-1">
                        <div>Vendor: {selectedBatch.vendor?.name}</div>
                        <div>
                          Inward: {formatDate(selectedBatch.inwardDate)}
                        </div>
                        <div>
                          Pack/Box: {selectedBatch.packPerBox}, Pcs/Pack: {selectedBatch.packPerPiece}
                        </div>
                        <div>
                          Available: {selectedBatch.remainingBoxes} boxes,{' '}
                          {selectedBatch.remainingPacks || 0} packs,{' '}
                          {selectedBatch.remainingPcs} pcs
                        </div>
                        <div>
                          Cost: ₹{selectedBatch.costPerBox}/box, ₹
                          {selectedBatch.costPerPack ||
                            (
                              selectedBatch.costPerBox /
                              (selectedBatch.packPerBox || 1)
                            ).toFixed(2)}
                          /pack, ₹{selectedBatch.costPerPcs}/pcs
                        </div>
                      </div>
                    </div>
                  )}

                  <Input
                    label="Description"
                    placeholder="Auto-filled from product, editable"
                    {...register(`items.${index}.description`)}
                  />

                  {item?.productId && stockBatchOptions.length === 0 && (
                    <div className="bg-yellow-50 p-3 rounded text-xs sm:text-sm">
                      <div className="font-medium text-yellow-900">
                        No Stock Available
                      </div>
                      <div className="text-yellow-800">
                        No stock available for this product across any location.
                      </div>
                    </div>
                  )}
                    </>
                  )}
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const newIndex = fields.length;
                append({
                  productId: '',
                  stockBatchId: '',
                  locationId: '',
                  saleUnit: 'box',
                  quantity: 1,
                  ratePerUnit: 0,
                  description: '',
                });
                setExpandedItems(new Set([newIndex]));
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>

          {/* Rounding & Received inputs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t pt-4">
            <Input
              label="Shipping Charge"
              type="number"
              step="0.01"
              min="0"
              {...register('shippingCharge')}
              placeholder="e.g. 500"
            />
            <Input
              label="Discount"
              type="number"
              step="0.01"
              min="0"
              {...register('discount')}
              placeholder="e.g. 100"
            />
            <Input
              label="Amount Rounding"
              type="number"
              step="0.01"
              error={errors.adjustment?.message}
              {...register('adjustment')}
              placeholder="e.g. -0.50 or 0.50"
            />
            <Input
              label="Amount Received"
              type="number"
              step="0.01"
              min="0"
              error={errors.amountReceived?.message}
              {...register('amountReceived')}
              placeholder="e.g. 5000"
            />
          </div>

          {/* Grand Total */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              {(() => {
                const { totalBase, totalGst, expenseVal, adjustmentVal, shippingVal, discountVal, grandTotal, receivedVal, balanceDue } = calculateGrandTotal();
                return (
                  <div className="w-full sm:w-auto sm:min-w-[300px] bg-green-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Total Cost (Base):</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(totalBase)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Total GST:</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(totalGst)}</span>
                    </div>
                    {expenseVal > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Additional Expense:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(expenseVal)}</span>
                      </div>
                    )}
                    {shippingVal > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Shipping Charge:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(shippingVal)}</span>
                      </div>
                    )}
                    {discountVal > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Discount:</span>
                        <span className="font-semibold">- {formatCurrency(discountVal)}</span>
                      </div>
                    )}
                    {adjustmentVal !== 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Round Off:</span>
                        <span className="font-semibold text-gray-900">
                          {adjustmentVal > 0 ? '-' : '+'}{formatCurrency(Math.abs(adjustmentVal))}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-green-200 pt-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-gray-700">Grand Total:</span>
                        <span className="text-lg sm:text-xl font-bold text-green-700">{formatCurrency(grandTotal)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-emerald-600 font-medium">
                      <span>Amount Received:</span>
                      <span>{formatCurrency(receivedVal)}</span>
                    </div>
                    <div className={`flex justify-between text-sm font-bold border-t border-dashed border-green-300 pt-2 ${balanceDue > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      <span>Balance Due:</span>
                      <span>{formatCurrency(balanceDue)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={closeModal} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
              {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Invoice Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={`Invoice ${selectedInvoice?.invoiceNo}`}
        size="lg"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <div className="text-gray-900">
                  {formatDate(selectedInvoice.date)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Cost
                </label>
                <div className="text-gray-900 font-semibold">
                  {formatCurrency(selectedInvoice.totalCost)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Customer
                </label>
                <div className="text-gray-900">
                  {selectedInvoice.customer?.name} (
                  {selectedInvoice.customer?.code})
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Place of Supply
                </label>
                <div className="text-gray-900">
                  {selectedInvoice.customer?.state || '—'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sale Type
                </label>
                <div className="text-gray-900 capitalize">
                  {selectedInvoice.saleType}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expense
                </label>
                <div className="text-gray-900">
                  {formatCurrency(selectedInvoice.expense)}
                </div>
              </div>
              {(selectedInvoice.shippingCharge ?? 0) > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Shipping Charge
                </label>
                <div className="text-gray-900">
                  {formatCurrency(selectedInvoice.shippingCharge ?? 0)}
                </div>
              </div>
              )}
              {(selectedInvoice.discount ?? 0) > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Discount
                </label>
                <div className="text-red-600 font-semibold">
                  - {formatCurrency(selectedInvoice.discount ?? 0)}
                </div>
              </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Adjustment / Rounding
                </label>
                <div className="text-gray-900">
                  {(selectedInvoice.adjustment ?? 0) > 0 ? '-' : (selectedInvoice.adjustment ?? 0) < 0 ? '+' : ''}{formatCurrency(Math.abs(selectedInvoice.adjustment ?? 0))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Grand Total
                </label>
                <div className="text-gray-900 font-semibold">
                  {formatCurrency(calculateInvoiceBreakdown(selectedInvoice).grandTotal)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount Received
                </label>
                <div className="text-emerald-600 font-semibold">
                  {formatCurrency(selectedInvoice.amountReceived || 0)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Balance Due
                </label>
                <div className={cn(
                  "font-bold",
                  calculateInvoiceBreakdown(selectedInvoice).balanceDue > 0 ? "text-red-600" : "text-gray-900"
                )}>
                  {formatCurrency(calculateInvoiceBreakdown(selectedInvoice).balanceDue)}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Product
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Location
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Unit
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Rate
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedInvoice.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.product?.name}{' '}
                          {item.product?.grade && `(${item.product.grade})`}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {item.location?.name || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 capitalize">
                          {item.saleUnit}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatCurrency(item.ratePerUnit)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 font-semibold">
                          {formatCurrency(item.totalCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments History & Action Panel */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Payment Records
                </h3>
                {calculateInvoiceBreakdown(selectedInvoice).balanceDue > 0.01 && !recordingPayment && (
                  <Button
                    type="button"
                    onClick={() => {
                      setRecordingPayment(true);
                      setPaymentAmount(calculateInvoiceBreakdown(selectedInvoice).balanceDue.toFixed(2));
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg"
                  >
                    Record Payment
                  </Button>
                )}
              </div>

              {/* Record Payment Form */}
              {recordingPayment && (
                <form onSubmit={handleRecordPayment} className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 mb-6 space-y-4 shadow-sm animate-fadeIn">
                  <h4 className="text-sm font-semibold text-emerald-800">Record New Payment</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Amount Paid (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Payment Method
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option value="UPI">UPI / Scan to Pay</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Transaction Ref ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. UPI Txn ID, bank reference"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        value={paymentTxnId}
                        onChange={(e) => setPaymentTxnId(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        placeholder="Internal payment description..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-emerald-100">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRecordingPayment(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      loading={submittingPayment}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-1.5 px-4"
                    >
                      Save Payment
                    </Button>
                  </div>
                </form>
              )}

              {/* Payments History List */}
              {(!selectedInvoice.paymentReceipts || selectedInvoice.paymentReceipts.length === 0) ? (
                <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                  <p className="text-sm text-gray-500">No payment receipts have been recorded for this invoice yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Receipt No</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Method</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Ref ID</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {(selectedInvoice.paymentReceipts as any[]).map((receipt) => (
                        <tr key={receipt.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">{receipt.receiptNo}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-500">{formatDate(receipt.paymentDate)}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-700">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {receipt.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-500 font-mono text-xs">{receipt.transactionId || '—'}</td>
                          <td className="px-4 py-2.5 text-sm text-right font-bold text-emerald-600">{formatCurrency(receipt.amount)}</td>
                          <td className="px-4 py-2.5 text-sm text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadReceipt(receipt.id, receipt.receiptNo)}
                              title="Download PDF Receipt"
                              disabled={downloadingReceiptId === receipt.id}
                              className="text-blue-600 hover:text-blue-700 p-1 h-auto"
                            >
                              {downloadingReceiptId === receipt.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Upload Modal */}
      <BulkUpload
        type="outward"
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={() =>
          dispatch(
            fetchOutwardInvoices({ page: currentPage, limit: 10, search })
          )
        }
      />

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
              await dispatch(createCustomer({
                name: newCustomerData.name,
                email: newCustomerData.email,
                phone: newCustomerData.phone,
                address: newCustomerData.address,
                state: newCustomerData.state,
                gstNumber: newCustomerData.gstNumber,
              })).unwrap();
              toast.success('Customer added successfully');
              await dispatch(fetchCustomers({ limit: 1000 }));
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
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                State (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search or select Indian state/UT"
                  className={cn(
                    'flex h-10 w-full rounded-md border border-gray-300 bg-white pl-3 pr-10 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200'
                  )}
                  value={stateSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStateSearch(val);
                    setNewCustomerData({ ...newCustomerData, state: val });
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
                      className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowStateDropdown(!showStateDropdown)}
                    className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showStateDropdown && "transform rotate-180")} />
                  </button>
                </div>
              </div>

              {/* Dropdown Suggestions */}
              {showStateDropdown && (
                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200 divide-y divide-gray-50 scrollbar-thin">
                  {loadingStates ? (
                    <div className="px-4 py-3 text-gray-500 text-xs flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></span>
                      <span>Fetching states dynamically...</span>
                    </div>
                  ) : indianStates.filter((state) =>
                    state.toLowerCase().includes(stateSearch.toLowerCase())
                  ).length > 0 ? (
                    indianStates.filter((state) =>
                      state.toLowerCase().includes(stateSearch.toLowerCase())
                    ).map((state) => (
                      <button
                        key={state}
                        type="button"
                        className={cn(
                          'w-full text-left px-4 py-2 hover:bg-primary-50 hover:text-primary-900 transition-colors flex items-center justify-between',
                          stateSearch.toLowerCase() === state.toLowerCase() && 'bg-primary-50 text-primary-900 font-medium'
                        )}
                        onClick={() => {
                          setStateSearch(state);
                          setNewCustomerData({ ...newCustomerData, state });
                          setShowStateDropdown(false);
                        }}
                      >
                        <span>{state}</span>
                        {stateSearch.toLowerCase() === state.toLowerCase() && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-600"></span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-xs italic">
                      No matching Indian states or Union Territories found. You can keep typing to enter a custom state.
                    </div>
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
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddCustomerModalOpen(false);
                setNewCustomerData({ name: '', email: '', phone: '', address: '', state: '', gstNumber: '' });
                setStateSearch('');
                setShowStateDropdown(false);
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
    </div>
  );
};

export default Outward;
