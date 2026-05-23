import { OrderDispatch } from '@/types';
import { formatDate } from '@/utils';

interface OrderDispatchDetailsProps {
  dispatch: OrderDispatch;
  onClose?: () => void;
  onEdit?: () => void;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  dispatched: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Dispatched' },
  in_transit: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'In Transit' },
  delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
};

export const OrderDispatchDetails = ({ dispatch, onClose, onEdit }: OrderDispatchDetailsProps) => {
  const cfg = STATUS_CONFIG[dispatch.status] || STATUS_CONFIG.pending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{dispatch.dispatchNo}</h2>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Edit
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
          >
            Close
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-4 text-gray-900">Sales Order Information</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600 block text-xs font-medium mb-1">Order No</span>
              <p className="font-medium">{dispatch.salesOrder?.orderNo}</p>
            </div>
            <div>
              <span className="text-gray-600 block text-xs font-medium mb-1">Customer</span>
              <p className="font-medium">{dispatch.salesOrder?.customer?.name}</p>
            </div>
            <div>
              <span className="text-gray-600 block text-xs font-medium mb-1">Order Date</span>
              <p className="font-medium">{formatDate(dispatch.salesOrder?.orderDate || '')}</p>
            </div>
            <div>
              <span className="text-gray-600 block text-xs font-medium mb-1">Total Amount</span>
              <p className="font-medium">₹{dispatch.salesOrder?.totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-4 text-gray-900">Dispatch Information</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600 block text-xs font-medium mb-1">Dispatch Date</span>
              <p className="font-medium">{formatDate(dispatch.dispatchDate)}</p>
            </div>
            <div>
              <span className="text-gray-600 block text-xs font-medium mb-1">Shipping Method</span>
              <p className="font-medium capitalize">{dispatch.shippingMethod}</p>
            </div>
            <div>
              <span className="text-gray-600 block text-xs font-medium mb-1">Carrier</span>
              <p className="font-medium">{dispatch.carrier || '-'}</p>
            </div>
            <div>
              <span className="text-gray-600 block text-xs font-medium mb-1">Tracking Number</span>
              <p className="font-medium">{dispatch.trackingNumber || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-3 text-gray-900">Shipping Address</h3>
        <div className="text-sm space-y-1 text-gray-700">
          <p className="font-medium">{dispatch.shippingAddress}</p>
          <p>
            {dispatch.shippingCity}, {dispatch.shippingState} {dispatch.shippingPincode}
          </p>
          <p>{dispatch.shippingCountry}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-4 text-gray-900">Delivery Information</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600 block text-xs font-medium mb-1">Estimated Delivery</span>
              <p className="font-medium">
                {dispatch.estimatedDelivery ? formatDate(dispatch.estimatedDelivery) : '-'}
              </p>
            </div>
            <div>
              <span className="text-gray-600 block text-xs font-medium mb-1">Actual Delivery</span>
              <p className="font-medium">
                {dispatch.actualDelivery ? formatDate(dispatch.actualDelivery) : '-'}
              </p>
            </div>
            <div>
              <span className="text-gray-600 block text-xs font-medium mb-1">Package Count</span>
              <p className="font-medium">{dispatch.packageCount}</p>
            </div>
            <div>
              <span className="text-gray-600 block text-xs font-medium mb-1">Weight</span>
              <p className="font-medium">{dispatch.weight ? `${dispatch.weight} kg` : '-'}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-4 text-gray-900">Cost Information</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600 block text-xs font-medium mb-1">Shipping Cost</span>
              <p className="font-medium">₹{dispatch.shippingCost.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-gray-600 block text-xs font-medium mb-1">Insurance Amount</span>
              <p className="font-medium">₹{dispatch.insuranceAmount.toFixed(2)}</p>
            </div>
            <div className="border-t pt-2">
              <span className="text-gray-600 block text-xs font-medium mb-1">Total Dispatch Cost</span>
              <p className="font-bold text-base">₹{(dispatch.shippingCost + dispatch.insuranceAmount).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {dispatch.notes && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-900">Notes</h3>
          <p className="text-sm text-gray-700">{dispatch.notes}</p>
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1 border-t pt-4">
        <p>Created: {new Date(dispatch.createdAt).toLocaleString()}</p>
        <p>Updated: {new Date(dispatch.updatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
};
