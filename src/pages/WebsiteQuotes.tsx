import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, RefreshCw, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import PageHeader from '@/components/PageHeader';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';
import api from '@/utils/api';

interface WebsiteQuoteProduct {
  itemCode: string;
  productName: string;
  category: string;
  quantity: number;
  unit: string;
  pcsPerCarton: number;
  totalPieces: number;
  hsnCode: string;
}

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
  const [quotes, setQuotes] = useState<WebsiteQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [selectedQuote, setSelectedQuote] = useState<WebsiteQuote | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

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
      if (selectedQuote?.id === id) setSelectedQuote(prev => prev ? { ...prev, status } : null);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: number, quoteNo: string) => {
    if (!window.confirm(`Delete quote "${quoteNo}"?`)) return;
    try {
      await api.delete(`/website-quotes/${id}`);
      toast.success('Deleted successfully');
      fetchQuotes();
      if (selectedQuote?.id === id) setSelectedQuote(null);
    } catch {
      toast.error('Failed to delete');
    }
  };

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
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setSelectedQuote(record)} title="View Details">
            <Eye className="h-4 w-4" />
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

  const parsedProducts: WebsiteQuoteProduct[] = selectedQuote
    ? (() => { try { return JSON.parse(selectedQuote.products); } catch { return []; } })()
    : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Website Quotes"
        searchPlaceholder="Search by company, email, quote no..."
        onSearch={debouncedSearch}
        actions={[
          {
            label: 'Refresh',
            icon: <RefreshCw className="h-4 w-4" />,
            onClick: fetchQuotes,
            variant: 'outline' as const,
          },
        ]}
      />

      {/* Filters */}
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

      {/* Table */}
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

      {/* Detail Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedQuote.quoteNo}</h2>
                  <p className="text-sm text-gray-500">{formatDate(selectedQuote.quoteDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(selectedQuote.status)}
                  <button onClick={() => setSelectedQuote(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-3 mb-4 p-4 bg-gray-50 rounded-lg text-sm">
                <div><span className="text-gray-500">Company:</span> <span className="font-medium">{selectedQuote.companyName}</span></div>
                <div><span className="text-gray-500">Contact:</span> <span className="font-medium">{selectedQuote.contactPerson || '-'}</span></div>
                <div><span className="text-gray-500">Email:</span> <span className="font-medium">{selectedQuote.email || '-'}</span></div>
                <div><span className="text-gray-500">Mobile:</span> <span className="font-medium">{selectedQuote.mobile || '-'}</span></div>
                <div><span className="text-gray-500">Type:</span> <span className="font-medium capitalize">{selectedQuote.orderType}</span></div>
                {selectedQuote.orderType === 'domestic' ? (
                  <>
                    <div><span className="text-gray-500">GSTIN:</span> <span className="font-medium">{selectedQuote.gstin || '-'}</span></div>
                    <div><span className="text-gray-500">City/State:</span> <span className="font-medium">{[selectedQuote.city, selectedQuote.state, selectedQuote.pincode].filter(Boolean).join(', ') || '-'}</span></div>
                    <div className="col-span-2"><span className="text-gray-500">Billing Address:</span> <span className="font-medium">{selectedQuote.billingAddress || '-'}</span></div>
                  </>
                ) : (
                  <>
                    <div><span className="text-gray-500">Country:</span> <span className="font-medium">{selectedQuote.country || '-'}</span></div>
                    <div><span className="text-gray-500">Delivery Terms:</span> <span className="font-medium">{selectedQuote.deliveryTerms || '-'}</span></div>
                    <div><span className="text-gray-500">Port:</span> <span className="font-medium">{selectedQuote.portOfDischarge || '-'}</span></div>
                    <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="font-medium">{selectedQuote.address || '-'}</span></div>
                  </>
                )}
                {selectedQuote.additionalRequirements && (
                  <div className="col-span-2"><span className="text-gray-500">Additional:</span> <span className="font-medium">{selectedQuote.additionalRequirements}</span></div>
                )}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-green-50 rounded border text-center">
                  <div className="text-xs text-gray-500">Total Pieces</div>
                  <div className="font-bold text-green-700">{selectedQuote.totalPieces.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-green-50 rounded border text-center">
                  <div className="text-xs text-gray-500">Total Weight</div>
                  <div className="font-bold text-green-700">{selectedQuote.totalWeight || '-'}</div>
                </div>
                <div className="p-3 bg-green-50 rounded border text-center">
                  <div className="text-xs text-gray-500">Total CBM</div>
                  <div className="font-bold text-green-700">{selectedQuote.totalCBM || '-'}</div>
                </div>
              </div>

              {/* Products Table */}
              <h3 className="font-semibold mb-2">Products ({parsedProducts.length})</h3>
              <div className="overflow-x-auto rounded border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Pcs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedProducts.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{p.productName}</td>
                        <td className="px-3 py-2 text-gray-500 font-mono text-xs">{p.itemCode}</td>
                        <td className="px-3 py-2 text-gray-500">{p.category}</td>
                        <td className="px-3 py-2 text-right">{p.quantity}</td>
                        <td className="px-3 py-2 capitalize">{p.unit}</td>
                        <td className="px-3 py-2 text-right font-medium">{p.totalPieces.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Status Update */}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Update Status:</span>
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(selectedQuote.id, s)}
                    disabled={selectedQuote.status === s || updatingId === selectedQuote.id}
                    className={`px-3 py-1 rounded text-xs font-medium border transition-colors disabled:opacity-50 ${
                      selectedQuote.status === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteQuotes;
