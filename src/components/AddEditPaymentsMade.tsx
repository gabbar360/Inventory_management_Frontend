import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createPaymentMade, updatePaymentMade } from '@/slices/paymentsMadeSlice';
import { PaymentMade, Vendor, InwardInvoice } from '@/types';
import { formatDate, formatCurrency, cn } from '@/utils';
import Button from '@/components/Button';

interface AddEditPaymentsMadeProps {
  payment?: PaymentMade;
  onSuccess: () => void;
  onCancel: () => void;
}

const AddEditPaymentsMade: React.FC<AddEditPaymentsMadeProps> = ({
  payment,
  onSuccess,
  onCancel,
}) => {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { vendors, loading: vendorsLoading } = useAppSelector((state) => state.vendors);

  const isEdit = !!payment;
  const isAdvanceParam = searchParams.get('transaction_type') === 'vendor_advance';

  // Form State
  const [paymentNumber, setPaymentNumber] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paidThrough, setPaidThrough] = useState('Bank Account');
  const [bankCharges, setBankCharges] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isAdvance, setIsAdvance] = useState(false);

  // Bills/Invoices allocation state
  const [invoices, setInvoices] = useState<any[]>([]);
  const [vendorAdvanceBalance, setVendorAdvanceBalance] = useState<number>(0);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-generate payment number on mount if in add mode
  useEffect(() => {
    if (isEdit && payment) {
      setPaymentNumber(payment.paymentNumber);
      setVendorId(String(payment.vendorId));
      setAmount(payment.amount);
      setDate(payment.date.substring(0, 10));
      setPaymentMode(payment.paymentMode);
      setReferenceNumber(payment.referenceNumber || '');
      setPaidThrough(payment.paidThrough);
      setBankCharges(payment.bankCharges || 0);
      setNotes(payment.notes || '');
      setIsAdvance(payment.transactionType === 'vendor_advance');
    } else {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const rand = Math.floor(1000 + Math.random() * 9000);
      setPaymentNumber(`PM-${year}${month}-${rand}`);
      setDate(new Date().toISOString().substring(0, 10));
      setIsAdvance(isAdvanceParam);
    }
  }, [payment, isEdit, isAdvanceParam]);

  // Fetch vendor bills and advance credits when vendor selection changes
  useEffect(() => {
    if (!vendorId) {
      setInvoices([]);
      return;
    }

    const loadVendorInvoices = async () => {
      setLoadingInvoices(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/v1/getall-inward`, {
          params: { vendorId, limit: 100 },
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data?.success) {
          const apiInvoices: InwardInvoice[] = res.data.data || [];

          // Map bills, computing original balance due
          const formattedInvoices = apiInvoices
            .map((inv) => {
              const prevApplied = isEdit && payment?.invoices
                ? payment.invoices.find((i) => i.invoiceId === Number(inv.id))?.amountApplied || 0
                : 0;

              // unpaid balance = invoice total cost - amountPaid + previous applied amount if editing
              const balanceDue = inv.totalCost - (inv.amountPaid || 0) + prevApplied;

              return {
                id: inv.id,
                invoiceNo: inv.invoiceNo,
                date: inv.date,
                totalCost: inv.totalCost,
                amountPaid: inv.amountPaid || 0,
                prevApplied,
                balanceDue,
                amountApplied: prevApplied,
              };
            })
            .filter((inv) => inv.balanceDue > 0.05); // only keep bills with outstanding balances

          setInvoices(formattedInvoices);
        }

        // Fetch vendor's total unused advance payments
        const paymentsRes = await axios.get(`/api/v1/getall-paymentsmade`, {
          params: { vendorId, limit: 1000 },
          headers: { Authorization: `Bearer ${token}` }
        });

        if (paymentsRes.data?.success) {
          const paymentsList = paymentsRes.data.data || [];
          const totalUnused = paymentsList.reduce((sum: number, p: any) => sum + (p.unusedAmount || 0), 0);
          setVendorAdvanceBalance(totalUnused);
        }
      } catch (err) {
        console.error('Failed to load vendor invoices', err);
        toast.error('Failed to load vendor invoices');
      } finally {
        setLoadingInvoices(false);
      }
    };

    loadVendorInvoices();
  }, [vendorId, isEdit, payment]);

  // Recalculate allocations if user changes total amount
  const totalApplied = invoices.reduce((sum, inv) => sum + (inv.amountApplied || 0), 0);
  const excessAmount = Math.max(0, amount - totalApplied);

  const handleInvoiceAmountChange = (index: number, val: number) => {
    const nextInvoices = [...invoices];
    const maxAllowed = nextInvoices[index].balanceDue;

    if (val > maxAllowed) {
      toast.error(`Cannot apply more than the balance due (${formatCurrency(maxAllowed)})`);
      nextInvoices[index].amountApplied = maxAllowed;
    } else {
      nextInvoices[index].amountApplied = Math.max(0, Math.round(val * 100) / 100);
    }
    setInvoices(nextInvoices);
  };

  const handleToggleInvoiceSelection = (index: number, checked: boolean) => {
    const nextInvoices = [...invoices];
    if (checked) {
      // Calculate remaining payment amount excluding this invoice's current allocation
      const totalAppliedExcludeCurrent = nextInvoices.reduce(
        (sum, item, idx) => sum + (idx === index ? 0 : (item.amountApplied || 0)),
        0
      );
      const remaining = Math.max(0, amount - totalAppliedExcludeCurrent);
      const toApply = Math.min(nextInvoices[index].balanceDue, remaining);
      nextInvoices[index].amountApplied = Math.round(toApply * 100) / 100;
    } else {
      nextInvoices[index].amountApplied = 0;
    }
    setInvoices(nextInvoices);
  };

  const handleHeaderCheckboxChange = (checked: boolean) => {
    if (checked) {
      if (amount <= 0) {
        toast.error('Please enter a payment amount first');
        return;
      }
      let remaining = amount;
      const nextInvoices = invoices.map((inv) => {
        const toApply = Math.min(inv.balanceDue, remaining);
        remaining -= toApply;
        return {
          ...inv,
          amountApplied: Math.round(toApply * 100) / 100,
        };
      });
      setInvoices(nextInvoices);
    } else {
      setInvoices(invoices.map((inv) => ({ ...inv, amountApplied: 0 })));
    }
  };

  const handleAutoAllocate = () => {
    if (amount <= 0) {
      toast.error('Please enter a payment amount first');
      return;
    }

    let remainingPayment = amount;
    // Sort bills oldest first
    const sortedInvoices = [...invoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const allocated = sortedInvoices.map((inv) => {
      const needed = inv.balanceDue;
      const toApply = Math.min(remainingPayment, needed);
      remainingPayment -= toApply;
      return {
        ...inv,
        amountApplied: Math.round(toApply * 100) / 100,
      };
    });

    setInvoices(allocated);
    toast.success('Allocated payment oldest-first.');
  };

  const handleClearAllocations = () => {
    setInvoices(invoices.map((inv) => ({ ...inv, amountApplied: 0 })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorId) {
      toast.error('Please select a vendor');
      return;
    }
    if (amount <= 0) {
      toast.error('Amount must be positive');
      return;
    }
    const totalAppliedAmount = invoices.reduce((sum, inv) => sum + (inv.amountApplied || 0), 0);
    if (!isAdvance && totalAppliedAmount > amount) {
      toast.error(`Total allocated amount (${formatCurrency(totalAppliedAmount)}) cannot exceed the payment amount (${formatCurrency(amount)})`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        paymentNumber,
        vendorId,
        amount,
        date: new Date(date).toISOString(),
        paymentMode,
        referenceNumber: referenceNumber || null,
        paidThrough,
        bankCharges: Number(bankCharges || 0),
        notes: notes || null,
        transactionType: (isAdvance ? 'vendor_advance' : 'bill_payment') as any,
        invoices: isAdvance
          ? []
          : invoices
              .filter((inv) => inv.amountApplied > 0)
              .map((inv) => ({
                invoiceId: Number(inv.id),
                amountApplied: inv.amountApplied,
              })),
      };

      if (isEdit && payment) {
        await dispatch(updatePaymentMade({ id: payment.id, data: payload })).unwrap();
        toast.success('Payment made updated successfully');
      } else {
        await dispatch(createPaymentMade(payload)).unwrap();
        toast.success('Payment made recorded successfully');
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to save payment record');
    } finally {
      setSubmitting(false);
    }
  };

  const isAllChecked = invoices.length > 0 && invoices.every((inv) => (inv.amountApplied || 0) > 0);
  const outstandingTotal = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header section in Zoho style */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/70 flex justify-between items-center rounded-t-lg">
        <h2 className="text-base font-bold text-gray-800">
          {isEdit ? `Edit Payment Made: ${paymentNumber}` : 'Record Payment Made'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Main Zoho form fields (two-column row design) */}
        <div className="space-y-4 max-w-4xl">
          {/* Vendor Selection */}
          <div className="grid grid-cols-12 gap-4 items-start">
            <label className="col-span-12 md:col-span-3 text-left md:text-right text-[13px] font-medium text-gray-600 md:pt-2">
              Vendor Name <span className="text-red-500">*</span>
            </label>
            <div className="col-span-12 md:col-span-9">
              <select
                disabled={isEdit || vendorsLoading}
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full max-w-[360px] px-3 py-1.5 text-[13px] border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white disabled:bg-gray-100"
                required
              >
                <option value="">-- Select Vendor --</option>
                {vendors.map((v: Vendor) => (
                  <option key={v.id} value={v.id}>
                    {v.code} - {v.name}
                  </option>
                ))}
              </select>

              {/* Dynamic Vendor Info Dashboard */}
              {vendorId && !vendorsLoading && (
                <div className="mt-2.5 max-w-[360px] grid grid-cols-2 gap-2 bg-teal-50/20 p-2.5 rounded border border-teal-100/70 text-[11px]">
                  <div>
                    <span className="text-gray-500 block font-medium">Unused Credits:</span>
                    <span className="font-bold text-amber-700 text-xs">
                      {formatCurrency(vendorAdvanceBalance)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-medium">Total Outstanding:</span>
                    <span className="font-bold text-red-655 text-xs">
                      {formatCurrency(outstandingTotal)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Amount Paid */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <label className="col-span-12 md:col-span-3 text-left md:text-right text-[13px] font-medium text-gray-600">
              Amount Paid <span className="text-red-500">*</span>
            </label>
            <div className="col-span-12 md:col-span-9">
              <div className="flex max-w-[360px]">
                <span className="inline-flex items-center px-3 py-1.5 rounded-l border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-[13px] font-semibold">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount || ''}
                  onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full border border-gray-300 rounded-r px-3 py-1.5 text-[13px] font-bold text-gray-800 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          </div>

          {/* Bank Charges */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <label className="col-span-12 md:col-span-3 text-left md:text-right text-[13px] font-medium text-gray-600">
              Bank Charges (if any)
            </label>
            <div className="col-span-12 md:col-span-9">
              <div className="flex max-w-[360px]">
                <span className="inline-flex items-center px-3 py-1.5 rounded-l border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-[13px]">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={bankCharges || ''}
                  onChange={(e) => setBankCharges(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full border border-gray-300 rounded-r px-3 py-1.5 text-[13px] text-gray-800 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Payment Date */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <label className="col-span-12 md:col-span-3 text-left md:text-right text-[13px] font-medium text-gray-600">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <div className="col-span-12 md:col-span-9">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full max-w-[360px] px-3 py-1.5 text-[13px] border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white"
                required
              />
            </div>
          </div>

          {/* Payment Number */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <label className="col-span-12 md:col-span-3 text-left md:text-right text-[13px] font-medium text-gray-600">
              Payment Number <span className="text-red-500">*</span>
            </label>
            <div className="col-span-12 md:col-span-9">
              <input
                type="text"
                value={paymentNumber}
                onChange={(e) => setPaymentNumber(e.target.value)}
                className="w-full max-w-[360px] px-3 py-1.5 text-[13px] border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none uppercase font-semibold text-gray-800 bg-white"
                required
              />
            </div>
          </div>

          {/* Payment Mode */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <label className="col-span-12 md:col-span-3 text-left md:text-right text-[13px] font-medium text-gray-600">
              Payment Mode
            </label>
            <div className="col-span-12 md:col-span-9">
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full max-w-[360px] px-3 py-1.5 text-[13px] border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Check">Check</option>
                <option value="Credit Card">Credit Card</option>
              </select>
            </div>
          </div>

          {/* Paid Through */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <label className="col-span-12 md:col-span-3 text-left md:text-right text-[13px] font-medium text-gray-600">
              Paid Through
            </label>
            <div className="col-span-12 md:col-span-9">
              <select
                value={paidThrough}
                onChange={(e) => setPaidThrough(e.target.value)}
                className="w-full max-w-[360px] px-3 py-1.5 text-[13px] border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white"
              >
                <option value="Bank Account">Bank Account</option>
                <option value="Petty Cash">Petty Cash</option>
              </select>
            </div>
          </div>

          {/* Reference Number */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <label className="col-span-12 md:col-span-3 text-left md:text-right text-[13px] font-medium text-gray-600">
              Reference Number
            </label>
            <div className="col-span-12 md:col-span-9">
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full max-w-[360px] px-3 py-1.5 text-[13px] border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white"
                placeholder="Cheque #, transaction reference ID, etc."
              />
            </div>
          </div>

          {/* Payment Nature selector - Zoho style checkbox */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <label className="col-span-12 md:col-span-3 text-left md:text-right text-[13px] font-medium text-gray-600">
              Payment Nature
            </label>
            <div className="col-span-12 md:col-span-9 flex items-center">
              <input
                type="checkbox"
                id="advanceCheckbox"
                checked={isAdvance}
                onChange={(e) => {
                  setIsAdvance(e.target.checked);
                  if (e.target.checked) {
                    handleClearAllocations();
                  }
                }}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="advanceCheckbox" className="ml-2 text-xs font-semibold text-gray-650 cursor-pointer">
                Record this payment as a Vendor Advance (skip bill allocation)
              </label>
            </div>
          </div>
        </div>

        {/* Info Box if Advance checked */}
        {isAdvance && (
          <div className="p-4 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-[13px] max-w-3xl">
            <span className="font-bold">Vendor Advance Payment:</span> The entire amount of <span className="font-bold text-amber-900">{formatCurrency(amount)}</span> will be saved as credits under this vendor's account and can be applied to future bills.
          </div>
        )}

        {/* Invoice/Bill Allocation Table */}
        {!isAdvance && vendorId && (
          <div className="space-y-3 border-t border-gray-150 pt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-gray-800">Outstanding Bills</h3>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleAutoAllocate} className="text-xs py-1 h-7 font-semibold">
                  Auto-Allocate Oldest First
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleClearAllocations} className="text-xs py-1 text-red-655 hover:text-red-750 h-7 font-semibold">
                  Clear Allocations
                </Button>
              </div>
            </div>

            {loadingInvoices ? (
              <div className="text-center text-xs text-gray-500 py-4">Loading bills...</div>
            ) : invoices.length > 0 ? (
              <div className="overflow-x-auto rounded border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-[13px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-center" style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={isAllChecked}
                          onChange={(e) => handleHeaderCheckboxChange(e.target.checked)}
                          className="h-3.5 w-3.5 text-teal-600 focus:ring-teal-500 border-gray-300 rounded cursor-pointer"
                          title="Allocate/Clear all bills"
                        />
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-500">Bill No</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-500">Bill Date</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-500">Total Cost</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-500">Balance Due</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-500" style={{ width: '180px' }}>Amount Applied</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {invoices.map((inv, index) => {
                      const isChecked = (inv.amountApplied || 0) > 0;
                      return (
                        <tr key={inv.id} className={cn(isChecked ? "bg-teal-50/10" : "hover:bg-gray-50/50")}>
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleToggleInvoiceSelection(index, e.target.checked)}
                              className="h-3.5 w-3.5 text-teal-600 focus:ring-teal-550 border-gray-300 rounded cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-gray-900 font-semibold">{inv.invoiceNo}</td>
                          <td className="px-4 py-2.5 text-gray-600">{formatDate(inv.date)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-800">{formatCurrency(inv.totalCost)}</td>
                          <td
                            className="px-4 py-2.5 text-right text-red-655 font-bold cursor-pointer hover:underline"
                            onClick={() => {
                              const remainingToApply = Math.max(0, amount - totalApplied + (inv.amountApplied || 0));
                              const toApply = Math.min(inv.balanceDue, remainingToApply > 0 ? remainingToApply : inv.balanceDue);
                              handleInvoiceAmountChange(index, toApply);
                            }}
                            title="Click to apply remaining payment or full balance"
                          >
                            {formatCurrency(inv.balanceDue)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="relative inline-block w-full">
                              <span className="absolute left-2.5 text-gray-400 font-semibold text-xs">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={inv.balanceDue}
                                value={inv.amountApplied || ''}
                                onChange={(e) => handleInvoiceAmountChange(index, parseFloat(e.target.value) || 0)}
                                className="w-full pl-6 pr-2 py-1 text-right border border-gray-300 rounded outline-none focus:ring-1 focus:ring-teal-500 font-semibold text-teal-600 bg-white"
                                placeholder="0.00"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-xs text-teal-600 py-4 font-semibold bg-teal-50/20 border border-dashed rounded">
                This vendor has no unpaid bills. Full payment amount will be recorded as advance.
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="border-t border-gray-150 pt-5">
          <label className="block text-[13px] font-bold text-gray-750 mb-1">
            Notes (Internal info)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full max-w-xl px-3 py-2 text-[13px] border border-gray-300 rounded focus:ring-1 focus:ring-teal-555 focus:border-teal-555 outline-none bg-white"
            rows={3}
            placeholder="e.g. Payment made for vendor invoice and advance balance."
          />
        </div>

        {/* Calculation Summary Footer (Zoho style right-aligned summary block) */}
        <div className="border-t border-gray-150 pt-5 flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex flex-col gap-1 items-start text-gray-500 md:pt-4 max-w-md">
            {!isAdvance && (
              <>
                {totalApplied === amount ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                    ✓ Fully Allocated to Bills
                  </span>
                ) : totalApplied < amount ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    ℹ Partial Allocation (Excess saved as Vendor Advance)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                    ⚠️ Allocation exceeds Payment Amount by {formatCurrency(totalApplied - amount)}
                  </span>
                )}
              </>
            )}
          </div>

          <div className="w-full md:w-80 bg-gray-50/70 p-4 rounded border border-gray-200 text-xs sm:text-[13px] space-y-2 ml-auto">
            {totalApplied > amount && (
              <div className="p-2.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded font-semibold mb-2">
                ⚠️ Warning: Total applied amount exceeds Amount Paid.
              </div>
            )}
            <div className="flex justify-between text-gray-655">
              <span>Amount Paid:</span>
              <span className="font-bold text-gray-900">{formatCurrency(amount)}</span>
            </div>
            <div className="flex justify-between text-teal-600 font-semibold border-b border-gray-200 pb-2">
              <span>Amount Allocated:</span>
              <span>-{formatCurrency(totalApplied)}</span>
            </div>
            <div className="flex justify-between text-gray-900 font-bold pt-1">
              <span>Amount to Credit (Advance):</span>
              <span className="text-amber-600">{formatCurrency(excessAmount)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons (Left Aligned matching Zoho) */}
        <div className="flex justify-start gap-3 pt-6 border-t border-gray-150">
          <Button
            type="submit"
            disabled={submitting || (!isAdvance && totalApplied > amount)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 font-bold py-2 text-xs rounded transition-all duration-150 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Payment'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2 text-xs rounded transition-all duration-150"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddEditPaymentsMade;
