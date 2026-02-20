import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2, Search, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  clearError,
} from '@/slices/locationSlice';
import { bulkUploadService } from '@/services/bulkUploadService';
import { Location } from '@/types';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import BulkUpload from '@/components/BulkUpload';
import Pagination from '@/components/Pagination';

interface LocationFormData {
  name: string;
  address?: string;
}

const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  address: z.string().optional(),
});

const Locations: React.FC = () => {
  const dispatch = useAppDispatch();
  const { locations, pagination, loading, error } = useAppSelector(
    (state) => state.locations
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
  });

  useEffect(() => {
    dispatch(fetchLocations({ page: currentPage, limit: 10, search }));
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
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const openModal = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setValue('name', location.name);
      setValue('address', location.address || '');
    } else {
      setEditingLocation(null);
      reset();
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingLocation(null);
    reset();
  };

  const onSubmit = async (data: LocationFormData) => {
    try {
      if (editingLocation) {
        await dispatch(
          updateLocation({ id: editingLocation.id, data })
        ).unwrap();
        toast.success('Location updated successfully');
      } else {
        await dispatch(createLocation(data)).unwrap();
        toast.success('Location created successfully');
      }
      closeModal();
    } catch (error) {
      // Error handled by Redux
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
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
          <Button onClick={() => openModal()} className="flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Location</span>
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
            placeholder="Search locations..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
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

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingLocation ? 'Edit Location' : 'Add Location'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Location Name"
            placeholder="Enter location name"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Address (Optional)"
            placeholder="Enter address"
            error={errors.address?.message}
            {...register('address')}
          />

          <div className="form-actions">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingLocation ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

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
