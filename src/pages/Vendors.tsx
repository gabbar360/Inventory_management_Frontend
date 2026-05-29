import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchVendors,
  fetchVendorById,
  deleteVendor,
  clearError,
} from '@/slices/vendorSlice';
import { bulkUploadService } from '@/services/bulkUploadService';
import { Vendor } from '@/types';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Table from '@/components/Table';
import BulkUpload from '@/components/BulkUpload';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import AddEditVendor from '@/components/AddEditVendor';

const Vendors: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { vendors, currentVendor, pagination, loading, error } = useAppSelector(
    (state) => state.vendors
  );

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    dispatch(fetchVendors({ page: currentPage, limit: 10, search }));
  }, [dispatch, search, currentPage]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Fetch vendor data when in edit mode
  useEffect(() => {
    if (id) {
      dispatch(fetchVendorById(id));
    }
  }, [id, dispatch]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const handleAddVendor = () => {
    navigate('/vendors/add');
  };

  const handleEditVendor = (vendor: Vendor) => {
    navigate(`/vendors/edit/${vendor.id}`);
  };

  const handleFormSuccess = () => {
    navigate('/vendors');
    dispatch(fetchVendors({ page: currentPage, limit: 10, search }));
  };

  const handleFormCancel = () => {
    navigate('/vendors');
  };

  const handleDelete = async (vendor: Vendor) => {
    if (window.confirm(`Are you sure you want to delete "${vendor.name}"?`)) {
      try {
        await dispatch(deleteVendor(vendor.id)).unwrap();
        toast.success('Vendor deleted successfully');
      } catch (error) {
        // Error handled by Redux
      }
    }
  };

  const handleExport = async () => {
    try {
      const blob = await bulkUploadService.exportData('vendors');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vendors_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Vendors exported successfully');
    } catch (error) {
      toast.error('Failed to export vendors');
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
      key: '_count.inwardInvoices',
      title: 'Invoices',
      render: (_: any, record: Vendor) => record._count?.inwardInvoices || 0,
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Vendor) => (
        <div className="flex gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEditVendor(record)}>
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
      <AddEditVendor
        vendor={id && currentVendor ? currentVendor : undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Vendors"
        searchPlaceholder="Search vendors..."
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
            label: 'Add Vendor',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleAddVendor,
            variant: 'primary' as const,
          },
        ]}
      />

      {/* Table */}
      <div className="card overflow-hidden">
        <Table data={vendors} columns={columns} loading={loading} />

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
        type="vendors"
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={() =>
          dispatch(fetchVendors({ page: currentPage, limit: 10, search }))
        }
      />
    </div>
  );
};

export default Vendors;
