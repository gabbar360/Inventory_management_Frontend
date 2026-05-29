import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, RefreshCw, Edit, Download, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { formatDate, debounce } from '@/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCustomers } from '@/slices/customerSlice';
import Button from '@/components/Button';
import PageHeader from '@/components/PageHeader';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import api from '@/utils/api';
import WebsiteQuoteForm from '@/components/forms/WebsiteQuoteForm';

interface WebsiteQuote {
  id: number;
  quoteNo: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
  mobile?: string;
  orderType: string;
  gstin?: string;
  city?: string;
  state?: string;
  pincode?: string;
  billingAddress?: string;
  country?: string;
  deliveryTerms?: string;
  portOfDischarge?: string;
  address?: string;
  additionalRequirements?: string;
  totalPieces: number;
  totalWeight?: string;
  totalCBM?: string;
  products: string;
  prices?: string;
  discount?: number;
  shippingCharge?: number;
  tax?: number;
  notes?: string;
  termsAndConditions?: string;
  termsOfDelivery?: string;
  paymentTerms?: string;
  quoteDate: string;
  status: string;
  remarks?: string;
  createdAt: string;
}

const STATUS_OPTIONS = ['new', 'contacted', 'converted', 'rejected'];

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    converted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-800'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const WebsiteQuotes: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { customers } = useAppSelector((state) => state.customers);

  const [quotes, setQuotes] = useState<WebsiteQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [editingQuote, setEditingQuote] = useState<WebsiteQuote | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Convert to Sales Order state
  const [convertSOQuote, setConvertSOQuote] = useState<WebsiteQuote | null>(null);
  const [convertingSOId, setConvertingSOId] = useState<number | null>(null);
  const [custSearch, setCustSearch] = useState('');
  const [custOpen, setCustOpen] = useState(false);
  const [soForm, setSoForm] = useState({ customerId: '', orderDate: new Date().toISOString().split('T')[0] });

  useEffect(() => { dispatch(fetchCustomers({ limit: 1000 })); }, [dispatch]);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (orderTypeFilter) params.append('orderType', orderTypeFilter);
      const res = await api.get(`/website-quotes?${params.toString()}`);
      setQuotes(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0, limit: 20 });
    } catch {
      toast.error('Failed to fetch website quotes');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, orderTypeFilter]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const debouncedSearch = debounce((val: string) => {
    setSearch(val);
    setCurrentPage(1);
  });

  const handleStatusChange = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      await api.put(`/website-quotes/${id}/status`, { status });
      toast.success('Status updated');
      fetchQuotes();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDownloadPdf = async (quote: WebsiteQuote) => {
    setDownloadingId(quote.id);
    try {
      const res = await api.get(`/website-quotes/${quote.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `WebsiteQuote-${quote.quoteNo}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: number, quoteNo: string) => {
    if (!window.confirm(`Delete quote "${quoteNo}"?`)) return;
    try {
      await api.delete(`/website-quotes/${id}`);
      toast.success('Deleted successfully');
      fetchQuotes();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const openConvertSOModal = (quote: WebsiteQuote) => {
    setConvertSOQuote(quote);
    setSoForm({ customerId: '', orderDate: new Date().toISOString().split('T')[0] });
    setCustSearch('');
  };

  const handleConvertToSalesOrder = async () => {
    if (!convertSOQuote || !soForm.customerId || !soForm.orderDate) {
      toast.error('Please select customer and order date');
      return;
    }
    setConvertingSOId(convertSOQuote.id);
    try {
      await api.post(`/website-quotes/${convertSOQuote.id}/convert-to-sales-order`, {
        customerId: soForm.customerId,
        orderDate: soForm.orderDate,
      });
      toast.success(`Sales Order created from ${convertSOQuote.quoteNo}`);
      setConvertSOQuote(null);
      fetchQuotes();
      navigate('/sales-orders');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to convert');
    } finally {
      setConvertingSOId(null);
    }
  };

  const customerOptions = customers.map((c: any) => ({ value: c.id.toString(), label: `${c.code} - ${c.name}` }));
  const filteredCustomers = customerOptions.filter((o) => o.label.toLowerCase().includes(custSearch.toLowerCase()));

  const columns = [
    { key: 'quoteNo', title: 'Quote No', sortable: true },
    { key: 'companyName', title: 'Company' },
    {
      key: 'orderType',
      title: 'Type',
      render: (val: string) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${val === 'international' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'}`}>
          {val === 'international' ? 'International' : 'Domestic'}
        </span>
      ),
    },
    { key: 'totalPieces', title: 'Total Pcs', render: (val: number) => val.toLocaleString() },
    { key: 'totalWeight', title: 'Weight', render: (val: string) => val || '-' },
    { key: 'quoteDate', title: 'Date', render: (val: string) => formatDate(val) },
    { key: 'status', title: 'Status', render: (val: string) => statusBadge(val) },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: WebsiteQuote) => (
        <div className="flex gap-1 items-center">
          <Button variant="ghost" size="sm" onClick={() => handleDownloadPdf(record)} title="Download PDF" disabled={downloadingId === record.id}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditingQuote(record)} title="Edit">
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openConvertSOModal(record)}
            title="Convert to Sales Order"
            className="text-green-600 hover:text-green-700"
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
          <select
            value={record.status}
            disabled={updatingId === record.id}
            onChange={(e) => handleStatusChange(record.id, e.target.value)}
            className="text-xs border rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(record.id, record.quoteNo)} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Website Quotes"
        searchPlaceholder="Search by company, email, quote no..."
        onSearch={debouncedSearch}
        actions={[{ label: 'Refresh', icon: <RefreshCw className="h-4 w-4" />, onClick: fetchQuotes, variant: 'outline' as const }]}
      />

      <div className="card flex flex-wrap gap-3 p-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select
          value={orderTypeFilter}
          onChange={(e) => { setOrderTypeFilter(e.target.value); setCurrentPage(1); }}
          className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Types</option>
          <option value="domestic">Domestic</option>
          <option value="international">International</option>
        </select>
        <span className="text-sm text-gray-500 self-center">Total: {pagination.total} quotes</span>
      </div>

      <div className="card overflow-x-auto">
        <Table data={quotes} columns={columns} loading={loading} />
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={setCurrentPage}
          loading={loading}
        />
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!editingQuote} onClose={() => setEditingQuote(null)} title="Edit Website Quote" size="xl">
        {editingQuote && (
          <WebsiteQuoteForm quote={editingQuote} onClose={() => setEditingQuote(null)} onSaved={fetchQuotes} />
        )}
      </Modal>

      {/* Convert to Sales Order Modal */}
      <Modal
        isOpen={!!convertSOQuote}
        onClose={() => setConvertSOQuote(null)}
        title={`Convert to Sales Order - ${convertSOQuote?.quoteNo}`}
        size="sm"
      >
        {convertSOQuote && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <div>Company: <span className="font-semibold">{convertSOQuote.companyName}</span></div>
              <div>Products: <span className="font-semibold">{convertSOQuote.totalPieces} pcs</span></div>
            </div>

            {/* Customer searchable dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer <span className="text-red-500">*</span></label>
              <input
                type="text"
                autoComplete="off"
                placeholder="Search customer..."
                value={custSearch}
                onChange={(e) => { setCustSearch(e.target.value); setSoForm({ ...soForm, customerId: '' }); setCustOpen(true); }}
                onFocus={() => setCustOpen(true)}
                onBlur={() => setTimeout(() => setCustOpen(false), 150)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input type="text" required value={soForm.customerId} onChange={() => {}} className="sr-only" tabIndex={-1} />
              {custOpen && (
                <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                  {filteredCustomers.map((o) => (
                    <li key={o.value} onMouseDown={() => { setSoForm({ ...soForm, customerId: o.value }); setCustSearch(o.label); setCustOpen(false); }}
                      className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm">{o.label}</li>
                  ))}
                  {filteredCustomers.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">No customers found</li>}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={soForm.orderDate}
                onChange={(e) => setSoForm({ ...soForm, orderDate: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setConvertSOQuote(null)}>Cancel</Button>
              <Button
                onClick={handleConvertToSalesOrder}
                loading={convertingSOId === convertSOQuote.id}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Create Sales Order
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WebsiteQuotes;
