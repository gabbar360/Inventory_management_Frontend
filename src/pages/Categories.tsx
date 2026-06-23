import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Upload, Download, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchCategories,
  fetchCategoryById,
  deleteCategory,
} from '@/slices/categorySlice';
import { bulkUploadService } from '@/services/bulkUploadService';
import { Category } from '@/types';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Table from '@/components/Table';
import BulkUpload from '@/components/BulkUpload';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import AddEditCategory from '@/components/AddEditCategory';

const Categories: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { categories, currentCategory, pagination, loading, error } = useAppSelector(
    (state) => state.categories
  );

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    dispatch(fetchCategories({ page: currentPage, limit: 10, search }));
  }, [dispatch, search, currentPage]);

  // Fetch category data when in edit mode
  useEffect(() => {
    if (id) {
      console.log('🔍 Fetching category with ID:', id);
      dispatch(fetchCategoryById(id)).then((result) => {
        console.log('✅ Category fetched:', result);
      }).catch((error) => {
        console.error('❌ Error fetching category:', error);
      });
    }
  }, [id, dispatch]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const handleAddCategory = () => {
    navigate('/categories/add');
  };

  const handleEditCategory = (category: Category) => {
    navigate(`/categories/edit/${category.id}`);
  };

  const handleFormSuccess = () => {
    navigate('/categories');
    dispatch(fetchCategories({ page: currentPage, limit: 10, search }));
  };

  const handleFormCancel = () => {
    navigate('/categories');
  };

  const handleDelete = async (category: Category) => {
    if (window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
      try {
        await dispatch(deleteCategory(category.id)).unwrap();
        toast.success('Category deleted successfully');
      } catch (error: any) {
        const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to delete category';
        toast.error(errorMessage);
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
      render: (_: any, record: Category) => record._count?.products || 0,
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
          <Button variant="ghost" size="sm" onClick={() => handleEditCategory(record)}>
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

  // Show form if in add/edit mode
  if (id || window.location.pathname.includes('/add')) {
    console.log('📋 Showing form - ID:', id, 'Current Category:', currentCategory);
    return (
      <AddEditCategory
        category={id && currentCategory ? currentCategory : undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Categories"
        searchPlaceholder="Search categories..."
        onSearch={(value) => {
          debouncedSearch(value);
        }}
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
            label: 'Add Category',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleAddCategory,
            variant: 'primary' as const,
          },
        ]}
      />

      {/* Table */}
      <div className="card overflow-hidden">
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
