import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2, Upload, Download, ChevronDown, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  clearError,
} from '@/slices/customerSlice';
import { bulkUploadService } from '@/services/bulkUploadService';
import { Customer } from '@/types';
import { formatDate, debounce, cn } from '@/utils';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import BulkUpload from '@/components/BulkUpload';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';

interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
  state?: string;
}

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  state: z.string().optional(),
});

const Customers: React.FC = () => {
  const dispatch = useAppDispatch();
  const { customers, pagination, loading, error } = useAppSelector(
    (state) => state.customers
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [stateSearch, setStateSearch] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const stateDropdownRef = useRef<HTMLDivElement>(null);

  const [indianStates, setIndianStates] = useState<string[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  useEffect(() => {
    dispatch(fetchCustomers({ page: currentPage, limit: 10, search }));
  }, [dispatch, search, currentPage]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        stateDropdownRef.current &&
        !stateDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ country: 'India' }),
        });
        const result = await response.json();
        if (!result.error && result.data && result.data.states) {
          const statesList = result.data.states.map((s: { name: string }) => s.name);
          setIndianStates(statesList);
        } else {
          throw new Error('Failed to fetch from API');
        }
      } catch (err) {
        console.error('Error fetching Indian states:', err);
      } finally {
        setLoadingStates(false);
      }
    };

    fetchStates();
  }, []);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setValue('name', customer.name);
      setValue('email', customer.email || '');
      setValue('phone', customer.phone || '');
      setValue('address', customer.address || '');
      setValue('gstNumber', customer.gstNumber || '');
      setValue('state', customer.state || '');
      setStateSearch(customer.state || '');
    } else {
      setEditingCustomer(null);
      reset();
      setStateSearch('');
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCustomer(null);
    reset();
    setStateSearch('');
  };

  const onSubmit = async (data: CustomerFormData) => {
    try {
      if (editingCustomer) {
        await dispatch(
          updateCustomer({ id: editingCustomer.id, data })
        ).unwrap();
        toast.success('Customer updated successfully');
      } else {
        await dispatch(createCustomer(data)).unwrap();
        toast.success('Customer created successfully');
      }
      closeModal();
    } catch (error) {
      // Error handled by Redux
    }
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
            onClick: () => openModal(),
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

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Customer Name"
            placeholder="Enter customer name"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Email (Optional)"
            type="email"
            placeholder="Enter email address"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Phone (Optional)"
            placeholder="Enter phone number"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="Address (Optional)"
            placeholder="Enter address"
            error={errors.address?.message}
            {...register('address')}
          />

          {/* Searchable State Dropdown */}
          <div className="relative space-y-1" ref={stateDropdownRef}>
            <label className="block text-xs sm:text-sm font-medium text-gray-700">
              State (Optional)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search or select Indian state/UT"
                className={cn(
                  'flex h-10 w-full rounded-md border border-gray-300 bg-white pl-3 pr-10 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
                  errors.state && 'border-red-500 focus:ring-red-500'
                )}
                value={stateSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setStateSearch(val);
                  setValue('state', val);
                  setShowStateDropdown(true);
                }}
                onFocus={() => setShowStateDropdown(true)}
              />
              <input type="hidden" {...register('state')} />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {stateSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setStateSearch('');
                      setValue('state', '');
                      setShowStateDropdown(true);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowStateDropdown(!showStateDropdown)}
                  className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showStateDropdown && "transform rotate-180")} />
                </button>
              </div>
            </div>
            {errors.state && (
              <p className="text-xs sm:text-sm text-red-600">{errors.state.message}</p>
            )}

            {/* Dropdown Suggestions */}
            {showStateDropdown && (
              <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200 divide-y divide-gray-50 scrollbar-thin">
                {loadingStates ? (
                  <div className="px-4 py-3 text-gray-500 text-xs flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></span>
                    <span>Fetching states dynamically...</span>
                  </div>
                ) : indianStates.filter((state) =>
                  state.toLowerCase().includes(stateSearch.toLowerCase())
                ).length > 0 ? (
                  indianStates.filter((state) =>
                    state.toLowerCase().includes(stateSearch.toLowerCase())
                  ).map((state) => (
                    <button
                      key={state}
                      type="button"
                      className={cn(
                        'w-full text-left px-4 py-2 hover:bg-primary-50 hover:text-primary-900 transition-colors flex items-center justify-between',
                        stateSearch.toLowerCase() === state.toLowerCase() && 'bg-primary-50 text-primary-900 font-medium'
                      )}
                      onClick={() => {
                        setStateSearch(state);
                        setValue('state', state);
                        setShowStateDropdown(false);
                      }}
                    >
                      <span>{state}</span>
                      {stateSearch.toLowerCase() === state.toLowerCase() && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-600"></span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-500 text-xs italic">
                    No matching Indian states or Union Territories found. You can keep typing to enter a custom state.
                  </div>
                )}
              </div>
            )}
          </div>

          <Input
            label="GST Number (Optional)"
            placeholder="Enter GST number"
            error={errors.gstNumber?.message}
            {...register('gstNumber')}
          />

          <div className="form-actions">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingCustomer ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

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
