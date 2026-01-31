import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Search, Eye, Upload, Download, Edit, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { inwardService, InwardInvoiceFormData } from '@/services/inwardService';
import { productService } from '@/services/productService';
import { vendorService } from '@/services/vendorService';
import { locationService } from '@/services/locationService';
import { bulkUploadService } from '@/services/bulkUploadService';
import { InwardInvoice, Product, Vendor, Location } from '@/types';
import { formatDate, formatCurrency, generateInvoiceNumber, debounce } from '@/utils';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import BulkUpload from '@/components/BulkUpload';
import Pagination from '@/components/Pagination';

const inwardSchema = z.object({
  invoiceNo: z.string().min(1, 'Invoice number is required'),
  date: z.string().min(1, 'Date is required'),
  vendorId: z.string().min(1, 'Vendor is required'),
  locationId: z.string().min(1, 'Location is required'),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product is required'),
    boxes: z.number().min(1, 'Boxes must be at least 1'),
    pcsPerBox: z.number().min(1, 'PCS per box must be at least 1'),
    ratePerBox: z.number().min(0, 'Rate per box must be positive'),
  })).min(1, 'At least one item is required'),
});

const Inward: React.FC = () => {
  const [invoices, setInvoices] = useState<InwardInvoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InwardInvoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<InwardInvoice | null>(null);
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
    formState: { errors, isSubmitting },
  } = useForm<InwardInvoiceFormData>({
    resolver: zodResolver(inwardSchema),
    defaultValues: {
      items: [{ productId: '', boxes: 1, pcsPerBox: 1, ratePerBox: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');

  useEffect(() => {
    loadInvoices();
    loadMasterData();
  }, [search, pagination.page]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const response = await inwardService.getAll({
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
      const [productsData, vendorsData, locationsData] = await Promise.all([
        productService.getAll({ limit: 100 }),
        vendorService.getAll({ limit: 100 }),
        locationService.getAll({ limit: 100 }),
      ]);
      setProducts(productsData.data);
      setVendors(vendorsData.data);
      setLocations(locationsData.data);
    } catch (error) {
      console.error('Failed to load master data:', error);
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
      invoiceNo: generateInvoiceNumber('INW'),
      date: new Date().toISOString().split('T')[0],
      vendorId: '',
      locationId: '',
      items: [{ productId: '', boxes: 1, pcsPerBox: 1, ratePerBox: 0 }],
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingInvoice(null);
    reset();
  };

  const editInvoice = async (invoice: InwardInvoice) => {
    try {
      const fullInvoice = await inwardService.getById(invoice.id);
      setEditingInvoice(fullInvoice);
      
      // Populate form with existing data
      reset({
        invoiceNo: fullInvoice.invoiceNo,
        date: fullInvoice.date.split('T')[0],
        vendorId: fullInvoice.vendorId,
        locationId: fullInvoice.locationId,
        items: fullInvoice.items?.map(item => ({
          productId: item.productId,
          boxes: item.boxes,
          pcsPerBox: item.pcsPerBox,
          ratePerBox: item.ratePerBox,
        })) || [{ productId: '', boxes: 1, pcsPerBox: 1, ratePerBox: 0 }],
      });
      
      setModalOpen(true);
    } catch (error) {
      console.error('Failed to load invoice for editing:', error);
    }
  };

  const viewInvoice = async (invoice: InwardInvoice) => {
    try {
      const fullInvoice = await inwardService.getById(invoice.id);
      setSelectedInvoice(fullInvoice);
      setViewModalOpen(true);
    } catch (error) {
      console.error('Failed to load invoice details:', error);
    }
  };

  const onSubmit = async (data: InwardInvoiceFormData) => {
    try {
      if (editingInvoice) {
        await inwardService.update(editingInvoice.id, data);
        toast.success('Inward invoice updated successfully');
      } else {
        await inwardService.create(data);
        toast.success('Inward invoice created successfully');
      }
      closeModal();
      loadInvoices();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const deleteInvoice = async (invoice: InwardInvoice) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await inwardService.delete(invoice.id);
        toast.success('Inward invoice deleted successfully');
        loadInvoices();
      } catch (error) {
        // Error handled by interceptor
      }
    }
  };

  const calculateItemTotal = (item: any, index: number) => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return 0;
    
    const baseAmount = item.boxes * item.ratePerBox;
    const gstAmount = (baseAmount * (product.category?.gstRate || 0)) / 100;
    return baseAmount + gstAmount;
  };

  const calculateGrandTotal = () => {
    return watchedItems.reduce((total, item, index) => {
      return total + calculateItemTotal(item, index);
    }, 0);
  };

  const handleExport = async () => {
    try {
      const blob = await bulkUploadService.exportData('inward');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inward_invoices_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Inward invoices exported successfully');
    } catch (error) {
      toast.error('Failed to export inward invoices');
    }
  };

  const productOptions = products.map(p => ({
    value: p.id,
    label: `${p.name} ${p.grade ? `(${p.grade})` : ''}`,
  }));

  const vendorOptions = vendors.map(v => ({
    value: v.id,
    label: `${v.code} - ${v.name}`,
  }));

  const locationOptions = locations.map(l => ({
    value: l.id,
    label: l.name,
  }));

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
      key: 'vendor.name',
      title: 'Vendor',
      render: (_: any, record: InwardInvoice) => (
        <div>
          <div className="font-medium">{record.vendor?.name}</div>
          <div className="text-sm text-gray-500">{record.vendor?.code}</div>
        </div>
      ),
    },
    {
      key: 'location.name',
      title: 'Location',
      render: (_: any, record: InwardInvoice) => record.location?.name,
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
      render: (_: any, record: InwardInvoice) => (
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
        <h1 className="text-2xl font-bold text-gray-900">Inward (Purchase)</h1>
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
            Add Stock
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
        title={editingInvoice ? 'Edit Inward Invoice' : 'Create Inward Invoice'}
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
              label="Vendor"
              options={vendorOptions}
              placeholder="Select vendor"
              error={errors.vendorId?.message}
              {...register('vendorId')}
            />
            <Select
              label="Location"
              options={locationOptions}
              placeholder="Select location"
              error={errors.locationId?.message}
              {...register('locationId')}
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
                onClick={() => append({ productId: '', boxes: 1, pcsPerBox: 1, ratePerBox: 0 })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            {fields.map((field, index) => {
              const item = watchedItems[index];
              const product = products.find(p => p.id === item?.productId);
              const totalPcs = (item?.boxes || 0) * (item?.pcsPerBox || 0);
              const ratePerPcs = (item?.ratePerBox || 0) / (item?.pcsPerBox || 1);
              const baseAmount = (item?.boxes || 0) * (item?.ratePerBox || 0);
              const gstRate = product?.category?.gstRate || 0;
              const gstAmount = (baseAmount * gstRate) / 100;
              const totalAmount = baseAmount + gstAmount;

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
                    <Select
                      label="Product"
                      options={productOptions}
                      placeholder="Select product"
                      error={errors.items?.[index]?.productId?.message}
                      {...register(`items.${index}.productId`)}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category & GST
                      </label>
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {product ? `${product.category?.name} (${product.category?.gstRate}% GST)` : 'Select product first'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <Input
                      label="Boxes"
                      type="number"
                      min="1"
                      error={errors.items?.[index]?.boxes?.message}
                      {...register(`items.${index}.boxes`, { valueAsNumber: true })}
                    />
                    <Input
                      label="PCS per Box"
                      type="number"
                      min="1"
                      error={errors.items?.[index]?.pcsPerBox?.message}
                      {...register(`items.${index}.pcsPerBox`, { valueAsNumber: true })}
                    />
                    <Input
                      label="Rate per Box"
                      type="number"
                      step="0.01"
                      min="0"
                      error={errors.items?.[index]?.ratePerBox?.message}
                      {...register(`items.${index}.ratePerBox`, { valueAsNumber: true })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate per PCS
                      </label>
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded h-10 flex items-center">
                        {formatCurrency(ratePerPcs)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total PCS:</span>
                      <div className="text-gray-600">{totalPcs}</div>
                    </div>
                    <div>
                      <span className="font-medium">Base Amount:</span>
                      <div className="text-gray-600">{formatCurrency(baseAmount)}</div>
                    </div>
                    <div>
                      <span className="font-medium">GST ({gstRate}%):</span>
                      <div className="text-gray-600">{formatCurrency(gstAmount)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Total:</span>
                      <div className="text-gray-900 font-semibold">{formatCurrency(totalAmount)}</div>
                    </div>
                  </div>
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
                <label className="block text-sm font-medium text-gray-700">Vendor</label>
                <div className="text-gray-900">{selectedInvoice.vendor?.name} ({selectedInvoice.vendor?.code})</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <div className="text-gray-900">{selectedInvoice.location?.name}</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Boxes</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">PCS/Box</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total PCS</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate/Box</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedInvoice.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.product?.name} {item.product?.grade && `(${item.product.grade})`}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.boxes}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.pcsPerBox}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.totalPcs}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.ratePerBox)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.gstAmount)}</td>
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
        type="inward"
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={loadInvoices}
      />
    </div>
  );
};

export default Inward;