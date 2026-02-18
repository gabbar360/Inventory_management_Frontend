import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2, Search, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  clearError,
} from '@/slices/categorySlice';
import { bulkUploadService } from '@/services/bulkUploadService';
import { Category } from '@/types';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import BulkUpload from '@/components/BulkUpload';
import Pagination from '@/components/Pagination';

interface CategoryFormData {
  name: string;
  hsnCode: string;
  gstRate: number;
}

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  hsnCode: z.string().min(1, 'HSN code is required'),
  gstRate: z.number().min(0).max(100, 'GST rate must be between 0 and 100'),
});

const Categories: React.FC = () => {
  const dispatch = useAppDispatch();
  const { categories, pagination, loading, error } = useAppSelector(
    (state) => state.categories
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  useEffect(() => {
    dispatch(fetchCategories({ page: currentPage, limit: 10, search }));
  }, [dispatch, search, currentPage]);

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

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setValue('name', category.name);
      setValue('hsnCode', category.hsnCode);
      setValue('gstRate', category.gstRate);
    } else {
      setEditingCategory(null);
      reset();
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCategory(null);
    reset();
  };

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        await dispatch(
          updateCategory({ id: editingCategory.id, data })
        ).unwrap();
        toast.success('Category updated successfully');
      } else {
        await dispatch(createCategory(data)).unwrap();
        toast.success('Category created successfully');
      }
      closeModal();
    } catch (error) {
      // Error handled by Redux
    }
  };

  const handleDelete = async (category: Category) => {
    if (window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
      try {
        await dispatch(deleteCategory(category.id)).unwrap();
        toast.success('Category deleted successfully');
      } catch (error) {
        // Error handled by Redux
      }
    }
  };

  const handleBulkUploadSuccess = () => {
    setBulkUploadOpen(false);
    dispatch(fetchCategories({ page: currentPage, limit: 10, search }));
  };

  const handleExport = async () => {
    try {
      const blob = await bulkUploadService.exportData('categories');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `categories_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Categories exported successfully');
    } catch (error) {
      toast.error('Failed to export categories');
    }
  };

  const columns = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
    },
    {
      key: 'hsnCode',
      title: 'HSN Code',
      sortable: true,
    },
    {
      key: 'gstRate',
      title: 'GST Rate (%)',
      sortable: true,
      render: (value: number) => `${value}%`,
    },
    {
      key: '_count.products',
      title: 'Products',
      render: (value: any, record: Category) => record._count?.products || 0,
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Category) => (
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
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
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
            <span className="hidden sm:inline">Add Category</span>
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
            placeholder="Search categories..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <Table data={categories} columns={columns} loading={loading} />

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
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="Enter category name"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="HSN Code"
            placeholder="Enter HSN code"
            error={errors.hsnCode?.message}
            {...register('hsnCode')}
          />

          <Input
            label="GST Rate (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="Enter GST rate"
            error={errors.gstRate?.message}
            {...register('gstRate', { valueAsNumber: true })}
          />

          <div className="form-actions">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Upload Modal */}
      <BulkUpload
        type="categories"
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={handleBulkUploadSuccess}
      />
    </div>
  );
};

export default Categories;
