import { useState, useEffect } from 'react';
import { OrderDispatch } from '@/types';
import { orderDispatchService } from '@/services/orderDispatchService';

interface OrderDispatchListProps {
  onEdit?: (dispatch: OrderDispatch) => void;
  onDelete?: (id: number) => void;
  onViewDetails?: (dispatch: OrderDispatch) => void;
}

export const OrderDispatchList = ({ onEdit, onDelete, onViewDetails }: OrderDispatchListProps) => {
  const [dispatches, setDispatches] = useState<OrderDispatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadDispatches();
  }, [page, limit, search, status]);

  const loadDispatches = async () => {
    try {
      setLoading(true);
      const result = await orderDispatchService.getAll({
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
      });
      setDispatches(result.data);
      setTotal(result.pagination.total);
    } catch (error) {
      console.error('Error loading dispatches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this dispatch?')) {
      try {
        await orderDispatchService.delete(id);
        onDelete?.(id);
        loadDispatches();
      } catch (error) {
        console.error('Error deleting dispatch:', error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      dispatched: 'bg-blue-100 text-blue-800',
      in_transit: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by dispatch no, tracking number, order no..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-3 py-2 border rounded-lg"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="dispatched">Dispatched</option>
          <option value="in_transit">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : dispatches.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No dispatches found</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">Dispatch No</th>
                  <th className="px-4 py-2 text-left">Order No</th>
                  <th className="px-4 py-2 text-left">Customer</th>
                  <th className="px-4 py-2 text-left">Dispatch Date</th>
                  <th className="px-4 py-2 text-left">Shipping Method</th>
                  <th className="px-4 py-2 text-left">Details</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.map((dispatch) => {
                  const getShippingDetails = () => {
                    switch (dispatch.shippingMethod) {
                      case 'courier':
                        return dispatch.courierName || dispatch.trackingNumber || '-';
                      case 'truck':
                        return dispatch.truckNumber || dispatch.driverName || '-';
                      case 'air':
                        return dispatch.flightNumber || dispatch.airlineCode || '-';
                      case 'sea':
                        return dispatch.vesselName || dispatch.containerNumber || '-';
                      default:
                        return '-';
                    }
                  };

                  return (
                    <tr key={dispatch.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{dispatch.dispatchNo}</td>
                      <td className="px-4 py-2">{dispatch.salesOrder?.orderNo}</td>
                      <td className="px-4 py-2">{dispatch.salesOrder?.customer?.name}</td>
                      <td className="px-4 py-2">{new Date(dispatch.dispatchDate).toLocaleDateString()}</td>
                      <td className="px-4 py-2 capitalize">{dispatch.shippingMethod}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{getShippingDetails()}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(dispatch.status)}`}>
                          {dispatch.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => onViewDetails?.(dispatch)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            View
                          </button>
                          <button
                            onClick={() => onEdit?.(dispatch)}
                            className="text-green-600 hover:text-green-800 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(dispatch.id)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} dispatches
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1">{page}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page * limit >= total}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
