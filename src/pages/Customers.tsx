import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchCustomers,
  fetchCustomerById,
  deleteCustomer,
  clearError,
} from '@/slices/customerSlice';
import { bulkUploadService } from '@/services/bulkUploadService';
import { Customer } from '@/types';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Table from '@/components/Table';
import BulkUpload from '@/components/BulkUpload';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import AddEditCustomer from '@/components/AddEditCustomer';

const Customers: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { customers, currentCustomer, pagination, loading, error } = useAppSelector(
    (state) => state.customers
  );

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    dispatch(fetchCustomers({ page: currentPage, limit: 10, search }));
  }, [dispatch, search, currentPage]);

  useEffect(() => {
    if (id) {
      dispatch(fetchCustomerById(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const handleAddCustomer = () => {
    navigate('/customers/add');
  };

  const handleEditCustomer = (customer: Customer) => {
    navigate(`/customers/edit/${customer.id}`);
  };

  const handleFormSuccess = () => {
    navigate('/customers');
    dispatch(fetchCustomers({ page: currentPage, limit: 10, search }));
  };

  const handleFormCancel = () => {
    navigate('/customers');
  };

  const handleDelete = async (customer: Customer) => {
    if (window.confirm(`Are you sure you want to delete "${customer.name}"?`)) {
      try {
        await dispatch(deleteCustomer(customer.id)).unwrap();
        toast.success('Customer deleted successfully');
      } catch (error) {
        // Error handled by Redux
      }
    }
  };

  const handleExport = async () => {
    try {
      const blob = await bulkUploadService.exportData('customers');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Customers exported successfully');
    } catch (error) {
      toast.error('Failed to export customers');
    }
  };

  const columns = [
    {
      key: 'code',
      title: 'Code',
      sortable: true,
    },
    {
      key: 'name',
      title: 'Name',
      sortable: true,
    },
    {
      key: 'email',
      title: 'Email',
      render: (value: string) => value || '-',
    },
    {
      key: 'phone',
      title: 'Phone',
      render: (value: string) => value || '-',
    },
    {
      key: '_count.outwardInvoices',
      title: 'Orders',
      render: (_: any, record: Customer) => record._count?.outwardInvoices || 0,
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Customer) => (
        <div className="flex gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEditCustomer(record)}>
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
      <AddEditCustomer
        customer={id && currentCustomer ? currentCustomer : undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Customers"
        searchPlaceholder="Search customers..."
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
            label: 'Add Customer',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleAddCustomer,
            variant: 'primary' as const,
          },
        ]}
      />

      {/* Table */}
      <div className="card overflow-hidden">
        <Table data={customers} columns={columns} loading={loading} />

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
        type="customers"
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={() =>
          dispatch(fetchCustomers({ page: currentPage, limit: 10, search }))
        }
      />
    </div>
  );
};

export default Customers;
