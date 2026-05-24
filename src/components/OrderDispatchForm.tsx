import { useState, useEffect } from 'react';
import { OrderDispatch, SalesOrder } from '@/types';
import { orderDispatchService } from '@/services/orderDispatchService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSalesOrders } from '@/slices/salesOrderSlice';
import { useLocationData } from '@/hooks/useLocationData';
import { SearchableDropdown } from './SearchableDropdown';
import toast from 'react-hot-toast';

interface OrderDispatchFormProps {
  salesOrderId?: string;
  dispatchId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const OrderDispatchForm = ({ salesOrderId, dispatchId, onSuccess, onCancel }: OrderDispatchFormProps) => {
  const dispatch = useAppDispatch();
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

  const [formData, setFormData] = useState({
    salesOrderId: salesOrderId || '',
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
    dispatch(fetchSalesOrders({ page: 1, limit: 1000, status: 'confirmed' }));
    loadDispatchedOrderIds();
  }, [dispatch]);



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
    if (dispatchId) {
      loadDispatch();
    } else if (salesOrderId) {
      const order = salesOrders.find(o => o.id.toString() === salesOrderId);
      if (order) {
        setSelectedSalesOrder(order);
        prefillFromSalesOrder(order);
      }
    }
  }, [dispatchId, salesOrderId, salesOrders]);

  const loadDispatch = async () => {
    try {
      setLoading(true);
      const dispatchData = await orderDispatchService.getById(dispatchId!);
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
      
      // Set location values
      setSelectedCountry(dispatchData.shippingCountry);
      setSelectedState(dispatchData.shippingState);
      setSelectedCity(dispatchData.shippingCity);
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

      if (dispatchId) {
        await orderDispatchService.update(dispatchId, payload);
        toast.success('Dispatch updated successfully');
      } else {
        await orderDispatchService.create(payload);
        toast.success('Dispatch created successfully');
      }
      onSuccess?.();
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

  if (loading && !selectedSalesOrder && dispatchId) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">Sales Order *</label>
        {dispatchId ? (
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

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : dispatchId ? 'Update Dispatch' : 'Create Dispatch'}
        </button>
      </div>
    </form>
  );
};
