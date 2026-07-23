import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSamples, fetchSampleById, updateSample, deleteSample, clearError } from '@/slices/sampleSlice';
import { Sample } from '@/types';
import { formatDate, debounce, generateSampleInvoice, generateSampleDispatchSlip } from '@/utils';
import Button from '@/components/Button';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import AddEditSample from '@/components/AddEditSample';

const Samples: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { samples, currentSample, pagination, loading, error } = useAppSelector((state) => state.samples);

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'website'>('all');
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchSamples({ page: currentPage, limit: 10, search, ...(sourceFilter !== 'all' && { source: sourceFilter }) }));
  }, [dispatch, search, currentPage, sourceFilter]);

  useEffect(() => {
    if (id) {
      dispatch(fetchSampleById(id));
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

  const sourceTabs = [
    { key: 'all', label: 'All Samples' },
    { key: 'website', label: '🌐 Website' },
    { key: 'manual', label: '✏️ Manual' },
  ] as const;

  const handleAddSample = () => {
    navigate('/samples/add');
  };

  const handleEditSample = (sample: Sample) => {
    navigate(`/samples/edit/${sample.id}`);
  };

  const handleFormSuccess = () => {
    navigate('/samples');
    dispatch(fetchSamples({ page: currentPage, limit: 10, search, ...(sourceFilter !== 'all' && { source: sourceFilter }) }));
  };

  const handleFormCancel = () => {
    navigate('/samples');
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

  const handleStatusChange = async (sample: Sample, newStatus: string) => {
    setUpdatingStatusId(sample.id);
    try {
      await dispatch(updateSample({ id: sample.id, data: { status: newStatus } as Partial<Sample> })).unwrap();
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
  };

  const getStatusCell = (record: Sample) => {
    if (record.source === 'website') {
      return (
        <select
          value={record.status}
          disabled={updatingStatusId === record.id}
          onChange={(e) => handleStatusChange(record, e.target.value)}
          className={`text-xs font-medium px-2 py-1 rounded-full border cursor-pointer focus:outline-none ${statusColors[record.status] || 'bg-gray-100 text-gray-800 border-gray-300'}`}
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      );
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${(statusColors[record.status] || 'bg-gray-100 text-gray-800').replace(' border-yellow-300','').replace(' border-green-300','').replace(' border-red-300','').replace(' border-gray-300','')}`}>
        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
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
    { key: 'status', title: 'Status', render: (_: any, record: Sample) => getStatusCell(record) },
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
          <Button variant="ghost" size="sm" onClick={() => handleEditSample(record)}>
            <Edit className="h-4 w-4" />
          </Button>
          {record.source !== 'website' && (
            <Button variant="ghost" size="sm" onClick={() => handleDelete(record)} className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Show form if in add/edit mode
  if (id || window.location.pathname.includes('/add')) {
    return (
      <AddEditSample
        sample={id && currentSample ? currentSample : undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

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
            onClick: handleAddSample,
            variant: 'primary' as const,
          },
        ]}
      />

      <div className="card overflow-x-auto">
        <div className="flex gap-2 p-3 border-b border-gray-200 overflow-x-auto scrollbar-hide">
          {sourceTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setSourceFilter(tab.key); setCurrentPage(1); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
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
    </div>
  );
};

export default Samples;
