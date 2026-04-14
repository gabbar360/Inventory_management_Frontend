import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchQuotes,
  deleteQuote,
  downloadQuotePDF,
} from '@/slices/quoteSlice';
import { Quote } from '@/types';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import QuoteForm from '@/components/forms/QuoteForm';

const Quotes: React.FC = () => {
  const dispatch = useAppDispatch();
  const { quotes, pagination, loading, error } = useAppSelector(
    (state) => state.quotes
  ) as { quotes: Quote[]; pagination: { page: number; totalPages: number; total: number; limit: number }; loading: boolean; error: string | null };

  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);

  useEffect(() => {
    dispatch(fetchQuotes({ page: currentPage, limit: 10, search }));
  }, [dispatch, search, currentPage]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const openModal = (quote?: Quote) => {
    setEditingQuote(quote || null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingQuote(null);
  };

  const handleDelete = async (quote: Quote) => {
    if (window.confirm(`Are you sure you want to delete quote "${quote.quoteNo}"?`)) {
      try {
        await dispatch(deleteQuote(quote.id)).unwrap();
        toast.success('Quote deleted successfully');
      } catch (error) {
        // Error handled by Redux
      }
    }
  };

  const handleDownloadPDF = async (quote: Quote) => {
    setDownloadingId(quote.id);
    try {
      await dispatch(downloadQuotePDF(quote.id)).unwrap();
      toast.success('PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sent' },
      accepted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Accepted' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      expired: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Expired' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const columns = [
    {
      key: 'quoteNo',
      title: 'Quote No',
      sortable: true,
    },
    {
      key: 'customer.name',
      title: 'Customer',
      render: (_: any, record: Quote) => record.customer?.name || '-',
    },
    {
      key: 'quoteDate',
      title: 'Quote Date',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'expiryDate',
      title: 'Expiry Date',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'totalAmount',
      title: 'Amount',
      render: (value: number) => `₹${value?.toFixed(2) || '0.00'}`,
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Quote) => (
        <div className="flex gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(record)} title="Download PDF" disabled={downloadingId === record.id}>
            {downloadingId === record.id
              ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              : <Download className="h-4 w-4" />}
          </Button>
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
    <div className="space-y-4">
      <PageHeader
        title="Quotes"
        searchPlaceholder="Search quotes..."
        onSearch={(value) => debouncedSearch(value)}
        actions={[
          {
            label: 'Add Quote',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => openModal(),
            variant: 'primary' as const,
          },
        ]}
      />

      {/* Table */}
      <div className="card overflow-x-auto">
        <Table data={quotes} columns={columns} loading={loading} />

        <Pagination
          currentPage={pagination?.page || 1}
          totalPages={pagination?.totalPages || 1}
          total={pagination?.total || 0}
          limit={pagination?.limit || 10}
          onPageChange={setCurrentPage}
          loading={loading}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingQuote ? 'Edit Quote' : 'Add Quote'}
        size="xl"
      >
        <QuoteForm quote={editingQuote || undefined} onClose={closeModal} />
      </Modal>
    </div>
  );
};

export default Quotes;
