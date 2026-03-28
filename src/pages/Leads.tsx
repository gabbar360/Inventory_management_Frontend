import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchLeads, updateLead, deleteLead, clearError } from '@/slices/leadSlice';
import { Lead } from '@/types';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  converted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const FORM_TYPE_COLORS: Record<string, string> = {
  ContactForm: 'bg-purple-100 text-purple-700',
  PartnerForm: 'bg-indigo-100 text-indigo-700',
  PartnerFormNew: 'bg-indigo-100 text-indigo-700',
  QuoteCartForm: 'bg-orange-100 text-orange-700',
};

const Leads: React.FC = () => {
  const dispatch = useAppDispatch();
  const { leads, pagination, loading, error } = useAppSelector((state) => state.leads);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    dispatch(fetchLeads({ page: currentPage, limit: 10, search }));
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

  const handleStatusChange = async (lead: Lead, status: Lead['status']) => {
    try {
      await dispatch(updateLead({ id: lead.id, data: { status } })).unwrap();
      toast.success('Status updated');
    } catch {
      // handled by redux
    }
  };

  const handleDelete = async (lead: Lead) => {
    if (window.confirm(`Delete lead from "${lead.name}"?`)) {
      try {
        await dispatch(deleteLead(lead.id)).unwrap();
        toast.success('Lead deleted');
      } catch {
        // handled by redux
      }
    }
  };

  const columns = [
    { key: 'name', title: 'Name', sortable: true },
    { key: 'email', title: 'Email', render: (v: string) => v || '-' },
    { key: 'phone', title: 'Phone', render: (v: string) => v || '-' },
    { key: 'company', title: 'Company', render: (v: string) => v || '-' },
    { key: 'country', title: 'Country', render: (v: string) => v || '-' },
    {
      key: 'formType',
      title: 'Source',
      render: (v: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${FORM_TYPE_COLORS[v] || 'bg-gray-100 text-gray-700'}`}>
          {v}
        </span>
      ),
    },
    {
      key: 'message',
      title: 'Message',
      render: (v: string) =>
        v ? (
          <span title={v} className="block max-w-[200px] truncate text-sm text-gray-600">
            {v}
          </span>
        ) : '-',
    },
    {
      key: 'status',
      title: 'Status',
      render: (v: Lead['status'], record: Lead) => (
        <select
          value={v}
          onChange={(e) => handleStatusChange(record, e.target.value as Lead['status'])}
          className={`text-xs font-medium rounded px-2 py-1 border-0 cursor-pointer ${STATUS_COLORS[v]}`}
        >
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="converted">Converted</option>
          <option value="rejected">Rejected</option>
        </select>
      ),
    },
    { key: 'createdAt', title: 'Received', render: (v: string) => formatDate(v) },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Lead) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDelete(record)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Leads"
        searchPlaceholder="Search leads..."
        onSearch={(value) => debouncedSearch(value)}
        actions={[]}
      />

      <div className="card overflow-hidden">
        <Table data={leads} columns={columns} loading={loading} />
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

export default Leads;
