import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createQuote, updateQuote, fetchQuotes, fetchQuoteById, clearCurrentQuote } from '@/slices/quoteSlice';
import { fetchCustomers } from '@/slices/customerSlice';
import { fetchProducts } from '@/slices/productSlice';
import { Quote } from '@/types';
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
  
  const [formData, setFormData] = useState({
    customerId: '',
    quoteDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    discount: '' as number | '',
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
    dispatch(fetchCustomers());
    dispatch(fetchProducts());
  }, [dispatch]);

  // Clear currentQuote when form opens for creating new quote
  useEffect(() => {
    if (!quote?.id) {
      dispatch(clearCurrentQuote());
      setFormData({
        customerId: '',
        quoteDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        discount: '',
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
        taxRate: Number(currentQuote.tax) || 0,
        notes: currentQuote.notes || '',
        termsAndConditions: currentQuote.termsAndConditions || '',
        termsOfDelivery: (currentQuote as any).termsOfDelivery || '',
        paymentTerms: (currentQuote as any).paymentTerms || '',
        reference: (currentQuote as any).reference || '',
      });
      
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
  const finalAmount = totalAmount - (Number(formData.discount) || 0);

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
        <Select
          label="Customer"
          value={formData.customerId}
          onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
          required
        >
          <option value="">Select Customer</option>
          {customers.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

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
        <Input
          type="number"
          label="Discount"
          value={formData.discount}
          onChange={(e) => setFormData({ ...formData, discount: e.target.value === '' ? '' : Number(e.target.value) })}
          step="0.01"
          min="0"
        />

        <div className="bg-gray-100 p-3 rounded">
          <div className="flex justify-between mb-1">
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Total Tax:</span>
            <span>+₹{totalTax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Discount:</span>
            <span>-₹{Number(formData.discount || 0).toFixed(2)}</span>
          </div>
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


    </form>
  );
}
