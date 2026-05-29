import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchProducts,
  fetchProductById,
  deleteProduct,
} from '@/slices/productSlice';
import { fetchCategories } from '@/slices/categorySlice';
import { bulkUploadService } from '@/services/bulkUploadService';
import { Product } from '@/types';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Table from '@/components/Table';
import BulkUpload from '@/components/BulkUpload';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import AddEditProduct from '@/components/AddEditProduct';

const Products: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { products, currentProduct, pagination, loading } = useAppSelector(
    (state) => state.products
  );
  useAppSelector((state) => state.categories);

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('sku');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    dispatch(fetchProducts({ page: currentPage, limit: 10, search, sortBy, sortOrder }));
  }, [dispatch, search, currentPage, sortBy, sortOrder]);

  useEffect(() => {
    dispatch(fetchCategories({ limit: 100 }));
  }, [dispatch]);

  // Fetch product data when in edit mode
  useEffect(() => {
    if (id) {
      dispatch(fetchProductById(id));
    }
  }, [id, dispatch]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleAddProduct = () => {
    navigate('/products/add');
  };

  const handleEditProduct = (product: Product) => {
    navigate(`/products/edit/${product.id}`);
  };

  const handleFormSuccess = () => {
    navigate('/products');
    dispatch(fetchProducts({ page: currentPage, limit: 10, search, sortBy, sortOrder }));
  };

  const handleFormCancel = () => {
    navigate('/products');
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
    dispatch(fetchProducts({ page: currentPage, limit: 10, search, sortBy, sortOrder }));
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

  const columns = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      onSort: () => handleSort('name'),
    },
    {
      key: 'sku',
      title: 'SKU',
      sortable: true,
      onSort: () => handleSort('sku'),
      render: (value: string) => value || '-',
    },
    {
      key: 'upc',
      title: 'UPC',
      render: (value: string) => value || '-',
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
          <Button variant="ghost" size="sm" onClick={() => handleEditProduct(record)}>
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
    return (
      <AddEditProduct
        product={id && currentProduct ? currentProduct : undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Products"
        searchPlaceholder="Search products..."
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
            label: 'Add Product',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleAddProduct,
            variant: 'primary' as const,
          },
        ]}
      />

      {/* Table */}
      <div className="card overflow-hidden">
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
