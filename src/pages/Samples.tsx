import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSamples, createSample, updateSample, deleteSample, clearError } from '@/slices/sampleSlice';
import { Sample } from '@/types';
import { formatDate, debounce, generateSampleInvoice, generateSampleDispatchSlip } from '@/utils';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';

interface SampleFormData {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  sentBy: string;
  sampleType: 'domestic' | 'export';
  kitPrice: number;
  trackingNumber?: string;
  dispatchMethod: string;
  sentDate: string;
  remarks?: string;
}

const sampleSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  sentBy: z.string().min(1, 'Employee name is required'),
  sampleType: z.enum(['domestic', 'export']),
  kitPrice: z.number().min(0, 'Kit price must be positive'),
  trackingNumber: z.string().optional(),
  dispatchMethod: z.string().min(1, 'Dispatch method is required'),
  sentDate: z.string().min(1, 'Sent date is required'),
  remarks: z.string().optional(),
});

const Samples: React.FC = () => {
  const dispatch = useAppDispatch();
  const { samples, pagination, loading, error } = useAppSelector((state) => state.samples);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<Sample | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'website'>('all');

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<SampleFormData>({
    resolver: zodResolver(sampleSchema),
    defaultValues: {
      sampleType: 'domestic',
      dispatchMethod: '',
      kitPrice: 0,
    },
  });

  useEffect(() => {
    dispatch(fetchSamples({ page: currentPage, limit: 10, search, ...(sourceFilter !== 'all' && { source: sourceFilter }) }));
  }, [dispatch, search, currentPage, sourceFilter]);

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

  const sourceTabs = [
    { key: 'all', label: 'All Samples' },
    { key: 'website', label: '🌐 Website' },
    { key: 'manual', label: '✏️ Manual' },
  ] as const;

  const openModal = (sample?: Sample) => {
    if (sample) {
      setEditingSample(sample);
      setValue('customerName', sample.customerName);
      setValue('customerEmail', sample.customerEmail || '');
      setValue('customerPhone', sample.customerPhone || '');
      setValue('customerAddress', sample.customerAddress || '');
      setValue('sentBy', sample.sentBy);
      setValue('sampleType', sample.sampleType);
      setValue('kitPrice', sample.kitPrice);
      setValue('trackingNumber', sample.trackingNumber || '');
      setValue('dispatchMethod', sample.dispatchMethod);
      setValue('sentDate', sample.sentDate.split('T')[0]);
      setValue('remarks', sample.remarks || '');
    } else {
      setEditingSample(null);
      reset({
        sampleType: 'domestic',
        dispatchMethod: '',
        kitPrice: 0,
        sentDate: new Date().toISOString().split('T')[0],
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSample(null);
    reset();
  };

  const onSubmit = async (data: SampleFormData) => {
    try {
      if (editingSample) {
        await dispatch(updateSample({ id: editingSample.id, data: data as Partial<Sample> })).unwrap();
        toast.success('Sample updated successfully');
      } else {
        await dispatch(createSample(data as Partial<Sample>)).unwrap();
        toast.success('Sample created successfully');
      }
      closeModal();
    } catch (error) {
      // Error handled by Redux
    }
  };

  const handleDelete = async (sample: Sample) => {
    if (window.confirm(`Are you sure you want to delete sample "${sample.sampleNo}"?`)) {
      try {
        await dispatch(deleteSample(sample.id)).unwrap();
        toast.success('Sample deleted successfully');
      } catch (error) {
        // Error handled by Redux
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const columns = [
    { key: 'sampleNo', title: 'Sample No', sortable: true },
    { key: 'customerName', title: 'Customer', sortable: true },
    {
      key: 'source',
      title: 'Source',
      render: (_: any, record: Sample) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          record.source === 'website' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
        }`}>
          {record.source === 'website' ? '🌐 Website' : '✏️ Manual'}
        </span>
      ),
    },
    {
      key: 'sampleType',
      title: 'Type',
      render: (_: any, record: Sample) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.sampleType === 'export' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
          {record.sampleType.charAt(0).toUpperCase() + record.sampleType.slice(1)}
        </span>
      ),
    },
    { key: 'kitPrice', title: 'Kit Price', render: (_: any, record: Sample) => `₹${record.kitPrice.toFixed(2)}` },
    { key: 'sentDate', title: 'Sent Date', render: (value: string) => formatDate(value) },
    { key: 'status', title: 'Status', render: (value: string) => getStatusBadge(value) },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Sample) => (
        <div className="flex gap-1 sm:gap-2">
          {record.source === 'website' ? (
            <Button variant="ghost" size="sm" onClick={() => generateSampleInvoice(record)} title="Download Invoice">
              <Download className="h-4 w-4 text-green-600" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => generateSampleDispatchSlip(record)} title="Print Dispatch Slip">
              <Download className="h-4 w-4 text-blue-600" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => openModal(record)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(record)} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Samples"
        searchPlaceholder="Search samples..."
        onSearch={(value) => debouncedSearch(value)}
        actions={[
          {
            label: 'Add Sample',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => openModal(),
            variant: 'primary' as const,
          },
        ]}
      />

      <div className="card overflow-x-auto">
        <div className="flex gap-2 p-4 border-b border-gray-200">
          {sourceTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setSourceFilter(tab.key); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                sourceFilter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Table data={samples} columns={columns} loading={loading} />
        <Pagination
          currentPage={pagination?.page || 1}
          totalPages={pagination?.totalPages || 1}
          total={pagination?.total || 0}
          limit={pagination?.limit || 10}
          onPageChange={setCurrentPage}
          loading={loading}
        />
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingSample ? 'Edit Sample' : 'Add Sample'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Customer Name"
              placeholder="Enter customer name"
              error={errors.customerName?.message}
              {...register('customerName')}
            />

            <Input
              label="Customer Email (Optional)"
              type="email"
              placeholder="Enter customer email"
              error={errors.customerEmail?.message}
              {...register('customerEmail')}
            />

            <Input
              label="Customer Phone (Optional)"
              placeholder="Enter customer phone"
              error={errors.customerPhone?.message}
              {...register('customerPhone')}
            />

            <Input
              label="Customer Address (Optional)"
              placeholder="Enter customer address"
              error={errors.customerAddress?.message}
              {...register('customerAddress')}
            />

            <Input
              label="Sent By (Employee Name)"
              placeholder="Enter employee name"
              error={errors.sentBy?.message}
              {...register('sentBy')}
            />

            <Select label="Sample Type" error={errors.sampleType?.message} {...register('sampleType')}>
              <option value="domestic">Domestic</option>
              <option value="export">Export</option>
            </Select>

            <Input
              label="Kit Price"
              type="number"
              step="0.01"
              placeholder="Enter kit price"
              error={errors.kitPrice?.message}
              {...register('kitPrice', { valueAsNumber: true })}
            />

            <Input
              label="Dispatch Method"
              placeholder="Enter dispatch method"
              error={errors.dispatchMethod?.message}
              {...register('dispatchMethod')}
            />

            <Input
              label="Tracking Number (Optional)"
              placeholder="Enter tracking number"
              error={errors.trackingNumber?.message}
              {...register('trackingNumber')}
            />

            <Input
              label="Sent Date"
              type="date"
              error={errors.sentDate?.message}
              {...register('sentDate')}
            />

            <Input
              label="Remarks (Optional)"
              placeholder="Enter remarks"
              error={errors.remarks?.message}
              {...register('remarks')}
            />
          </div>

          <div className="form-actions">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingSample ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Samples;
