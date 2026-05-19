import React, { useState, useEffect } from 'react';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { formatDate } from '@/utils';

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
}

interface PriceEntry { rate: string; taxRate: string; }

export default function WebsiteQuoteForm({ quote, onClose, onSaved }: { quote: WebsiteQuote; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    companyName: quote.companyName,
    contactPerson: quote.contactPerson || '',
    email: quote.email || '',
    mobile: quote.mobile || '',
    orderType: quote.orderType,
    gstin: quote.gstin || '',
    city: quote.city || '',
    state: quote.state || '',
    pincode: quote.pincode || '',
    billingAddress: quote.billingAddress || '',
    country: quote.country || '',
    deliveryTerms: quote.deliveryTerms || '',
    portOfDischarge: quote.portOfDischarge || '',
    address: quote.address || '',
    additionalRequirements: quote.additionalRequirements || '',
    discount: String(quote.discount ?? ''),
    shippingCharge: String(quote.shippingCharge ?? ''),
    notes: quote.notes || '',
    termsAndConditions: quote.termsAndConditions || '',
    termsOfDelivery: quote.termsOfDelivery || '',
    paymentTerms: quote.paymentTerms || '',
  });

  const [prices, setPrices] = useState<Record<number, PriceEntry>>({});
  const [saving, setSaving] = useState(false);

  const products: WebsiteQuoteProduct[] = (() => { try { return JSON.parse(quote.products); } catch { return []; } })();

  useEffect(() => {
    let saved: Record<string, PriceEntry> = {};
    try { saved = JSON.parse(quote.prices || '{}'); } catch {}
    const init: Record<number, PriceEntry> = {};
    products.forEach((_, i) => {
      init[i] = { rate: String(saved[i]?.rate || ''), taxRate: String(saved[i]?.taxRate || '0') };
    });
    setPrices(init);
  }, []);

  const getQty = (p: WebsiteQuoteProduct) => p.totalPieces || p.quantity || 1;
  const subtotal = products.reduce((sum, p, i) => sum + (parseFloat(prices[i]?.rate || '0') || 0) * getQty(p), 0);
  const totalTax = products.reduce((sum, p, i) => {
    const amt = (parseFloat(prices[i]?.rate || '0') || 0) * getQty(p);
    return sum + (amt * (parseFloat(prices[i]?.taxRate || '0') || 0)) / 100;
  }, 0);
  const discount = parseFloat(form.discount) || 0;
  const shipping = parseFloat(form.shippingCharge) || 0;
  const finalAmount = subtotal + totalTax - discount + shipping;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const pricesPayload = Object.fromEntries(
        Object.entries(prices).map(([k, v]) => [k, { rate: parseFloat(v.rate) || 0, taxRate: parseFloat(v.taxRate) || 0 }])
      );
      await api.put(`/website-quotes/${quote.id}`, {
        ...form,
        discount: parseFloat(form.discount) || 0,
        shippingCharge: parseFloat(form.shippingCharge) || 0,
        prices: pricesPayload,
      });
      toast.success('Quote updated successfully');
      onSaved();
      onClose();
    } catch {
      toast.error('Failed to update quote');
    } finally {
      setSaving(false);
    }
  };

  const f = (field: keyof typeof form) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value })),
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{quote.quoteNo}</h2>
          <p className="text-sm text-gray-500">{formatDate(quote.quoteDate)}</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Company *" required {...f('companyName')} />
        <Input label="Contact Person" {...f('contactPerson')} />
        <Input label="Email" type="email" {...f('email')} />
        <Input label="Mobile" {...f('mobile')} />
        <div>
          <label className="block text-sm font-medium mb-1">Order Type</label>
          <select
            value={form.orderType}
            onChange={(e) => setForm(prev => ({ ...prev, orderType: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="domestic">Domestic</option>
            <option value="international">International</option>
          </select>
        </div>
      </div>

      {form.orderType === 'domestic' ? (
        <div className="grid grid-cols-2 gap-4">
          <Input label="GSTIN" {...f('gstin')} />
          <Input label="City" {...f('city')} />
          <Input label="State" {...f('state')} />
          <Input label="Pincode" {...f('pincode')} />
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Billing Address</label>
            <textarea rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" {...f('billingAddress')} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Input label="Country" {...f('country')} />
          <Input label="Delivery Terms" {...f('deliveryTerms')} />
          <Input label="Port of Discharge" {...f('portOfDischarge')} />
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" {...f('address')} />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Additional Requirements</label>
        <textarea rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" {...f('additionalRequirements')} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[['Total Pieces', quote.totalPieces.toLocaleString()], ['Total Weight', quote.totalWeight || '-'], ['Total CBM', quote.totalCBM || '-']].map(([label, val]) => (
          <div key={label} className="p-3 bg-green-50 rounded border text-center">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="font-bold text-green-700">{val}</div>
          </div>
        ))}
      </div>

      {/* Products & Pricing */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Products & Pricing ({products.length})</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Apply GST% to all:</span>
            <input
              type="number" min="0" max="100" step="0.5" placeholder="e.g. 5"
              className="w-20 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              onChange={(e) => {
                const val = e.target.value;
                setPrices(prev => {
                  const updated = { ...prev };
                  products.forEach((_, i) => { updated[i] = { ...updated[i], taxRate: val }; });
                  return updated;
                });
              }}
            />
          </div>
        </div>
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">HSN</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate (₹)</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">CGST%</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">CGST Amt</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">SGST%</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">SGST Amt</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p, i) => {
                const rate = parseFloat(prices[i]?.rate || '0') || 0;
                const taxRate = parseFloat(prices[i]?.taxRate || '0') || 0;
                const qty = p.totalPieces || p.quantity || 1;
                const lineAmt = rate * qty;
                const cgstRate = taxRate / 2;
                const cgstAmt = lineAmt * cgstRate / 100;
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-2 py-2">
                      <div className="font-medium">{p.productName}</div>
                      <div className="text-xs text-gray-400 font-mono">{p.itemCode}</div>
                    </td>
                    <td className="px-2 py-2 text-gray-500 text-xs">{p.hsnCode || '-'}</td>
                    <td className="px-2 py-2 capitalize">{p.unit}</td>
                    <td className="px-2 py-2 text-right">{qty.toLocaleString('en-IN')}</td>
                    {/* qty = totalPieces */}
                    <td className="px-2 py-2">
                      <input
                        type="number" min="0" step="0.01" placeholder="0.00"
                        value={prices[i]?.rate || ''}
                        onChange={(e) => setPrices(prev => ({ ...prev, [i]: { ...prev[i], rate: e.target.value } }))}
                        className="w-24 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <div className="text-xs text-gray-600">{cgstRate > 0 ? `${cgstRate}%` : '-'}</div>
                      <input
                        type="number" min="0" max="100" step="0.5"
                        value={prices[i]?.taxRate || '0'}
                        onChange={(e) => setPrices(prev => ({ ...prev, [i]: { ...prev[i], taxRate: e.target.value } }))}
                        className="w-14 border rounded px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary-500 mt-1"
                        title="Total GST %"
                      />
                      <div className="text-xs text-gray-400">total%</div>
                    </td>
                    <td className="px-2 py-2 text-right">{rate > 0 ? cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                    <td className="px-2 py-2 text-center text-xs text-gray-600">{cgstRate > 0 ? `${cgstRate}%` : '-'}</td>
                    <td className="px-2 py-2 text-right">{rate > 0 ? cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                    <td className="px-2 py-2 text-right font-medium">
                      {rate > 0 ? lineAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : <span className="text-gray-400">-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="border-t pt-4 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Discount" type="number" step="0.01" min="0" {...f('discount')} />
          <Input label="Shipping Charge" type="number" step="0.01" min="0" placeholder="0.00" {...f('shippingCharge')} />
        </div>
        <div className="bg-gray-100 p-3 rounded text-sm">
          <div className="flex justify-between mb-1"><span>Total Amount before Tax:</span><span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          {(() => {
            const taxLines: Record<string, { rate: number; amt: number }> = {};
            products.forEach((p, i) => {
              const rate = parseFloat(prices[i]?.rate || '0') || 0;
              const taxRate = parseFloat(prices[i]?.taxRate || '0') || 0;
              if (!rate || !taxRate) return;
              const lineAmt = rate * (p.totalPieces || p.quantity || 1);
              const taxAmt = lineAmt * taxRate / 100;
              const key = String(taxRate);
              if (!taxLines[key]) taxLines[key] = { rate: taxRate, amt: 0 };
              taxLines[key].amt += taxAmt;
            });
            return Object.values(taxLines).map(t => (
              <React.Fragment key={t.rate}>
                <div className="flex justify-between mb-1"><span>CGST ({t.rate / 2}%):</span><span>₹{(t.amt / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between mb-1"><span>SGST ({t.rate / 2}%):</span><span>₹{(t.amt / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              </React.Fragment>
            ));
          })()}
          {discount > 0 && <div className="flex justify-between mb-1"><span>Discount:</span><span>-₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
          {shipping > 0 && <div className="flex justify-between mb-1"><span>Shipping Charge:</span><span>+₹{shipping.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
          <div className="flex justify-between font-bold text-base border-t pt-2"><span>Grand Total Rs.</span><span>₹{finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
        </div>
      </div>

      {/* Terms */}
      <div className="grid grid-cols-2 gap-4">
        <Select label="Terms of Delivery" {...f('termsOfDelivery')}>
          <option value="">Select</option>
          <option value="Ex-works">Ex-works</option>
          <option value="FOR">FOR</option>
        </Select>
        <Select label="Payment Terms" {...f('paymentTerms')}>
          <option value="">Select</option>
          <option value="100% advance">100% advance</option>
          <option value="50% advance/50% dispatch">50% advance, 50% dispatch</option>
          <option value="30%/70%">30% advance, 70% dispatch</option>
          <option value="20%/80%">20% advance, 80% dispatch</option>
          <option value="Due on Receipt">Due on Receipt</option>
        </Select>
      </div>

      <Input label="Notes" {...f('notes')} placeholder="Additional notes" />

      <div>
        <label className="block text-sm font-medium mb-1">Terms & Conditions</label>
        <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" {...f('termsAndConditions')} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Update Quote'}</Button>
      </div>
    </form>
  );
}
