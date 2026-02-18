import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2, Search, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  clearError,
} from '@/slices/productSlice';
import { fetchCategories } from '@/slices/categorySlice';
import { bulkUploadService } from '@/services/bulkUploadService';
import { Product, Category } from '@/types';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import BulkUpload from '@/components/BulkUpload';
import Pagination from '@/components/Pagination';

interface ProductFormData {
  name: string;
  grade?: string;
  categoryId: string;
}

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  grade: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
});

const Products: React.FC = () => {
  const dispatch = useAppDispatch();
  const { products, pagination, loading, error } = useAppSelector(
    (state) => state.products
  );
  const { categories } = useAppSelector((state) => state.categories);

  const [modalOpen, setModalOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  useEffect(() => {
    dispatch(fetchProducts({ page: currentPage, limit: 10, search }));
  }, [dispatch, search, currentPage]);

  useEffect(() => {
    dispatch(fetchCategories({ limit: 100 }));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  }, 300);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setValue('name', product.name);
      setValue('grade', product.grade || '');
      setValue('categoryId', product.categoryId);
    } else {
      setEditingProduct(null);
      reset();
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
    reset();
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (editingProduct) {
        await dispatch(updateProduct({ id: editingProduct.id, data })).unwrap();
        toast.success('Product updated successfully');
      } else {
        await dispatch(createProduct(data)).unwrap();
        toast.success('Product created successfully');
      }
      closeModal();
    } catch (error) {
      // Error handled by Redux
    }
  };

  const handleDelete = async (product: Product) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        await dispatch(deleteProduct(product.id)).unwrap();
        toast.success('Product deleted successfully');
      } catch (error) {
        // Error handled by Redux
      }
    }
  };

  const handleBulkUploadSuccess = () => {
    setBulkUploadOpen(false);
    dispatch(fetchProducts({ page: currentPage, limit: 10, search }));
  };

  const handleExport = async () => {
    try {
      const blob = await bulkUploadService.exportData('products');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Products exported successfully');
    } catch (error) {
      toast.error('Failed to export products');
    }
  };

  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));

  const columns = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
    },
    {
      key: 'grade',
      title: 'Grade',
      render: (value: string) => value || '-',
    },
    {
      key: 'category.name',
      title: 'Category',
      render: (_: any, record: Product) => record.category?.name || '-',
    },
    {
      key: 'category.gstRate',
      title: 'GST Rate',
      render: (_: any, record: Product) => `${record.category?.gstRate || 0}%`,
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Product) => (
        <div className="flex gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => openModal(record)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(record)}
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
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button variant="outline" onClick={() => setBulkUploadOpen(true)} className="flex-1 sm:flex-none">
            <Upload className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Bulk Upload</span>
            <span className="sm:hidden">Upload</span>
          </Button>
          <Button variant="outline" onClick={handleExport} className="flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => openModal()} className="flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Product</span>
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
            placeholder="Search products..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <Table data={products} columns={columns} loading={loading} />

        <Pagination
          currentPage={pagination?.page || 1}
          totalPages={pagination?.totalPages || 1}
          total={pagination?.total || 0}
          limit={pagination?.limit || 10}
          onPageChange={setCurrentPage}
          loading={loading}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Product Name"
            placeholder="Enter product name"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Grade (Optional)"
            placeholder="Enter product grade"
            error={errors.grade?.message}
            {...register('grade')}
          />

          <Select
            label="Category"
            placeholder="Select category"
            options={categoryOptions}
            error={errors.categoryId?.message}
            {...register('categoryId')}
          />

          <div className="form-actions">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingProduct ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Upload Modal */}
      <BulkUpload
        type="products"
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={handleBulkUploadSuccess}
      />
    </div>
  );
};

export default Products;
