import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createQuote, updateQuote, fetchQuotes, fetchQuoteById, clearCurrentQuote } from '@/slices/quoteSlice';
import { fetchCustomers } from '@/slices/customerSlice';
import { fetchProducts } from '@/slices/productSlice';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Button from '@/components/Button';

interface QuoteItem {
  id?: number;
  productId: number;
  quantity: number;
  unit: string;
  rate: number;
  description?: string;
  product?: any;
}

export default function QuoteForm({ quote, onClose }: { quote?: any; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const { customers } = useAppSelector((state) => state.customers);
  const { products } = useAppSelector((state) => state.products);
  const { currentQuote, loading } = useAppSelector((state) => state.quotes);
  
  const [formData, setFormData] = useState({
    customerId: '',
    quoteDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    discount: 0,
    taxRate: 0,
    notes: '',
    termsAndConditions: '',
  });

  const [items, setItems] = useState<QuoteItem[]>([]);
  const [newItem, setNewItem] = useState<QuoteItem>({
    productId: 0,
    quantity: 1,
    unit: 'box',
    rate: 0,
    description: '',
  });
  const [editingItem, setEditingItem] = useState<number | null>(null);

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
        discount: 0,
        taxRate: 0,
        notes: '',
        termsAndConditions: '',
      });
      setItems([]);
      setNewItem({
        productId: 0,
        quantity: 1,
        unit: 'box',
        rate: 0,
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
        customerId: currentQuote.customerId || '',
        quoteDate: currentQuote.quoteDate?.split('T')[0] || '',
        expiryDate: currentQuote.expiryDate?.split('T')[0] || '',
        discount: currentQuote.discount || 0,
        taxRate: currentQuote.tax || 0,
        notes: currentQuote.notes || '',
        termsAndConditions: currentQuote.termsAndConditions || '',
      });
      
      const mappedItems = (currentQuote.items || []).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        description: item.product?.description || item.description || '',
        product: item.product,
      }));
      setItems(mappedItems);
    }
  }, [currentQuote, quote?.id]);

  const handleAddItem = () => {
    if (newItem.productId && newItem.quantity && newItem.rate) {
      const selectedProduct = products.find((p: any) => p.id === newItem.productId);
      const gstRate = selectedProduct?.category?.gstRate || 0;
      
      if (formData.taxRate === 0 && gstRate > 0) {
        setFormData(prev => ({ ...prev, taxRate: gstRate }));
      }
      
      setItems([...items, newItem]);
      setNewItem({ productId: 0, quantity: 1, unit: 'box', rate: 0, description: '' });
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const taxAmount = (totalAmount * formData.taxRate) / 100;
  const finalAmount = totalAmount - formData.discount + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      customerId: parseInt(formData.customerId),
      quoteDate: formData.quoteDate,
      expiryDate: formData.expiryDate,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        description: item.description,
      })),
      totalAmount,
      discount: formData.discount,
      tax: formData.taxRate,
      notes: formData.notes,
      termsAndConditions: formData.termsAndConditions,
    };

    if (quote?.id) {
      await dispatch(updateQuote({ id: quote.id, data }));
    } else {
      await dispatch(createQuote(data));
    }
    
    dispatch(fetchQuotes());
    dispatch(clearCurrentQuote());
    onClose();
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
    if (item.description) return item.description;
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
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3">Quote Items</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Select
            label="Product"
            value={newItem.productId}
            onChange={(e) => {
              const productId = parseInt(e.target.value);
              const selectedProduct = products.find((p: any) => p.id === productId);
              setNewItem({ 
                ...newItem, 
                productId,
                description: selectedProduct?.description || ''
              });
            }}
          >
            <option value="">Select Product</option>
            {products.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>

          <Input
            type="number"
            label="Quantity"
            value={newItem.quantity}
            onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })}
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
            onChange={(e) => setNewItem({ ...newItem, rate: parseFloat(e.target.value) })}
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
                <th className="p-2 text-right">Rate</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">
                    <div className="font-medium">{getProductName(item)}</div>
                    <div className="text-xs text-gray-600 mt-1">{getProductDescription(item)}</div>
                  </td>
                  <td className="p-2 text-right">{item.quantity} {item.unit}</td>
                  <td className="p-2 text-right">₹{item.rate.toFixed(2)}</td>
                  <td className="p-2 text-right">₹{(item.quantity * item.rate).toFixed(2)}</td>
                  <td className="p-2 text-center">
                    <div className="flex gap-1 justify-center">
                      <button 
                        type="button" 
                        onClick={() => setEditingItem(idx)} 
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
            onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) })}
            step="0.01"
            min="0"
          />

          <Input
            type="number"
            label="Tax Rate (%)"
            value={formData.taxRate}
            onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) })}
            step="0.01"
            min="0"
            placeholder="GST rate from product category"
          />
        </div>

        <div className="bg-gray-100 p-3 rounded">
          <div className="flex justify-between mb-1">
            <span>Subtotal:</span>
            <span>₹{totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Discount:</span>
            <span>-₹{formData.discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Tax ({formData.taxRate}%):</span>
            <span>+₹{taxAmount.toFixed(2)}</span>
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

      {editingItem !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-bold mb-4">Edit Item</h3>
            <div className="space-y-4">
              <Input
                type="number"
                label="Quantity"
                value={items[editingItem].quantity}
                onChange={(e) => {
                  const updatedItems = [...items];
                  updatedItems[editingItem].quantity = parseInt(e.target.value);
                  setItems(updatedItems);
                }}
                min="1"
              />
              <Input
                type="number"
                label="Rate"
                value={items[editingItem].rate}
                onChange={(e) => {
                  const updatedItems = [...items];
                  updatedItems[editingItem].rate = parseFloat(e.target.value);
                  setItems(updatedItems);
                }}
                step="0.01"
                min="0"
              />
              <Input
                label="Description"
                value={items[editingItem].description || ''}
                onChange={(e) => {
                  const updatedItems = [...items];
                  updatedItems[editingItem].description = e.target.value;
                  setItems(updatedItems);
                }}
                placeholder="Product description"
              />
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>Cancel</Button>
              <Button type="button" onClick={() => setEditingItem(null)}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
