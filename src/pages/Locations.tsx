import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchLocations,
  deleteLocation,
  fetchLocationById,
  clearError,
} from '@/slices/locationSlice';
import { bulkUploadService } from '@/services/bulkUploadService';
import { Location } from '@/types';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Table from '@/components/Table';
import BulkUpload from '@/components/BulkUpload';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import AddEditLocation from '@/components/AddEditLocation';

const Locations: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { locations, currentLocation, pagination, loading, error } = useAppSelector(
    (state) => state.locations
  );

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    dispatch(fetchLocations({ page: currentPage, limit: 10, search }));
  }, [dispatch, search, currentPage]);

  useEffect(() => {
    if (id) {
      dispatch(fetchLocationById(id));
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

  const handleAddLocation = () => {
    navigate('/locations/add');
  };

  const handleEditLocation = (location: Location) => {
    navigate(`/locations/edit/${location.id}`);
  };

  const handleFormSuccess = () => {
    navigate('/locations');
    dispatch(fetchLocations({ page: currentPage, limit: 10, search }));
  };

  const handleFormCancel = () => {
    navigate('/locations');
  };

  const handleDelete = async (location: Location) => {
    if (window.confirm(`Are you sure you want to delete "${location.name}"?`)) {
      try {
        await dispatch(deleteLocation(location.id)).unwrap();
        toast.success('Location deleted successfully');
      } catch (error) {
        // Error handled by Redux
      }
    }
  };

  const handleExport = async () => {
    try {
      const blob = await bulkUploadService.exportData('locations');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `locations_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Locations exported successfully');
    } catch (error) {
      toast.error('Failed to export locations');
    }
  };

  const columns = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
    },
    {
      key: 'address',
      title: 'Address',
      render: (value: string) => value || '-',
    },
    {
      key: '_count.inwardInvoices',
      title: 'Inward',
      render: (_: any, record: Location) => record._count?.inwardInvoices || 0,
    },
    {
      key: '_count.outwardInvoices',
      title: 'Outward',
      render: (_: any, record: Location) => record._count?.outwardInvoices || 0,
    },
    {
      key: '_count.stockBatches',
      title: 'Stock Batches',
      render: (_: any, record: Location) => record._count?.stockBatches || 0,
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Location) => (
        <div className="flex gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEditLocation(record)}>
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
      <AddEditLocation
        location={id && currentLocation ? currentLocation : undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Locations"
        searchPlaceholder="Search locations..."
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
            label: 'Add Location',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleAddLocation,
            variant: 'primary' as const,
          },
        ]}
      />

      {/* Table */}
      <div className="card overflow-hidden">
        <Table data={locations} columns={columns} loading={loading} />

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
        type="locations"
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={() =>
          dispatch(fetchLocations({ page: currentPage, limit: 10, search }))
        }
      />
    </div>
  );
};

export default Locations;
