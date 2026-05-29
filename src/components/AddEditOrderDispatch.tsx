import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSalesOrders } from '@/slices/salesOrderSlice';
import { useLocationData } from '@/hooks/useLocationData';
import { SearchableDropdown } from './SearchableDropdown';
import { OrderDispatch, SalesOrder } from '@/types';
import { orderDispatchService } from '@/services/orderDispatchService';
import Button from '@/components/Button';

interface AddEditOrderDispatchProps {
  dispatch?: OrderDispatch;
  onSuccess: () => void;
  onCancel: () => void;
  viewOnly?: boolean;
}

const AddEditOrderDispatch: React.FC<AddEditOrderDispatchProps> = ({ dispatch, onSuccess, onCancel, viewOnly = false }) => {
  const reduxDispatch = useAppDispatch();
  const { orders: salesOrders } = useAppSelector((state) => state.salesOrders);
  
  const {
    countries,
    states,
    cities,
    selectedCountry,
    selectedState,
    selectedCity,
    setSelectedCountry,
    setSelectedState,
    setSelectedCity,
    loading: locationLoading,
  } = useLocationData();

  const [loading, setLoading] = useState(false);
  const [selectedSalesOrder, setSelectedSalesOrder] = useState<SalesOrder | null>(null);
  const [dispatchedOrderIds, setDispatchedOrderIds] = useState<Set<number>>(new Set());
  const [pendingCity, setPendingCity] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    salesOrderId: '',
    dispatchDate: new Date().toISOString().split('T')[0],
    status: 'pending',
    shippingMethod: 'courier',
    trackingNumber: '',
    carrier: '',
    estimatedDelivery: '',
    actualDelivery: '',
    shippingAddress: '',
    shippingPincode: '',
    weight: '',
    packageCount: '1',
    shippingCost: '0',
    insuranceAmount: '0',
    notes: '',
    toTheOrder: false,
    courierName: '',
    courierPhone: '',
    truckNumber: '',
    driverName: '',
    driverPhone: '',
    airlineCode: '',
    flightNumber: '',
    containerNumber: '',
    vesselName: '',
    portOfLoading: '',
    portOfDischarge: '',
  });

  useEffect(() => {
    reduxDispatch(fetchSalesOrders({ page: 1, limit: 1000, status: 'confirmed' }));
    loadDispatchedOrderIds();
  }, [reduxDispatch]);

  useEffect(() => {
    if (pendingCity && cities.length > 0) {
      setSelectedCity(pendingCity);
      setPendingCity(null);
    }
  }, [cities, pendingCity, setSelectedCity]);

  const loadDispatchedOrderIds = async () => {
    try {
      const result = await orderDispatchService.getAll({ page: 1, limit: 10000 });
      const ids = new Set<number>((result.data || result.dispatches || []).map((d: OrderDispatch) => d.salesOrderId));
      setDispatchedOrderIds(ids);
    } catch (error) {
      console.error('Error loading dispatched orders:', error);
    }
  };

  useEffect(() => {
    if (dispatch?.id) {
      loadDispatch();
    }
  }, [dispatch?.id]);

  const loadDispatch = async () => {
    try {
      setLoading(true);
      const dispatchData = await orderDispatchService.getById(dispatch!.id);
      setSelectedSalesOrder(dispatchData.salesOrder);
      setFormData({
        salesOrderId: dispatchData.salesOrderId.toString(),
        dispatchDate: dispatchData.dispatchDate.split('T')[0],
        status: dispatchData.status,
        shippingMethod: dispatchData.shippingMethod,
        trackingNumber: dispatchData.trackingNumber || '',
        carrier: dispatchData.carrier || '',
        estimatedDelivery: dispatchData.estimatedDelivery ? dispatchData.estimatedDelivery.split('T')[0] : '',
        actualDelivery: dispatchData.actualDelivery ? dispatchData.actualDelivery.split('T')[0] : '',
        shippingAddress: dispatchData.shippingAddress,
        shippingPincode: dispatchData.shippingPincode,
        weight: dispatchData.weight?.toString() || '',
        packageCount: dispatchData.packageCount.toString(),
        shippingCost: dispatchData.shippingCost.toString(),
        insuranceAmount: dispatchData.insuranceAmount.toString(),
        notes: dispatchData.notes || '',
        toTheOrder: dispatchData.toTheOrder || false,
        courierName: dispatchData.courierName || '',
        courierPhone: dispatchData.courierPhone || '',
        truckNumber: dispatchData.truckNumber || '',
        driverName: dispatchData.driverName || '',
        driverPhone: dispatchData.driverPhone || '',
        airlineCode: dispatchData.airlineCode || '',
        flightNumber: dispatchData.flightNumber || '',
        containerNumber: dispatchData.containerNumber || '',
        vesselName: dispatchData.vesselName || '',
        portOfLoading: dispatchData.portOfLoading || '',
        portOfDischarge: dispatchData.portOfDischarge || '',
      });
      
      setSelectedCountry(dispatchData.shippingCountry);
      setSelectedState(dispatchData.shippingState);
      setPendingCity(dispatchData.shippingCity);
    } catch (error) {
      console.error('Error loading dispatch:', error);
      toast.error('Failed to load dispatch');
    } finally {
      setLoading(false);
    }
  };

  const prefillFromSalesOrder = (order: SalesOrder) => {
    setFormData(prev => ({
      ...prev,
      salesOrderId: order.id.toString(),
      shippingAddress: order.customer?.address || '',
    }));
  };

  const handleSalesOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const orderId = e.target.value;
    const order = salesOrders.find(o => o.id.toString() === orderId);
    if (order) {
      setSelectedSalesOrder(order);
      prefillFromSalesOrder(order);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => {
        const updated = { ...prev, [name]: value };
        if (name === 'shippingMethod') {
          updated.courierName = '';
          updated.courierPhone = '';
          updated.trackingNumber = '';
          updated.carrier = '';
          updated.truckNumber = '';
          updated.driverName = '';
          updated.driverPhone = '';
          updated.airlineCode = '';
          updated.flightNumber = '';
          updated.containerNumber = '';
          updated.vesselName = '';
          updated.portOfLoading = '';
          updated.portOfDischarge = '';
        }
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.salesOrderId) {
      toast.error('Please select a sales order');
      return;
    }

    if (!selectedCountry || !selectedState || !selectedCity) {
      toast.error('Please select Country, State, and City');
      return;
    }

    if (!formData.shippingPincode) {
      toast.error('Please enter Pincode');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        salesOrderId: parseInt(formData.salesOrderId),
        dispatchDate: formData.dispatchDate,
        status: formData.status,
        shippingMethod: formData.shippingMethod,
        trackingNumber: formData.trackingNumber || null,
        carrier: formData.carrier || null,
        estimatedDelivery: formData.estimatedDelivery || null,
        actualDelivery: formData.actualDelivery || null,
        shippingAddress: formData.shippingAddress,
        shippingCity: selectedCity,
        shippingState: selectedState,
        shippingPincode: formData.shippingPincode,
        shippingCountry: selectedCountry,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        packageCount: parseInt(formData.packageCount),
        shippingCost: parseFloat(formData.shippingCost),
        insuranceAmount: parseFloat(formData.insuranceAmount),
        notes: formData.notes || null,
        toTheOrder: formData.toTheOrder || false,
        courierName: formData.courierName || null,
        courierPhone: formData.courierPhone || null,
        truckNumber: formData.truckNumber || null,
        driverName: formData.driverName || null,
        driverPhone: formData.driverPhone || null,
        airlineCode: formData.airlineCode || null,
        flightNumber: formData.flightNumber || null,
        containerNumber: formData.containerNumber || null,
        vesselName: formData.vesselName || null,
        portOfLoading: formData.portOfLoading || null,
        portOfDischarge: formData.portOfDischarge || null,
      };

      if (dispatch?.id) {
        await orderDispatchService.update(dispatch.id, payload);
        toast.success('Dispatch updated successfully');
      } else {
        await orderDispatchService.create(payload);
        toast.success('Dispatch created successfully');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error saving dispatch:', error);
      toast.error(error?.message || 'Failed to save dispatch');
    } finally {
      setLoading(false);
    }
  };

  const availableSalesOrders = salesOrders.filter(order => !dispatchedOrderIds.has(Number(order.id)));
  const countryOptions = countries.map(c => ({ name: c.name, code: c.code }));
  const stateOptions = states.map(s => ({ name: s.name, code: s.code }));
  const cityOptions = cities.map(c => ({ name: c }));

  const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    dispatched: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Dispatched' },
    in_transit: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'In Transit' },
    delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
  };

  if (viewOnly && dispatch) {
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
              onClick={onCancel}
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
                <p className="font-medium">{new Date(dispatch.salesOrder?.orderDate || '').toLocaleDateString()}</p>
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
                <p className="font-medium">{new Date(dispatch.dispatchDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-gray-600 block text-xs font-medium mb-1">Shipping Method</span>
                <p className="font-medium capitalize">{dispatch.shippingMethod}</p>
              </div>
              {dispatch.shippingMethod === 'courier' && (
                <>
                  {dispatch.courierName && (
                    <div>
                      <span className="text-gray-600 block text-xs font-medium mb-1">Courier Name</span>
                      <p className="font-medium">{dispatch.courierName}</p>
                    </div>
                  )}
                  {dispatch.courierPhone && (
                    <div>
                      <span className="text-gray-600 block text-xs font-medium mb-1">Courier Phone</span>
                      <p className="font-medium">{dispatch.courierPhone}</p>
                    </div>
                  )}
                  {dispatch.trackingNumber && (
                    <div>
                      <span className="text-gray-600 block text-xs font-medium mb-1">Tracking Number</span>
                      <p className="font-medium">{dispatch.trackingNumber}</p>
                    </div>
                  )}
                  {dispatch.carrier && (
                    <div>
                      <span className="text-gray-600 block text-xs font-medium mb-1">Carrier</span>
                      <p className="font-medium">{dispatch.carrier}</p>
                    </div>
                  )}
                </>
              )}
              {dispatch.shippingMethod === 'truck' && (
                <>
                  {dispatch.truckNumber && (
                    <div>
                      <span className="text-gray-600 block text-xs font-medium mb-1">Truck Number</span>
                      <p className="font-medium">{dispatch.truckNumber}</p>
                    </div>
                  )}
                  {dispatch.driverName && (
                    <div>
                      <span className="text-gray-600 block text-xs font-medium mb-1">Driver Name</span>
                      <p className="font-medium">{dispatch.driverName}</p>
                    </div>
                  )}
                  {dispatch.driverPhone && (
                    <div>
                      <span className="text-gray-600 block text-xs font-medium mb-1">Driver Phone</span>
                      <p className="font-medium">{dispatch.driverPhone}</p>
                    </div>
                  )}
                </>
              )}
              {dispatch.shippingMethod === 'air' && (
                <>
                  {dispatch.airlineCode && (
                    <div>
                      <span className="text-gray-600 block text-xs font-medium mb-1">Airline Code</span>
                      <p className="font-medium">{dispatch.airlineCode}</p>
                    </div>
                  )}
                  {dispatch.flightNumber && (
                    <div>
                      <span className="text-gray-600 block text-xs font-medium mb-1">Flight Number</span>
                      <p className="font-medium">{dispatch.flightNumber}</p>
                    </div>
                  )}
                </>
              )}
              {dispatch.shippingMethod === 'sea' && (
                <>
                  {dispatch.vesselName && (
                    <div>
                      <span className="text-gray-600 block text-xs font-medium mb-1">Vessel Name</span>
                      <p className="font-medium">{dispatch.vesselName}</p>
                    </div>
                  )}
                  {dispatch.containerNumber && (
                    <div>
                      <span className="text-gray-600 block text-xs font-medium mb-1">Container Number</span>
                      <p className="font-medium">{dispatch.containerNumber}</p>
                    </div>
                  )}
                  {dispatch.portOfLoading && (
                    <div>
                      <span className="text-gray-600 block text-xs font-medium mb-1">Port of Loading</span>
                      <p className="font-medium">{dispatch.portOfLoading}</p>
                    </div>
                  )}
                  {dispatch.portOfDischarge && (
                    <div>
                      <span className="text-gray-600 block text-xs font-medium mb-1">Port of Discharge</span>
                      <p className="font-medium">{dispatch.portOfDischarge}</p>
                    </div>
                  )}
                </>
              )}
              {dispatch.estimatedDelivery && (
                <div>
                  <span className="text-gray-600 block text-xs font-medium mb-1">Estimated Delivery</span>
                  <p className="font-medium">{new Date(dispatch.estimatedDelivery).toLocaleDateString()}</p>
                </div>
              )}
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
                  {dispatch.estimatedDelivery ? new Date(dispatch.estimatedDelivery).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <span className="text-gray-600 block text-xs font-medium mb-1">Actual Delivery</span>
                <p className="font-medium">
                  {dispatch.actualDelivery ? new Date(dispatch.actualDelivery).toLocaleDateString() : '-'}
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
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            title="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {dispatch ? 'Edit Order Dispatch' : 'Add New Order Dispatch'}
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Sales Order *</label>
            {dispatch ? (
              <div className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-700">
                {selectedSalesOrder?.orderNo} - {selectedSalesOrder?.customer?.name} (₹{selectedSalesOrder?.totalAmount.toFixed(2)})
              </div>
            ) : (
              <select
                name="salesOrderId"
                value={formData.salesOrderId}
                onChange={handleSalesOrderChange}
                required
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select a sales order...</option>
                {availableSalesOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNo} - {order.customer?.name} (₹{order.totalAmount.toFixed(2)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedSalesOrder && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Sales Order Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Order No:</span>
                  <p className="font-medium">{selectedSalesOrder.orderNo}</p>
                </div>
                <div>
                  <span className="text-gray-600">Customer:</span>
                  <p className="font-medium">{selectedSalesOrder.customer?.name}</p>
                </div>
                <div>
                  <span className="text-gray-600">Total Amount:</span>
                  <p className="font-medium">₹{selectedSalesOrder.totalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <p className="font-medium">{selectedSalesOrder.status}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Dispatch Date *</label>
              <input
                type="date"
                name="dispatchDate"
                value={formData.dispatchDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="pending">Pending</option>
                <option value="dispatched">Dispatched</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Shipping Method *</label>
              <select
                name="shippingMethod"
                value={formData.shippingMethod}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="courier">Courier</option>
                <option value="truck">Truck</option>
                <option value="air">Air</option>
                <option value="sea">Sea</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Delivery</label>
              <input
                type="date"
                name="estimatedDelivery"
                value={formData.estimatedDelivery}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {formData.shippingMethod === 'courier' && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">Courier Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Courier Name</label>
                  <input
                    type="text"
                    name="courierName"
                    value={formData.courierName}
                    onChange={handleChange}
                    placeholder="e.g., FedEx, DHL, UPS"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Courier Phone</label>
                  <input
                    type="tel"
                    name="courierPhone"
                    value={formData.courierPhone}
                    onChange={handleChange}
                    placeholder="Contact number"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tracking Number</label>
                  <input
                    type="text"
                    name="trackingNumber"
                    value={formData.trackingNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Carrier/Logistics Company</label>
                  <input
                    type="text"
                    name="carrier"
                    value={formData.carrier}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.shippingMethod === 'truck' && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-900 mb-3">Truck Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Truck Number *</label>
                  <input
                    type="text"
                    name="truckNumber"
                    value={formData.truckNumber}
                    onChange={handleChange}
                    placeholder="e.g., MH-01-AB-1234"
                    required={formData.shippingMethod === 'truck'}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Driver Name *</label>
                  <input
                    type="text"
                    name="driverName"
                    value={formData.driverName}
                    onChange={handleChange}
                    placeholder="Driver name"
                    required={formData.shippingMethod === 'truck'}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Driver Phone *</label>
                  <input
                    type="tel"
                    name="driverPhone"
                    value={formData.driverPhone}
                    onChange={handleChange}
                    placeholder="Driver contact number"
                    required={formData.shippingMethod === 'truck'}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.shippingMethod === 'air' && (
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-3">Air Cargo Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Airline Code *</label>
                  <input
                    type="text"
                    name="airlineCode"
                    value={formData.airlineCode}
                    onChange={handleChange}
                    placeholder="e.g., AI, 6E, SG"
                    required={formData.shippingMethod === 'air'}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Flight Number *</label>
                  <input
                    type="text"
                    name="flightNumber"
                    value={formData.flightNumber}
                    onChange={handleChange}
                    placeholder="e.g., AI-101"
                    required={formData.shippingMethod === 'air'}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.shippingMethod === 'sea' && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-3">Sea Cargo Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Container Number *</label>
                  <input
                    type="text"
                    name="containerNumber"
                    value={formData.containerNumber}
                    onChange={handleChange}
                    placeholder="e.g., CONT-123456"
                    required={formData.shippingMethod === 'sea'}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Vessel Name *</label>
                  <input
                    type="text"
                    name="vesselName"
                    value={formData.vesselName}
                    onChange={handleChange}
                    placeholder="Ship/Vessel name"
                    required={formData.shippingMethod === 'sea'}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Port of Loading *</label>
                  <input
                    type="text"
                    name="portOfLoading"
                    value={formData.portOfLoading}
                    onChange={handleChange}
                    placeholder="e.g., Port of Mumbai"
                    required={formData.shippingMethod === 'sea'}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Port of Discharge *</label>
                  <input
                    type="text"
                    name="portOfDischarge"
                    value={formData.portOfDischarge}
                    onChange={handleChange}
                    placeholder="e.g., Port of Singapore"
                    required={formData.shippingMethod === 'sea'}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Weight (kg)</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Actual Delivery Date</label>
              <input
                type="date"
                name="actualDelivery"
                value={formData.actualDelivery}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Shipping Address *</label>
            <textarea
              name="shippingAddress"
              value={formData.shippingAddress}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <SearchableDropdown
              label="Country"
              value={selectedCountry}
              options={countryOptions}
              onChange={setSelectedCountry}
              loading={locationLoading.countries}
              required
            />
            <SearchableDropdown
              label="State"
              value={selectedState}
              options={stateOptions}
              onChange={setSelectedState}
              disabled={!selectedCountry}
              loading={locationLoading.states}
              required
            />
            <SearchableDropdown
              label="City"
              value={selectedCity}
              options={cityOptions}
              onChange={setSelectedCity}
              disabled={!selectedState}
              loading={locationLoading.cities}
              required
            />
            <div>
              <label className="block text-sm font-medium mb-1">Pincode *</label>
              <input
                type="text"
                name="shippingPincode"
                value={formData.shippingPincode}
                onChange={handleChange}
                placeholder="Enter pincode"
                required
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Package Count</label>
              <input
                type="number"
                name="packageCount"
                value={formData.packageCount}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Shipping Cost</label>
              <input
                type="number"
                name="shippingCost"
                value={formData.shippingCost}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Insurance Amount</label>
              <input
                type="number"
                name="insuranceAmount"
                value={formData.insuranceAmount}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="toTheOrder"
              checked={formData.toTheOrder || false}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300"
            />
            <label className="text-sm font-medium text-gray-700">Hide Bill To & Ship To (Show "To The Order" instead)</label>
          </div>

          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="px-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              className="px-8"
            >
              {loading ? 'Saving...' : dispatch ? 'Update Dispatch' : 'Create Dispatch'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditOrderDispatch;
