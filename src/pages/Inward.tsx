import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Trash2,
  Search,
  Eye,
  Upload,
  Download,
  Edit,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchInwardInvoices,
  fetchInwardInvoiceById,
  createInwardInvoice,
  updateInwardInvoice,
  deleteInwardInvoice,
  clearError,
} from '@/slices/inwardSlice';
import { fetchProducts } from '@/slices/productSlice';
import { fetchVendors } from '@/slices/vendorSlice';
import { fetchLocations } from '@/slices/locationSlice';
import { bulkUploadService } from '@/services/bulkUploadService';
import { InwardInvoice } from '@/types';
import {
  formatDate,
  formatCurrency,
  generateInvoiceNumber,
  debounce,
} from '@/utils';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import BulkUpload from '@/components/BulkUpload';
import Pagination from '@/components/Pagination';

interface InwardInvoiceFormData {
  invoiceNo: string;
  date: string;
  vendorId: string;
  locationId: string;
  items: {
    productId: string;
    boxes: number;
    packPerBox: number;
    packPerPiece: number;
    ratePerBox: number;
  }[];
}

const inwardSchema = z.object({
  invoiceNo: z.string().min(1, 'Invoice number is required'),
  date: z.string().min(1, 'Date is required'),
  vendorId: z.string().min(1, 'Vendor is required'),
  locationId: z.string().min(1, 'Location is required'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product is required'),
        boxes: z.number().min(1, 'Boxes must be at least 1'),
        packPerBox: z.number().min(1, 'Pack per box must be at least 1'),
        packPerPiece: z.number().min(1, 'Pack per piece must be at least 1'),
        ratePerBox: z.number().min(0, 'Rate per box must be positive'),
      })
    )
    .min(1, 'At least one item is required'),
});

const Inward: React.FC = () => {
  const dispatch = useAppDispatch();
  const { invoices, currentInvoice, pagination, loading, error } =
    useAppSelector((state) => state.inward);
  const { products } = useAppSelector((state) => state.products);
  const { vendors } = useAppSelector((state) => state.vendors);
  const { locations } = useAppSelector((state) => state.locations);

  const [modalOpen, setModalOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InwardInvoice | null>(
    null
  );
  const [editingInvoice, setEditingInvoice] = useState<InwardInvoice | null>(
    null
  );
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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
      items: [
        {
          productId: '',
          boxes: 1,
          packPerBox: 1,
          packPerPiece: 1,
          ratePerBox: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');

  useEffect(() => {
    dispatch(fetchInwardInvoices({ page: currentPage, limit: 10, search }));
    loadMasterData();
  }, [dispatch, search, currentPage]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const loadMasterData = async () => {
    dispatch(fetchProducts({ limit: 100 }));
    dispatch(fetchVendors({ limit: 100 }));
    dispatch(fetchLocations({ limit: 100 }));
  };

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
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
      items: [
        {
          productId: '',
          boxes: 1,
          packPerBox: 1,
          packPerPiece: 1,
          ratePerBox: 0,
        },
      ],
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
      await dispatch(fetchInwardInvoiceById(invoice.id)).unwrap();
      const fullInvoice = currentInvoice;
      if (fullInvoice) {
        setEditingInvoice(fullInvoice);

        // Populate form with existing data
        reset({
          invoiceNo: fullInvoice.invoiceNo,
          date: fullInvoice.date.split('T')[0],
          vendorId: fullInvoice.vendorId,
          locationId: fullInvoice.locationId,
          items: fullInvoice.items?.map((item) => ({
            productId: item.productId,
            boxes: item.boxes,
            packPerBox: item.packPerBox || item.pcsPerBox, // fallback for existing data
            packPerPiece: item.packPerPiece || 1, // fallback for existing data
            ratePerBox: item.ratePerBox,
          })) || [
            {
              productId: '',
              boxes: 1,
              packPerBox: 1,
              packPerPiece: 1,
              ratePerBox: 0,
            },
          ],
        });

        setModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to load invoice for editing:', error);
    }
  };

  const viewInvoice = async (invoice: InwardInvoice) => {
    try {
      await dispatch(fetchInwardInvoiceById(invoice.id)).unwrap();
      setSelectedInvoice(currentInvoice);
      setViewModalOpen(true);
    } catch (error) {
      console.error('Failed to load invoice details:', error);
    }
  };

  const onSubmit = async (data: InwardInvoiceFormData) => {
    try {
      if (editingInvoice) {
        await dispatch(
          updateInwardInvoice({ id: editingInvoice.id, data })
        ).unwrap();
        toast.success('Inward invoice updated successfully');
      } else {
        await dispatch(createInwardInvoice(data)).unwrap();
        toast.success('Inward invoice created successfully');
      }
      closeModal();
    } catch (error) {
      // Error handled by Redux
    }
  };

  const deleteInvoice = async (invoice: InwardInvoice) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await dispatch(deleteInwardInvoice(invoice.id)).unwrap();
        toast.success('Inward invoice deleted successfully');
      } catch (error) {
        // Error handled by Redux
      }
    }
  };

  const calculateItemTotal = (item: any) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) return 0;

    const baseAmount = item.boxes * item.ratePerBox;
    const gstAmount = (baseAmount * (product.category?.gstRate || 0)) / 100;
    return baseAmount + gstAmount;
  };

  const calculateGrandTotal = () => {
    return watchedItems.reduce((total, item) => {
      return total + calculateItemTotal(item);
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

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name} ${p.grade ? `(${p.grade})` : ''}`,
  }));

  const vendorOptions = vendors.map((v) => ({
    value: v.id,
    label: `${v.code} - ${v.name}`,
  }));

  const locationOptions = locations.map((l) => ({
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
        <div className="flex gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => viewInvoice(record)}>
            <Eye className="h-4 w-4" />
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Inward (Purchase)</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setBulkUploadOpen(true)} className="flex-1 sm:flex-none">
            <Upload className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Bulk Upload</span>
            <span className="sm:hidden">Upload</span>
          </Button>
          <Button variant="outline" onClick={handleExport} className="flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={openModal} className="flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Stock</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center">
        <div className="relative w-full sm:max-w-md">
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
        title={editingInvoice ? 'Edit Inward Invoice' : 'Create Inward Invoice'}
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-lg font-medium">Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    productId: '',
                    boxes: 1,
                    packPerBox: 1,
                    packPerPiece: 1,
                    ratePerBox: 0,
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            {fields.map((field, index) => {
              const item = watchedItems[index];
              const product = products.find((p) => p.id === item?.productId);
              const totalPacks = (item?.boxes || 0) * (item?.packPerBox || 0);
              const totalPcs = totalPacks * (item?.packPerPiece || 0);
              const ratePerPack =
                (item?.ratePerBox || 0) / (item?.packPerBox || 1);
              const ratePerPcs = ratePerPack / (item?.packPerPiece || 1);
              const baseAmount = (item?.boxes || 0) * (item?.ratePerBox || 0);
              const gstRate = product?.category?.gstRate || 0;
              const gstAmount = (baseAmount * gstRate) / 100;
              const totalAmount = baseAmount + gstAmount;

              return (
                <div
                  key={field.id}
                  className="border border-gray-200 rounded-lg p-3 sm:p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm sm:text-base">Item {index + 1}</h4>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {product
                          ? `${product.category?.name} (${product.category?.gstRate}% GST)`
                          : 'Select product first'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Input
                      label="Boxes"
                      type="number"
                      min="1"
                      error={errors.items?.[index]?.boxes?.message}
                      {...register(`items.${index}.boxes`, {
                        valueAsNumber: true,
                      })}
                    />
                    <Input
                      label="Pack/Box"
                      type="number"
                      min="1"
                      error={errors.items?.[index]?.packPerBox?.message}
                      {...register(`items.${index}.packPerBox`, {
                        valueAsNumber: true,
                      })}
                    />
                    <Input
                      label="Pack/Piece"
                      type="number"
                      min="1"
                      error={errors.items?.[index]?.packPerPiece?.message}
                      {...register(`items.${index}.packPerPiece`, {
                        valueAsNumber: true,
                      })}
                    />
                    <Input
                      label="Rate/Box"
                      type="number"
                      step="0.01"
                      min="0"
                      error={errors.items?.[index]?.ratePerBox?.message}
                      {...register(`items.${index}.ratePerBox`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs sm:text-sm bg-gray-50 p-3 rounded">
                    <div>
                      <span className="font-medium block">Total Packs</span>
                      <div className="text-gray-600">{totalPacks}</div>
                    </div>
                    <div>
                      <span className="font-medium block">Total PCS</span>
                      <div className="text-gray-600">{totalPcs}</div>
                    </div>
                    <div>
                      <span className="font-medium block">Rate/Pack</span>
                      <div className="text-gray-600">
                        {formatCurrency(ratePerPack)}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium block">Rate/PCS</span>
                      <div className="text-gray-600">
                        {formatCurrency(ratePerPcs)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm bg-blue-50 p-3 rounded">
                    <div>
                      <span className="font-medium block">Base Amount</span>
                      <div className="text-gray-900">
                        {formatCurrency(baseAmount)}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium block">GST ({gstRate}%)</span>
                      <div className="text-gray-900">
                        {formatCurrency(gstAmount)}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium block">Total</span>
                      <div className="text-gray-900 font-semibold text-base">
                        {formatCurrency(totalAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand Total */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="text-right bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Grand Total</div>
                <div className="text-xl sm:text-2xl font-bold text-green-700">
                  {formatCurrency(calculateGrandTotal())}
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
                  Vendor
                </label>
                <div className="text-gray-900">
                  {selectedInvoice.vendor?.name} ({selectedInvoice.vendor?.code}
                  )
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
                        Boxes
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Pack/Box
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Pack/Piece
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Total Packs
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Total PCS
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Rate/Box
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        GST
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
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.boxes}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.packPerBox || item.pcsPerBox || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.packPerPiece || 1}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.totalPacks ||
                            item.boxes *
                              (item.packPerBox || item.pcsPerBox || 1)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.totalPcs}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatCurrency(item.ratePerBox)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatCurrency(item.gstAmount)}
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
        type="inward"
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={() =>
          dispatch(
            fetchInwardInvoices({ page: currentPage, limit: 10, search })
          )
        }
      />
    </div>
  );
};

export default Inward;
