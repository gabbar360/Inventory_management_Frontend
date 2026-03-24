import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
  FileText,
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
import { fetchCustomers } from '@/slices/customerSlice';
import { fetchLocations } from '@/slices/locationSlice';
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
  locationId: string;
  saleType: 'export' | 'domestic';
  expense: number;
  items: {
    productId: string;
    stockBatchId: string;
    saleUnit: 'box' | 'pack' | 'piece';
    quantity: number;
    ratePerUnit: number;
  }[];
}

const outwardSchema = z.object({
  invoiceNo: z.string().min(1, 'Invoice number is required'),
  date: z.string().min(1, 'Date is required'),
  customerId: z.union([z.string(), z.number()]).transform(val => val.toString()),
  locationId: z.union([z.string(), z.number()]).transform(val => val.toString()),
  saleType: z.enum(['export', 'domestic'], {
    required_error: 'Sale type is required',
  }),
  expense: z.number().min(0, 'Expense must be positive').default(0),
  items: z
    .array(
      z.object({
        productId: z.union([z.string(), z.number()]).transform(val => val.toString()),
        stockBatchId: z.union([z.string(), z.number()]).transform(val => val.toString()),
        saleUnit: z.enum(['box', 'pack', 'piece'], {
          required_error: 'Sale unit is required',
        }),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
        ratePerUnit: z.number().min(0, 'Rate per unit must be positive'),
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
  const { locations } = useAppSelector((state) => state.locations);
  const [availableStockCache, setAvailableStockCache] = useState<{
    [key: string]: StockBatch[];
  }>({});
  const [productsCache, setProductsCache] = useState<{
    [key: string]: Product;
  }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OutwardInvoice | null>(
    null
  );
  const [editingInvoice, setEditingInvoice] = useState<OutwardInvoice | null>(
    null
  );
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

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
          saleUnit: 'box',
          quantity: 1,
          ratePerUnit: 0,
        },
      ],
      expense: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const watchedLocationId = watch('locationId');

  const calculateGrandTotal = () => {
    let totalBase = 0;
    let totalGst = 0;

    watchedItems.forEach((item) => {
      if (!item?.productId || !item?.quantity || !item?.ratePerUnit) return;
      
      const stockKey = `${item.productId}-${watchedLocationId || 'all'}`;
      const stockBatches = availableStockCache[stockKey] || [];
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

    return { totalBase, totalGst, grandTotal: totalBase + totalGst };
  };

  useEffect(() => {
    dispatch(fetchOutwardInvoices({ page: currentPage, limit: 10, search }));
    loadMasterData();
  }, [dispatch, search, currentPage]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const loadMasterData = async () => {
    dispatch(fetchCustomers({ limit: 100 }));
    dispatch(fetchLocations({ limit: 100 }));
  };

  const loadAvailableStock = async (productId: string, locationId?: string) => {
    try {
      const result = await dispatch(
        fetchAvailableStock({ productId, locationId })
      ).unwrap();
      setAvailableStockCache((prev) => ({
        ...prev,
        [`${productId}-${locationId || 'all'}`]: result,
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
      locationId: '',
      saleType: 'domestic',
      expense: 0,
      items: [
        {
          productId: '',
          stockBatchId: '',
          saleUnit: 'box',
          quantity: 1,
          ratePerUnit: 0,
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
          locationId: fullInvoice.locationId,
          saleType: fullInvoice.saleType,
          expense: fullInvoice.expense,
          items: fullInvoice.items?.map((item) => ({
            productId: item.productId,
            stockBatchId: item.stockBatchId,
            saleUnit: item.saleUnit,
            quantity: item.quantity,
            ratePerUnit: item.ratePerUnit,
          })) || [
            {
              productId: '',
              stockBatchId: '',
              saleUnit: 'box',
              quantity: 1,
              ratePerUnit: 0,
            },
          ],
        };
        console.log('🟡 Edit Invoice - Form data prepared:', formData);
        reset(formData);

        // Load stock for existing items
        if (fullInvoice.items) {
          for (const item of fullInvoice.items) {
            await loadAvailableStock(item.productId, fullInvoice.locationId);
          }
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
    setValue(`items.${index}.ratePerUnit`, 0);

    if (product) {
      setProductsCache(prev => ({ ...prev, [productId]: product }));
    }

    if (productId && watchedLocationId) {
      loadAvailableStock(productId.toString(), watchedLocationId.toString());
    }
  };

  const handleStockBatchChange = (index: number, stockBatchId: string) => {
    setValue(`items.${index}.stockBatchId`, stockBatchId);

    // Auto-set rate based on stock batch cost
    const item = watchedItems[index];
    const stockKey = `${item?.productId}-${watchedLocationId || 'all'}`;
    const stockBatches = availableStockCache[stockKey] || [];
    const selectedBatch = stockBatches.find((b) => b.id.toString() === stockBatchId);

    if (selectedBatch) {
      const suggestedRate =
        item?.saleUnit === 'box'
          ? selectedBatch.costPerBox * 1.2 // 20% markup
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
      // Get GST rate from item's product category
      const gstRate = item.product?.category?.gstRate || 0;
      const itemBase = item.quantity * item.ratePerUnit;
      const itemGst = (itemBase * gstRate) / 100;
      baseCost += itemBase;
      gstCost += itemGst;
    });

    return { baseCost, gstCost, grandTotal: baseCost + gstCost };
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
      console.error('PDF generation error:', error);
    }
  };

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: `${c.code} - ${c.name}`,
  }));

  const locationOptions = locations.map((l) => ({
    value: l.id,
    label: l.name,
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
      render: (_: any, record: OutwardInvoice) => (
        <div>
          <div className="font-medium">{record.customer?.name}</div>
          <div className="text-sm text-gray-500">{record.customer?.code}</div>
        </div>
      ),
    },
    {
      key: 'location.name',
      title: 'Location',
      render: (_: any, record: OutwardInvoice) => record.location?.name,
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
          <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(record)}>
            <FileText className="h-4 w-4" />
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

      {/* Table */}
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
            <Select
              label="Customer"
              options={customerOptions}
              placeholder="Select customer"
              error={errors.customerId?.message}
              {...register('customerId')}
            />
            <Select
              label="Location"
              options={locationOptions}
              placeholder="Select location"
              error={errors.locationId?.message}
              {...register('locationId')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Sale Type"
              options={saleTypeOptions}
              error={errors.saleType?.message}
              {...register('saleType')}
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
              const stockKey = `${item?.productId}-${watchedLocationId || 'all'}`;
              const stockBatches = availableStockCache[stockKey] || [];
              const selectedBatch = stockBatches.find(
                (b) => b.id.toString() === item?.stockBatchId?.toString()
              );
              const product = productsCache[item?.productId] || selectedBatch?.product;
              const maxQuantity =
                item?.saleUnit === 'box'
                  ? selectedBatch?.remainingBoxes || 0
                  : item?.saleUnit === 'pack'
                    ? selectedBatch?.remainingPacks || 0
                    : selectedBatch?.remainingPcs || 0;
              
              const gstRate = product?.category?.gstRate || 0;
              const baseAmount = (item?.quantity || 0) * (item?.ratePerUnit || 0);
              const gstAmount = (baseAmount * gstRate) / 100;
              const totalAmount = baseAmount + gstAmount;

              const stockBatchOptions = stockBatches.map((batch) => ({
                value: batch.id.toString(),
                line1: `${batch.vendor?.name} - ${formatDate(batch.inwardDate)}`,
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

                  {item?.productId && stockBatchOptions.length === 0 && (
                    <div className="bg-yellow-50 p-3 rounded text-xs sm:text-sm">
                      <div className="font-medium text-yellow-900">
                        No Stock Available
                      </div>
                      <div className="text-yellow-800">
                        No stock available for this product at the selected
                        location.
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
                  saleUnit: 'box',
                  quantity: 1,
                  ratePerUnit: 0,
                });
                setExpandedItems(new Set([newIndex]));
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>

          {/* Grand Total */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-full sm:w-auto sm:min-w-[300px] bg-green-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Cost:</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(calculateGrandTotal().totalBase)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total GST:</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(calculateGrandTotal().totalGst)}</span>
                  </div>
                  <div className="border-t border-green-200 pt-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Grand Total:</span>
                      <span className="text-lg sm:text-xl font-bold text-green-700">{formatCurrency(calculateGrandTotal().grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
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
                  Location
                </label>
                <div className="text-gray-900">
                  {selectedInvoice.location?.name}
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
    </div>
  );
};

export default Outward;
