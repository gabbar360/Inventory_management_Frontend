import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Download, Loader2 } from 'lucide-react';
import { PaymentReceived, OutwardInvoice } from '@/types';
import { formatDate, formatCurrency } from '@/utils';
import Modal from '@/components/Modal';
import Button from '@/components/Button';

interface Props {
  payment: PaymentReceived;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ApplyCreditsReceivedModal: React.FC<Props> = ({ payment, isOpen, onClose, onSuccess }) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdPaymentId, setCreatedPaymentId] = useState<number | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const availableCredit = payment.unusedAmount;

  useEffect(() => {
    if (!isOpen) return;
    setAllocations({});
    setCreatedPaymentId(null);

    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/v1/getall-outward', {
          params: { customerId: payment.customerId, limit: 100 },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.success) {
          const bills: OutwardInvoice[] = res.data.data || [];
          const outstanding = bills
            .map((inv) => ({
              id: inv.id,
              invoiceNo: inv.invoiceNo,
              date: inv.date,
              totalCost: inv.totalCost,
              balanceDue: inv.totalCost - (inv.amountReceived || 0),
            }))
            .filter((inv) => inv.balanceDue > 0.05);
          setInvoices(outstanding);
        }
      } catch {
        toast.error('Failed to load outstanding invoices');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, payment.customerId]);

  const totalAllocated = Object.values(allocations).reduce((s, v) => s + v, 0);
  const remaining = availableCredit - totalAllocated;

  const handleChange = (invoiceId: string, val: number) => {
    const inv = invoices.find((i) => String(i.id) === invoiceId);
    if (!inv) return;
    const currentThis = allocations[invoiceId] || 0;
    const maxFromCredit = availableCredit - (totalAllocated - currentThis);
    const maxAllowed = Math.min(inv.balanceDue, maxFromCredit);
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: Math.max(0, Math.min(Math.round(val * 100) / 100, maxAllowed)),
    }));
  };

  const handleSubmit = async () => {
    const allocs = Object.entries(allocations)
      .filter(([, amt]) => amt > 0)
      .map(([invoiceId, amountToApply]) => ({
        paymentReceivedId: payment.id,
        invoiceId,
        amountToApply,
      }));

    if (allocs.length === 0) {
      toast.error('Please enter at least one allocation amount');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/api/v1/paymentsreceived/apply-credits',
        { customerId: payment.customerId, allocations: allocs, date: new Date().toISOString() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newRecord = res.data?.data;
      toast.success(`Credits applied! Record ${newRecord?.paymentNumber} created.`);
      setCreatedPaymentId(newRecord?.id || null);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to apply credits');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!createdPaymentId) return;
    setDownloadingPdf(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/paymentsreceived/${createdPaymentId}/pdf`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
      });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CreditApplied-${createdPaymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error('PDF download failed');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Apply Credits — ${payment.paymentNumber}`} size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
          <div>
            <span className="text-amber-700 font-medium">Available Credit:</span>
            <span className="ml-2 font-bold text-amber-800 text-base">{formatCurrency(availableCredit)}</span>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Remaining after allocation:</span>
            <span className={`ml-2 font-bold text-sm ${remaining < 0 ? 'text-red-600' : 'text-gray-800'}`}>
              {formatCurrency(Math.max(0, remaining))}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded border border-dashed">
            No outstanding invoices found for this customer.
          </div>
        ) : (
          <div className="overflow-x-auto rounded border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-[13px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Invoice No</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Date</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-500">Balance Due</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-500" style={{ width: 160 }}>
                    Amount to Apply
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {invoices.map((inv) => {
                  const val = allocations[String(inv.id)] || 0;
                  return (
                    <tr key={inv.id} className={val > 0 ? 'bg-emerald-50/20' : ''}>
                      <td className="px-4 py-2.5 font-semibold text-gray-800">{inv.invoiceNo}</td>
                      <td className="px-4 py-2.5 text-gray-500">{formatDate(inv.date)}</td>
                      <td
                        className="px-4 py-2.5 text-right font-bold text-red-600 cursor-pointer hover:underline"
                        title="Click to fill full balance"
                        onClick={() => handleChange(String(inv.id), inv.balanceDue)}
                      >
                        {formatCurrency(inv.balanceDue)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="relative inline-block w-full">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={inv.balanceDue}
                            value={val || ''}
                            onChange={(e) => handleChange(String(inv.id), parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 py-1 text-right border border-gray-300 rounded outline-none focus:ring-1 focus:ring-primary-500 font-semibold text-primary-700 bg-white text-[13px]"
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {totalAllocated > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-2 text-right font-bold text-gray-700 text-[13px]">
                      Total Applying:
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-emerald-700 text-[13px]">
                      {formatCurrency(totalAllocated)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {totalAllocated > availableCredit && (
          <div className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded px-3 py-2">
            ⚠️ Total allocation exceeds available credit.
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t gap-3">
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || totalAllocated === 0 || totalAllocated > availableCredit || !!createdPaymentId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-bold rounded disabled:opacity-50"
            >
              {submitting ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 inline" />Applying...</>
              ) : (
                `Apply ${totalAllocated > 0 ? formatCurrency(totalAllocated) : ''} Credits`
              )}
            </Button>

            {createdPaymentId && (
              <Button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-xs font-bold rounded"
              >
                {downloadingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1 inline" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1 inline" />
                )}
                Download Credit PDF
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="px-4 py-2 text-xs border-gray-300 text-gray-600"
          >
            {createdPaymentId ? 'Close' : 'Cancel'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ApplyCreditsReceivedModal;
