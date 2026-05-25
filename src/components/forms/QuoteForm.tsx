import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronDown, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createQuote, updateQuote, fetchQuotes, fetchQuoteById, clearCurrentQuote } from '@/slices/quoteSlice';
import { fetchCustomers, createCustomer } from '@/slices/customerSlice';
import { fetchProducts } from '@/slices/productSlice';
import { Quote } from '@/types';
import { cn } from '@/utils';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Button from '@/components/Button';
import ProductSearch from '@/components/ProductSearch';

interface QuoteItem {
  id?: number;
  tempId?: number; // For new items before saving
  productId: number;
  quantity: number | '';
  unit: string;
  rate: number | '';
  taxRate: number | ''; // Product-wise tax rate
  description?: string;
  product?: any;
}

export default function QuoteForm({ quote, onClose }: { quote?: Quote; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const { customers } = useAppSelector((state) => state.customers);
  const { products } = useAppSelector((state) => state.products);
  const { currentQuote, loading } = useAppSelector((state) => state.quotes) as { currentQuote: Quote | null; loading: boolean };
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', email: '', phone: '', address: '', state: '', gstNumber: '' });
  const [stateSearch, setStateSearch] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const [indianStates, setIndianStates] = useState<string[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    quoteDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    discount: '' as number | '',
    shippingCharge: '' as number | '',
    taxRate: 0,
    notes: '',
    termsAndConditions: '',
    termsOfDelivery: '',
    paymentTerms: '',
    reference: '',
  });

  const [items, setItems] = useState<QuoteItem[]>([]);
  const [newItem, setNewItem] = useState<QuoteItem>({
    productId: 0,
    quantity: '',
    unit: 'box',
    rate: '',
    taxRate: '',
    description: '',
  });
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<QuoteItem | null>(null);

  useEffect(() => {
    dispatch(fetchCustomers({ limit: 1000 }));
    dispatch(fetchProducts());
  }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        stateDropdownRef.current &&
        !stateDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ country: 'India' }),
        });
        const result = await response.json();
        if (!result.error && result.data && result.data.states) {
          const statesList = result.data.states.map((s: { name: string }) => s.name);
          setIndianStates(statesList);
        } else {
          throw new Error('Failed to fetch from API');
        }
      } catch (err) {
        console.error('Error fetching Indian states:', err);
      } finally {
        setLoadingStates(false);
      }
    };

    fetchStates();
  }, []);

  // Clear currentQuote when form opens for creating new quote
  useEffect(() => {
    if (!quote?.id) {
      dispatch(clearCurrentQuote());
      setFormData({
        customerId: '',
        quoteDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        discount: '',
        shippingCharge: '',
        taxRate: 0,
        notes: '',
        termsAndConditions: '',
        termsOfDelivery: '',
        paymentTerms: '',
        reference: '',
      });
      setItems([]);
      setNewItem({
        productId: 0,
        quantity: '',
        unit: 'box',
        rate: '',
        taxRate: '',
        description: '',
      });
    }
  }, [quote?.id, dispatch]);

  // Fetch quote data when editing
  useEffect(() => {
    if (quote?.id) {
      dispatch(fetchQuoteById(quote.id));
    }
  }, [quote?.id, dispatch]);

  // Populate form when currentQuote is loaded
  useEffect(() => {
    if (currentQuote && quote?.id) {
      setFormData({
        customerId: currentQuote.customerId?.toString() || '', // Convert to string for select
        quoteDate: currentQuote.quoteDate?.split('T')[0] || '',
        expiryDate: currentQuote.expiryDate?.split('T')[0] || '',
        discount: currentQuote.discount != null ? Number(currentQuote.discount) : '',
        shippingCharge: (currentQuote as any).shippingCharge != null ? Number((currentQuote as any).shippingCharge) : '',
        taxRate: Number(currentQuote.tax) || 0,
        notes: currentQuote.notes || '',
        termsAndConditions: currentQuote.termsAndConditions || '',
        termsOfDelivery: (currentQuote as any).termsOfDelivery || '',
        paymentTerms: (currentQuote as any).paymentTerms || '',
        reference: (currentQuote as any).reference || '',
      });
      const selectedCustomer = customers.find((c: any) => c.id === currentQuote.customerId || c.id === Number(currentQuote.customerId));
      if (selectedCustomer) setCustomerSearch((selectedCustomer as any).name);
      else if ((currentQuote as any).customer?.name) setCustomerSearch((currentQuote as any).customer.name);
      
      const mappedItems = (currentQuote.items || []).map((item: any) => ({
        id: item.id,
        productId: Number(item.productId),
        quantity: (item.quantity != null ? Number(item.quantity) : '') as number | '',
        unit: item.unit,
        rate: (item.rate != null ? Number(item.rate) : '') as number | '',
        taxRate: (item.taxRate != null ? Number(item.taxRate) : (item.product?.category?.gstRate != null ? Number(item.product?.category?.gstRate) : '')) as number | '',
        description: item.description ?? item.product?.description ?? '',
        product: item.product,
      }));
      setItems(mappedItems);
    }
  }, [currentQuote, quote?.id]);

  const handleAddItem = () => {
    if (newItem.productId && newItem.quantity !== '' && newItem.rate !== '') {
      const itemWithTempId = {
        ...newItem,
        tempId: Date.now(),
        // product is already set from ProductSearch onChange
      };
      
      setItems([...items, itemWithTempId]);
      setNewItem({ productId: 0, quantity: '', unit: 'box', rate: '', taxRate: '', description: '' });
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
  const totalTax = items.reduce((sum, item) => {
    const itemAmount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    return sum + (itemAmount * (Number(item.taxRate) || 0)) / 100;
  }, 0);
  const totalAmount = subtotal + totalTax;
  const shippingCharge = Number(formData.shippingCharge) || 0;
  const finalAmount = totalAmount - (Number(formData.discount) || 0) + shippingCharge;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      customerId: parseInt(formData.customerId),
      quoteDate: formData.quoteDate,
      expiryDate: formData.expiryDate,
      items: items.map(item => ({
        ...(item.id && { id: item.id }),
        productId: item.productId,
        quantity: Number(item.quantity) || 0,
        unit: item.unit,
        rate: Number(item.rate) || 0,
        taxRate: Number(item.taxRate) || 0,
        description: item.description,
      })),
      totalAmount: finalAmount,
      discount: Number(formData.discount) || 0,
      shippingCharge: Number(formData.shippingCharge) || 0,
      tax: totalTax,
      notes: formData.notes,
      termsAndConditions: formData.termsAndConditions,
      termsOfDelivery: formData.termsOfDelivery || null,
      paymentTerms: formData.paymentTerms || null,
      reference: formData.reference || null,
    };

    try {
      if (quote?.id) {
        await dispatch(updateQuote({ id: quote.id, data }));
        await dispatch(fetchQuoteById(quote.id));
      } else {
        await dispatch(createQuote(data));
      }
      
      dispatch(fetchQuotes({ page: 1, limit: 10 }));
      dispatch(clearCurrentQuote());
      onClose();
    } catch (error) {
      console.error('Error submitting quote:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await dispatch(createCustomer({
        name: newCustomerData.name,
        email: newCustomerData.email,
        phone: newCustomerData.phone,
        address: newCustomerData.address,
        state: newCustomerData.state,
        gstNumber: newCustomerData.gstNumber,
      })).unwrap();
      toast.success('Customer added successfully');
      await dispatch(fetchCustomers({ limit: 1000 }));
      setFormData({ ...formData, customerId: result.id.toString() });
      setCustomerSearch(result.name);
      setShowCustomerDropdown(false);
      setAddCustomerModalOpen(false);
      setNewCustomerData({ name: '', email: '', phone: '', address: '', state: '', gstNumber: '' });
      setStateSearch('');
      setShowStateDropdown(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add customer');
    }
  };

  if (quote?.id && loading) {
    return <div className="text-center py-4">Loading quote data...</div>;
  }

  const getProductName = (item: QuoteItem) => {
    if (item.product?.name) return item.product.name;
    return products.find((p: any) => p.id === item.productId)?.name || 'Unknown Product';
  };

  const getProductDescription = (item: QuoteItem) => {
    if (item.description !== undefined && item.description !== null) return item.description;
    if (item.product?.description) return item.product.description;
    return products.find((p: any) => p.id === item.productId)?.description || '';
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
      <h2 className="text-xl font-bold">{quote ? 'Edit Quote' : 'Create Quote'}</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-sm font-medium mb-1">Customer <span className="text-red-500">*</span></label>
          <input
            type="text"
            placeholder="Search customer..."
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              setFormData({ ...formData, customerId: '' });
              setShowCustomerDropdown(true);
            }}
            onFocus={() => setShowCustomerDropdown(true)}
            onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="off"
          />
          {/* hidden input for required validation */}
          <input type="text" required value={formData.customerId} onChange={() => {}} className="sr-only" tabIndex={-1} />
          {showCustomerDropdown && (
            <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
              {customers
                .filter((c: any) => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                .map((c: any) => (
                  <li
                    key={c.id}
                    onMouseDown={() => {
                      setFormData({ ...formData, customerId: c.id.toString() });
                      setCustomerSearch(c.name);
                      setShowCustomerDropdown(false);
                    }}
                    className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm"
                  >
                    {c.name}
                  </li>
                ))}
              {customers.filter((c: any) => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-400">No customers found</li>
              )}
              <li className="border-t border-gray-200 px-3 py-2 sticky bottom-0 bg-gray-50">
                <button
                  type="button"
                  onClick={() => {
                    setAddCustomerModalOpen(true);
                    setShowCustomerDropdown(false);
                  }}
                  className="w-full text-left text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add New Customer
                </button>
              </li>
            </ul>
          )}
        </div>

        <Input
          type="date"
          label="Quote Date"
          value={formData.quoteDate}
          onChange={(e) => setFormData({ ...formData, quoteDate: e.target.value })}
          required
        />

        <Input
          type="date"
          label="Expiry Date"
          value={formData.expiryDate}
          onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
          required
        />

        <Select
          label="Terms of Delivery"
          value={formData.termsOfDelivery}
          onChange={(e) => setFormData({ ...formData, termsOfDelivery: e.target.value })}
        >
          <option value="">Select Terms of Delivery</option>
          <option value="Ex-works">Ex-works</option>
          <option value="FOR">FOR</option>
        </Select>

        <Select
          label="Payment Terms"
          value={formData.paymentTerms}
          onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
        >
          <option value="">Select Payment Terms</option>
          <option value="100% advance">100% advance</option>
          <option value="50% advance/50% dispatch">50% advance, 50% dispatch</option>
          <option value="30%/70%">30% advance, 70% dispatch</option>
          <option value="20%/80%">20% advance, 80% dispatch</option>
          <option value="Due on Receipt">Due on Receipt</option>
        </Select>

        <Input
          label="Reference"
          value={formData.reference}
          onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
          placeholder="Enter reference"
        />
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3">Quote Items</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <ProductSearch
            value={newItem.productId?.toString()}
            onChange={(productId, product) => {
              const gstRate = product?.category?.gstRate || 0;
              setNewItem({ 
                ...newItem, 
                productId: parseInt(productId),
                taxRate: gstRate,
                description: product?.description || '',
                product: product // Store product object
              });
            }}
          />

          <Input
            type="number"
            label="Quantity"
            value={newItem.quantity}
            onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value === '' ? '' : Number(e.target.value) })}
            min="1"
          />

          <Select
            label="Unit"
            value={newItem.unit}
            onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
          >
            <option value="box">Box</option>
            <option value="pack">Pack</option>
            <option value="piece">Piece</option>
          </Select>

          <Input
            type="number"
            label="Rate"
            value={newItem.rate}
            onChange={(e) => setNewItem({ ...newItem, rate: e.target.value === '' ? '' : Number(e.target.value) })}
            step="0.01"
            min="0"
          />

          <Input
            type="number"
            label="Tax Rate (%)"
            value={newItem.taxRate}
            onChange={(e) => setNewItem({ ...newItem, taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
            step="0.01"
            min="0"
          />
        </div>

        <Input
          label="Description"
          value={newItem.description}
          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
          placeholder="Product description (auto-filled from product)"
        />

        <Button type="button" onClick={handleAddItem}>Add Item</Button>

        {items.length > 0 && (
          <table className="w-full text-sm border mt-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Product</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-left">UOM</th>
                <th className="p-2 text-right">Rate</th>
                <th className="p-2 text-right">Tax%</th>
                <th className="p-2 text-right">Tax Amt</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <React.Fragment key={item.id || item.tempId || idx}>
                  <tr className="border-t">
                    <td className="p-2">
                      <div className="font-medium">{getProductName(item)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{getProductDescription(item)}</div>
                    </td>
                    <td className="p-2 text-right">{item.quantity}</td>
                    <td className="p-2 text-left">{item.unit}</td>
                    <td className="p-2 text-right">₹{Number(item.rate || 0).toFixed(2)}</td>
                    <td className="p-2 text-right">{Number(item.taxRate || 0)}%</td>
                    <td className="p-2 text-right">₹{(((Number(item.quantity) || 0) * (Number(item.rate) || 0) * (Number(item.taxRate) || 0)) / 100).toFixed(2)}</td>
                    <td className="p-2 text-right">₹{((Number(item.quantity) || 0) * (Number(item.rate) || 0)).toFixed(2)}</td>
                    <td className="p-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (editingItem === idx) {
                              setEditingItem(null);
                              setEditingData(null);
                            } else {
                              setEditingItem(idx);
                              setEditingData({ ...item });
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingItem === idx && editingData && (
                    <tr className="bg-blue-50 border-t border-blue-200">
                      <td colSpan={8} className="p-3">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <ProductSearch
                            value={editingData.productId?.toString()}
                            onChange={(productId, product) => {
                              const gstRate = product?.category?.gstRate || 0;
                              setEditingData({
                                ...editingData,
                                productId: parseInt(productId),
                                taxRate: gstRate,
                                description: product?.description || '',
                                product,
                              });
                            }}
                          />
                          <Input
                            type="number"
                            label="Quantity"
                            value={editingData.quantity}
                            onChange={(e) => setEditingData({ ...editingData, quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                            min="1"
                          />
                          <Select
                            label="Unit"
                            value={editingData.unit}
                            onChange={(e) => setEditingData({ ...editingData, unit: e.target.value })}
                          >
                            <option value="box">Box</option>
                            <option value="pack">Pack</option>
                            <option value="piece">Piece</option>
                          </Select>
                          <Input
                            type="number"
                            label="Rate"
                            value={editingData.rate}
                            onChange={(e) => setEditingData({ ...editingData, rate: e.target.value === '' ? '' : Number(e.target.value) })}
                            step="0.01"
                            min="0"
                          />
                          <Input
                            type="number"
                            label="Tax Rate (%)"
                            value={editingData.taxRate}
                            onChange={(e) => setEditingData({ ...editingData, taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <Input
                          label="Description"
                          value={editingData.description || ''}
                          onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                          placeholder="Product description (auto-filled from product)"
                        />
                        <div className="flex gap-2 mt-3">
                          <Button
                            type="button"
                            onClick={() => {
                              const updatedItems = [...items];
                              updatedItems[idx] = editingData;
                              setItems(updatedItems);
                              setEditingItem(null);
                              setEditingData(null);
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => { setEditingItem(null); setEditingData(null); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            label="Discount"
            value={formData.discount}
            onChange={(e) => setFormData({ ...formData, discount: e.target.value === '' ? '' : Number(e.target.value) })}
            step="0.01"
            min="0"
          />
          <Input
            type="number"
            label="Shipping Charge"
            value={formData.shippingCharge}
            onChange={(e) => setFormData({ ...formData, shippingCharge: e.target.value === '' ? '' : Number(e.target.value) })}
            step="0.01"
            min="0"
            placeholder="0.00"
          />
        </div>

        <div className="bg-gray-100 p-3 rounded">
          <div className="flex justify-between mb-1">
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Total Tax:</span>
            <span>+₹{totalTax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Discount:</span>
            <span>-₹{Number(formData.discount || 0).toFixed(2)}</span>
          </div>
          {shippingCharge > 0 && (
            <div className="flex justify-between mb-1">
              <span>Shipping Charge:</span>
              <span>+₹{shippingCharge.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>₹{finalAmount.toFixed(2)}</span>
          </div>
        </div>

        <Input
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes"
        />

        <div>
          <label className="block text-sm font-medium mb-1">Terms & Conditions</label>
          <textarea
            value={formData.termsAndConditions}
            onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
            placeholder="Enter terms and conditions for this quote"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit">{quote ? 'Update' : 'Create'} Quote</Button>
      </div>

      {/* Add Customer Modal */}
      {addCustomerModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">Add New Customer</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Input
                label="Customer Name"
                placeholder="Enter customer name"
                value={newCustomerData.name}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                placeholder="Enter email address"
                value={newCustomerData.email}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
              />
              <Input
                label="Phone"
                placeholder="Enter phone number"
                value={newCustomerData.phone}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
              />
              <Input
                label="Address"
                placeholder="Enter address"
                value={newCustomerData.address}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
              />
              
              {/* Searchable State Dropdown */}
              <div className="relative space-y-1" ref={stateDropdownRef}>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  State (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search or select Indian state/UT"
                    className={cn(
                      'flex h-10 w-full rounded-md border border-gray-300 bg-white pl-3 pr-10 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200'
                    )}
                    value={stateSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStateSearch(val);
                      setNewCustomerData({ ...newCustomerData, state: val });
                      setShowStateDropdown(true);
                    }}
                    onFocus={() => setShowStateDropdown(true)}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {stateSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setStateSearch('');
                          setNewCustomerData({ ...newCustomerData, state: '' });
                          setShowStateDropdown(true);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowStateDropdown(!showStateDropdown)}
                      className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showStateDropdown && "transform rotate-180")} />
                    </button>
                  </div>
                </div>

                {/* Dropdown Suggestions */}
                {showStateDropdown && (
                  <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200 divide-y divide-gray-50 scrollbar-thin">
                    {loadingStates ? (
                      <div className="px-4 py-3 text-gray-500 text-xs flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></span>
                        <span>Fetching states dynamically...</span>
                      </div>
                    ) : indianStates.filter((state) =>
                      state.toLowerCase().includes(stateSearch.toLowerCase())
                    ).length > 0 ? (
                      indianStates.filter((state) =>
                        state.toLowerCase().includes(stateSearch.toLowerCase())
                      ).map((state) => (
                        <button
                          key={state}
                          type="button"
                          className={cn(
                            'w-full text-left px-4 py-2 hover:bg-primary-50 hover:text-primary-900 transition-colors flex items-center justify-between',
                            stateSearch.toLowerCase() === state.toLowerCase() && 'bg-primary-50 text-primary-900 font-medium'
                          )}
                          onClick={() => {
                            setStateSearch(state);
                            setNewCustomerData({ ...newCustomerData, state });
                            setShowStateDropdown(false);
                          }}
                        >
                          <span>{state}</span>
                          {stateSearch.toLowerCase() === state.toLowerCase() && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-600"></span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-xs italic">
                        No matching Indian states or Union Territories found. You can keep typing to enter a custom state.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Input
                label="GST Number"
                placeholder="Enter GST number"
                value={newCustomerData.gstNumber || ''}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, gstNumber: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setAddCustomerModalOpen(false);
                  setNewCustomerData({ name: '', email: '', phone: '', address: '', state: '', gstNumber: '' });
                  setStateSearch('');
                  setShowStateDropdown(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={handleAddCustomer}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Customer
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
