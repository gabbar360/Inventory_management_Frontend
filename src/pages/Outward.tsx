import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Search, Eye, Upload, Download, Edit, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { outwardService, OutwardInvoiceFormData } from '@/services/outwardService';
import { inventoryService } from '@/services/inventoryService';
import { customerService } from '@/services/customerService';
import { locationService } from '@/services/locationService';
import { bulkUploadService } from '@/services/bulkUploadService';
import { OutwardInvoice, Customer, Location, StockBatch, Product } from '@/types';
import { formatDate, formatCurrency, generateInvoiceNumber, debounce } from '@/utils';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import ProductSearch from '@/components/ProductSearch';
import BulkUpload from '@/components/BulkUpload';
import Pagination from '@/components/Pagination';

const outwardSchema = z.object({
  invoiceNo: z.string().min(1, 'Invoice number is required'),
  date: z.string().min(1, 'Date is required'),
  customerId: z.string().min(1, 'Customer is required'),
  locationId: z.string().min(1, 'Location is required'),
  saleType: z.enum(['export', 'domestic'], { required_error: 'Sale type is required' }),
  expense: z.number().min(0, 'Expense must be positive').default(0),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product is required'),
    stockBatchId: z.string().min(1, 'Stock batch is required'),
    saleUnit: z.enum(['box', 'pack', 'piece'], { required_error: 'Sale unit is required' }),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    ratePerUnit: z.number().min(0, 'Rate per unit must be positive'),
  })).min(1, 'At least one item is required'),
});

const Outward: React.FC = () => {
  const [invoices, setInvoices] = useState<OutwardInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [availableStock, setAvailableStock] = useState<{ [key: string]: StockBatch[] }>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OutwardInvoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<OutwardInvoice | null>(null);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

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
      items: [{ productId: '', stockBatchId: '', saleUnit: 'box', quantity: 1, ratePerUnit: 0 }],
      expense: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const watchedLocationId = watch('locationId');

  useEffect(() => {
    loadInvoices();
    loadMasterData();
  }, [search, pagination.page]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const response = await outwardService.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search,
      });
      setInvoices(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMasterData = async () => {
    try {
      const [customersData, locationsData] = await Promise.all([
        customerService.getAll({ limit: 100 }),
        locationService.getAll({ limit: 100 }),
      ]);
      setCustomers(customersData.data);
      setLocations(locationsData.data);
    } catch (error) {
      console.error('Failed to load master data:', error);
    }
  };

  const loadAvailableStock = async (productId: string, locationId?: string) => {
    try {
      const stock = await inventoryService.getAvailableStock(productId, locationId);
      setAvailableStock(prev => ({
        ...prev,
        [`${productId}-${locationId || 'all'}`]: stock,
      }));
    } catch (error) {
      console.error('Failed to load available stock:', error);
    }
  };

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, 300);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const openModal = () => {
    reset({
      invoiceNo: generateInvoiceNumber('OUT'),
      date: new Date().toISOString().split('T')[0],
      customerId: '',
      locationId: '',
      saleType: 'domestic',
      expense: 0,
      items: [{ productId: '', stockBatchId: '', saleUnit: 'box', quantity: 1, ratePerUnit: 0 }],
    });
    setAvailableStock({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingInvoice(null);
    reset();
    setAvailableStock({});
  };

  const editInvoice = async (invoice: OutwardInvoice) => {
    try {
      const fullInvoice = await outwardService.getById(invoice.id);
      setEditingInvoice(fullInvoice);
      
      // Populate form with existing data
      reset({
        invoiceNo: fullInvoice.invoiceNo,
        date: fullInvoice.date.split('T')[0],
        customerId: fullInvoice.customerId,
        locationId: fullInvoice.locationId,
        saleType: fullInvoice.saleType,
        expense: fullInvoice.expense,
        items: fullInvoice.items?.map(item => ({
          productId: item.productId,
          stockBatchId: item.stockBatchId,
          saleUnit: item.saleUnit,
          quantity: item.quantity,
          ratePerUnit: item.ratePerUnit,
        })) || [{ productId: '', stockBatchId: '', saleUnit: 'box', quantity: 1, ratePerUnit: 0 }],
      });
      
      // Load stock for existing items
      if (fullInvoice.items) {
        for (const item of fullInvoice.items) {
          await loadAvailableStock(item.productId, fullInvoice.locationId);
        }
      }
      
      setModalOpen(true);
    } catch (error) {
      console.error('Failed to load invoice for editing:', error);
    }
  };

  const viewInvoice = async (invoice: OutwardInvoice) => {
    try {
      const fullInvoice = await outwardService.getById(invoice.id);
      setSelectedInvoice(fullInvoice);
      setViewModalOpen(true);
    } catch (error) {
      console.error('Failed to load invoice details:', error);
    }
  };

  const onSubmit = async (data: OutwardInvoiceFormData) => {
    try {
      if (editingInvoice) {
        await outwardService.update(editingInvoice.id, data);
        toast.success('Outward invoice updated successfully');
      } else {
        await outwardService.create(data);
        toast.success('Outward invoice created successfully');
      }
      closeModal();
      loadInvoices();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const deleteInvoice = async (invoice: OutwardInvoice) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await outwardService.delete(invoice.id);
        toast.success('Outward invoice deleted successfully');
        loadInvoices();
      } catch (error) {
        // Error handled by interceptor
      }
    }
  };

  const handleProductChange = (index: number, productId: string, product?: Product) => {
    setValue(`items.${index}.productId`, productId);
    setValue(`items.${index}.stockBatchId`, '');
    setValue(`items.${index}.ratePerUnit`, 0);
    
    if (productId && watchedLocationId) {
      loadAvailableStock(productId, watchedLocationId);
    }
  };

  const handleStockBatchChange = (index: number, stockBatchId: string) => {
    setValue(`items.${index}.stockBatchId`, stockBatchId);
    
    // Auto-set rate based on stock batch cost
    const item = watchedItems[index];
    const stockKey = `${item?.productId}-${watchedLocationId || 'all'}`;
    const stockBatches = availableStock[stockKey] || [];
    const selectedBatch = stockBatches.find(b => b.id === stockBatchId);
    
    if (selectedBatch) {
      const suggestedRate = item?.saleUnit === 'box' 
        ? selectedBatch.costPerBox * 1.2 // 20% markup
        : item?.saleUnit === 'pack'
        ? (selectedBatch.costPerPack || selectedBatch.costPerBox / (selectedBatch.packPerBox || 1)) * 1.2
        : selectedBatch.costPerPcs * 1.2;
      setValue(`items.${index}.ratePerUnit`, Math.round(suggestedRate * 100) / 100);
    }
  };

  const calculateGrandTotal = () => {
    const itemsTotal = watchedItems.reduce((total, item) => {
      return total + (item.quantity * item.ratePerUnit);
    }, 0);
    return itemsTotal;
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
    } catch (error) {
      toast.error('Failed to export outward invoices');
    }
  };

  const customerOptions = customers.map(c => ({
    value: c.id,
    label: `${c.code} - ${c.name}`,
  }));

  const locationOptions = locations.map(l => ({
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
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value === 'export' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      key: 'totalCost',
      title: 'Total Cost',
      render: (value: number) => formatCurrency(value),
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
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => viewInvoice(record)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editInvoice(record)}
          >
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Outward (Sales)</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={openModal}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <Table
          data={invoices}
          columns={columns}
          loading={loading}
        />
        
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
          loading={loading}
        />
      </div>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingInvoice ? 'Edit Outward Invoice' : 'Create Outward Invoice'}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="form-row">
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

          <div className="form-row">
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

          <div className="form-row">
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
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: '', stockBatchId: '', saleUnit: 'box', quantity: 1, ratePerUnit: 0 })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            {fields.map((field, index) => {
              const item = watchedItems[index];
              const stockKey = `${item?.productId}-${watchedLocationId || 'all'}`;
              const stockBatches = availableStock[stockKey] || [];
              const selectedBatch = stockBatches.find(b => b.id === item?.stockBatchId);
              const maxQuantity = item?.saleUnit === 'box' 
                ? selectedBatch?.remainingBoxes || 0
                : item?.saleUnit === 'pack'
                ? selectedBatch?.remainingPacks || 0
                : selectedBatch?.remainingPcs || 0;
              const totalAmount = (item?.quantity || 0) * (item?.ratePerUnit || 0);

              const stockBatchOptions = stockBatches.map(batch => ({
                value: batch.id,
                label: `${batch.vendor?.name} - ${formatDate(batch.inwardDate)} (${batch.remainingBoxes} boxes, ${batch.remainingPacks || 0} packs, ${batch.remainingPcs} pcs)`,
              }));

              return (
                <div key={field.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Item {index + 1}</h4>
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

                  <div className="grid grid-cols-2 gap-4">
                    <ProductSearch
                      value={item?.productId}
                      onChange={(productId, product) => handleProductChange(index, productId, product)}
                      error={errors.items?.[index]?.productId?.message}
                    />
                    <Select
                      label="Stock Batch"
                      options={stockBatchOptions}
                      placeholder={item?.productId ? "Select stock batch" : "Select product first"}
                      disabled={!item?.productId || stockBatchOptions.length === 0}
                      error={errors.items?.[index]?.stockBatchId?.message}
                      {...register(`items.${index}.stockBatchId`)}
                      onChange={(e) => {
                        register(`items.${index}.stockBatchId`).onChange(e);
                        handleStockBatchChange(index, e.target.value);
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <Select
                      label="Sale Unit"
                      options={saleUnitOptions}
                      error={errors.items?.[index]?.saleUnit?.message}
                      {...register(`items.${index}.saleUnit`)}
                    />
                    <Input
                      label={`Quantity (Max: ${maxQuantity})`}
                      type="number"
                      min="1"
                      max={maxQuantity}
                      error={errors.items?.[index]?.quantity?.message}
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                    <Input
                      label="Rate per Unit"
                      type="number"
                      step="0.01"
                      min="0"
                      error={errors.items?.[index]?.ratePerUnit?.message}
                      {...register(`items.${index}.ratePerUnit`, { valueAsNumber: true })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Amount
                      </label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded h-10 flex items-center font-semibold">
                        {formatCurrency(totalAmount)}
                      </div>
                    </div>
                  </div>

                  {selectedBatch && (
                    <div className="bg-blue-50 p-3 rounded text-sm">
                      <div className="font-medium text-blue-900">Stock Information:</div>
                      <div className="text-blue-800 space-y-1">
                        <div>Vendor: {selectedBatch.vendor?.name}</div>
                        <div>Inward Date: {formatDate(selectedBatch.inwardDate)}</div>
                        <div>Available: {selectedBatch.remainingBoxes} boxes, {selectedBatch.remainingPacks || 0} packs, {selectedBatch.remainingPcs} pieces</div>
                        <div>Cost: ₹{selectedBatch.costPerBox}/box, ₹{selectedBatch.costPerPack || (selectedBatch.costPerBox / (selectedBatch.packPerBox || 1)).toFixed(2)}/pack, ₹{selectedBatch.costPerPcs}/piece</div>
                      </div>
                    </div>
                  )}
                  
                  {item?.productId && stockBatchOptions.length === 0 && (
                    <div className="bg-yellow-50 p-3 rounded text-sm">
                      <div className="font-medium text-yellow-900">No Stock Available</div>
                      <div className="text-yellow-800">
                        No stock available for this product at the selected location.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grand Total */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="text-right">
                <div className="text-lg font-semibold">
                  Grand Total: {formatCurrency(calculateGrandTotal())}
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <div className="text-gray-900">{formatDate(selectedInvoice.date)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Cost</label>
                <div className="text-gray-900 font-semibold">{formatCurrency(selectedInvoice.totalCost)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <div className="text-gray-900">{selectedInvoice.customer?.name} ({selectedInvoice.customer?.code})</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <div className="text-gray-900">{selectedInvoice.location?.name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sale Type</label>
                <div className="text-gray-900 capitalize">{selectedInvoice.saleType}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expense</label>
                <div className="text-gray-900">{formatCurrency(selectedInvoice.expense)}</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedInvoice.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.product?.name} {item.product?.grade && `(${item.product.grade})`}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 capitalize">{item.saleUnit}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.ratePerUnit)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 font-semibold">{formatCurrency(item.totalCost)}</td>
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
        onSuccess={loadInvoices}
      />
    </div>
  );
};

export default Outward;