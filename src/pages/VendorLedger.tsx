import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchVendors } from '@/slices/vendorSlice';
import { ledgerService, VendorLedgerData } from '@/services/ledgerService';
import { formatDate, formatCurrency, cn } from '@/utils';
import { Download, Loader2, ArrowLeftRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/Button';
import { SearchableDropdown } from '@/components/SearchableDropdown';

const getLocalYYYYMMDD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatLedgerBalance = (balance: number): string => {
  const abs = Math.abs(balance);
  const formatted = formatCurrency(abs);
  if (balance > 0) {
    return `${formatted} Cr`;
  } else if (balance < 0) {
    return `${formatted} Dr`;
  }
  return formatted;
};

const VendorLedger: React.FC = () => {
  const dispatch = useAppDispatch();
  const { vendors } = useAppSelector((state) => state.vendors);

  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [dateRangePreset, setDateRangePreset] = useState<string>('this_month');

  // Map vendors list to options compatible with SearchableDropdown
  const vendorOptions = (vendors || []).map((v) => ({
    name: `${v.name} (${v.code})`,
    code: v.id.toString(),
  }));

  const selectedVendorObj = (vendors || []).find((v) => v.id.toString() === selectedVendorId);
  const selectedVendorName = selectedVendorObj ? `${selectedVendorObj.name} (${selectedVendorObj.code})` : '';
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [ledgerData, setLedgerData] = useState<VendorLedgerData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  // Load vendors list
  useEffect(() => {
    dispatch(fetchVendors({ limit: 500 }));
  }, [dispatch]);

  // Set initial custom dates based on preset
  useEffect(() => {
    const today = new Date();
    let start = '';
    let end = '';

    if (dateRangePreset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      start = getLocalYYYYMMDD(firstDay);
      end = getLocalYYYYMMDD(lastDay);
    } else if (dateRangePreset === 'last_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      start = getLocalYYYYMMDD(firstDay);
      end = getLocalYYYYMMDD(lastDay);
    } else if (dateRangePreset === 'this_quarter') {
      const currentQuarter = Math.floor(today.getMonth() / 3);
      const firstDay = new Date(today.getFullYear(), currentQuarter * 3, 1);
      const lastDay = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0);
      start = getLocalYYYYMMDD(firstDay);
      end = getLocalYYYYMMDD(lastDay);
    } else if (dateRangePreset === 'this_year') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      const lastDay = new Date(today.getFullYear(), 11, 31);
      start = getLocalYYYYMMDD(firstDay);
      end = getLocalYYYYMMDD(lastDay);
    }

    if (dateRangePreset !== 'custom' && dateRangePreset !== 'all_time') {
      setStartDate(start);
      setEndDate(end);
    } else if (dateRangePreset === 'all_time') {
      setStartDate('');
      setEndDate('');
    }
  }, [dateRangePreset]);

  // Fetch Ledger data
  const handleFetchLedger = async () => {
    if (!selectedVendorId) {
      setLedgerData(null);
      return;
    }

    setLoading(true);
    try {
      const data = await ledgerService.getVendorLedger(selectedVendorId, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setLedgerData(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch vendor ledger');
      setLedgerData(null);
    } finally {
      setLoading(false);
    }
  };

  // Trigger load when vendor or date bounds change
  useEffect(() => {
    if (selectedVendorId) {
      handleFetchLedger();
    } else {
      setLedgerData(null);
    }
  }, [selectedVendorId, startDate, endDate]);

  // Download PDF Report
  const handleDownloadPDF = async () => {
    if (!selectedVendorId || !ledgerData) return;

    setDownloading(true);
    try {
      const blob = await ledgerService.downloadVendorLedgerPDF(selectedVendorId, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VendorLedger-${ledgerData.vendor.code}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Ledger PDF downloaded successfully');
    } catch (error: any) {
      toast.error('Failed to generate ledger PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
        <span>Purchases</span>
        <span>/</span>
        <span className="text-gray-650 font-bold hover:underline cursor-pointer">Vendor Ledger</span>
      </div>

      {/* Control panel bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Vendor Selector */}
          <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[220px]">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select Vendor</label>
            <SearchableDropdown
              value={selectedVendorName}
              options={vendorOptions}
              onChange={(name) => {
                const v = (vendors || []).find((vend) => `${vend.name} (${vend.code})` === name);
                setSelectedVendorId(v ? v.id.toString() : '');
              }}
              placeholder="-- Choose Vendor --"
            />
          </div>

          {/* Date range Presets */}
          <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[130px]">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date Period</label>
            <select
              value={dateRangePreset}
              onChange={(e) => setDateRangePreset(e.target.value)}
              className="h-9 text-xs font-semibold bg-gray-50 border border-gray-300 rounded-md px-2.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-655 focus:border-teal-655 shadow-2xs w-full"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="all_time">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date selection inputs */}
          {(dateRangePreset === 'custom' || startDate || endDate) && dateRangePreset !== 'all_time' && (
            <>
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (dateRangePreset !== 'custom') setDateRangePreset('custom');
                  }}
                  className="h-9 w-full text-xs font-semibold bg-gray-50 border border-gray-300 rounded-md px-3 text-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-650 focus:border-teal-655 outline-none shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (dateRangePreset !== 'custom') setDateRangePreset('custom');
                  }}
                  className="h-9 w-full text-xs font-semibold bg-gray-50 border border-gray-300 rounded-md px-3 text-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-650 focus:border-teal-655 outline-none shadow-2xs"
                />
              </div>
            </>
          )}
        </div>

        {/* Action Button: Export PDF */}
        <div className="flex items-end w-full lg:w-auto pt-3 lg:pt-0">
          <Button
            onClick={handleDownloadPDF}
            disabled={!selectedVendorId || !ledgerData || downloading || loading}
            className="h-9 w-full lg:w-auto bg-[#e25822] hover:bg-[#c84d1e] active:bg-[#b04319] text-white font-bold px-4 rounded-md text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>Export Statement PDF</span>
          </Button>
        </div>
      </div>

      {loading ? (
        /* Loading Spinner */
        <div className="bg-white border rounded-lg p-16 flex flex-col items-center justify-center gap-3 shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-teal-650" />
          <span className="text-sm font-semibold text-gray-500 animate-pulse">Compiling ledger history...</span>
        </div>
      ) : !selectedVendorId ? (
        /* Empty State: Select Vendor */
        <div className="bg-white border rounded-lg p-16 flex flex-col items-center justify-center gap-3 text-center shadow-xs">
          <div className="h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-650 border border-teal-100">
            <ArrowLeftRight className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-extrabold text-gray-800">No Vendor Selected</h3>
          <p className="text-xs text-gray-450 max-w-[280px]">Choose a vendor from the dropdown to load their purchases, advance credits, payments, and payable statements.</p>
        </div>
      ) : ledgerData ? (
        /* Statement Dashboard */
        <div className="space-y-5">
          {/* Summary stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Opening Balance</span>
              <span className="text-lg font-bold text-gray-900 mt-1.5">
                {formatLedgerBalance(ledgerData.openingBalance)}
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5">Payable balance at start</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Bills (Credits)</span>
              <span className="text-lg font-bold text-gray-950 mt-1.5">
                {formatCurrency(ledgerData.totalCredit)}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">Purchases & expenses</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Debits (Payments)</span>
              <span className="text-lg font-bold text-teal-650 mt-1.5">
                {formatCurrency(ledgerData.totalDebit)}
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5">Bill payments & advances</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between bg-orange-50/10 border-orange-100">
              <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">Closing Balance</span>
              <span className={cn("text-lg font-black mt-1.5", ledgerData.closingBalance > 0 ? "text-[#e25822]" : "text-gray-900")}>
                {formatLedgerBalance(ledgerData.closingBalance)}
              </span>
              <span className="text-[10px] text-orange-600 font-semibold mt-0.5">Net outstanding payable</span>
            </div>
          </div>

          {/* Statement Paper Table layout */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {/* Statement Header Card banner */}
            <div className="px-5 py-4 bg-gray-50 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">{ledgerData.vendor.name}</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Statement Period: {startDate ? formatDate(startDate) : 'All Time'} to {endDate ? formatDate(endDate) : 'Present'}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded bg-teal-50 text-teal-800 border border-teal-200 uppercase tracking-wider">
                  AP Account Ledger
                </span>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-100/60">
                  <tr>
                    <th className="px-4 py-2.5 text-center font-bold text-gray-500 uppercase tracking-wider" style={{ width: '12%' }}>Date</th>
                    <th className="px-4 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wider" style={{ width: '18%' }}>Transaction #</th>
                    <th className="px-4 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wider" style={{ width: '15%' }}>Type</th>
                    <th className="px-4 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wider" style={{ width: '25%' }}>Details</th>
                    <th className="px-4 py-2.5 text-right font-bold text-gray-500 uppercase tracking-wider" style={{ width: '15%' }}>Debit (Paid)</th>
                    <th className="px-4 py-2.5 text-right font-bold text-gray-500 uppercase tracking-wider" style={{ width: '15%' }}>Credit (Billed)</th>
                    <th className="px-4 py-2.5 text-right font-bold text-gray-500 uppercase tracking-wider" style={{ width: '15%' }}>Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {/* Opening Balance Line */}
                  <tr className="bg-gray-50/50 font-bold text-gray-650 border-b-2">
                    <td className="px-4 py-2.5 text-center text-gray-400">{startDate ? formatDate(startDate) : '—'}</td>
                    <td className="px-4 py-2.5 text-left text-gray-800">Opening Balance</td>
                    <td className="px-4 py-2.5 text-left text-gray-400">—</td>
                    <td className="px-4 py-2.5 text-left text-gray-500">Statement Start Balance</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">—</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">—</td>
                    <td className="px-4 py-2.5 text-right text-gray-805">{formatLedgerBalance(ledgerData.openingBalance)}</td>
                  </tr>

                  {/* Main Transactions */}
                  {ledgerData.transactions.length > 0 ? (
                    ledgerData.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/40">
                        <td className="px-4 py-2.5 text-center text-gray-500">{formatDate(tx.date)}</td>
                        <td className="px-4 py-2.5 text-left font-bold text-gray-800">{tx.refNo}</td>
                        <td className="px-4 py-2.5 text-left">
                          <span className={cn(
                            "inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                            tx.type === 'Bill' ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-teal-50 text-teal-800 border border-teal-200"
                          )}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-left text-gray-500 font-medium italic">{tx.details}</td>
                        <td className="px-4 py-2.5 text-right text-red-650 font-bold">
                          {tx.debit > 0 ? formatCurrency(tx.debit) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-emerald-650 font-bold">
                          {tx.credit > 0 ? formatCurrency(tx.credit) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-extrabold text-gray-900">
                          {formatLedgerBalance(tx.balance)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-semibold">
                        No transactions recorded in this period.
                      </td>
                    </tr>
                  )}

                  {/* Closing Balance Line */}
                  <tr className="bg-gray-50 font-extrabold text-gray-900 border-t-2">
                    <td className="px-4 py-2.5 text-center text-gray-400">{endDate ? formatDate(endDate) : '—'}</td>
                    <td className="px-4 py-2.5 text-left text-gray-900">Closing Balance</td>
                    <td className="px-4 py-2.5 text-left text-gray-400">—</td>
                    <td className="px-4 py-2.5 text-left text-gray-500">Net Outstanding Balance</td>
                    <td className="px-4 py-2.5 text-right text-gray-900">{formatCurrency(ledgerData.totalDebit)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-900">{formatCurrency(ledgerData.totalCredit)}</td>
                    <td className="px-4 py-2.5 text-right text-orange-650 text-sm font-black border-l border-gray-150">
                      {formatLedgerBalance(ledgerData.closingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-gray-100 bg-white">
              {/* Opening Balance Card */}
              <div className="p-4 bg-gray-50/50 flex justify-between items-center text-xs font-bold text-gray-700">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider">Start Date</span>
                  <span>{startDate ? formatDate(startDate) : '—'}</span>
                </div>
                <div className="text-right flex flex-col gap-0.5">
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider">Opening Balance</span>
                  <span className="text-gray-800 font-extrabold">{formatLedgerBalance(ledgerData.openingBalance)}</span>
                </div>
              </div>

              {/* Transactions List */}
              {ledgerData.transactions.length > 0 ? (
                ledgerData.transactions.map((tx) => (
                  <div key={tx.id} className="p-4 hover:bg-gray-50/30 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                          tx.type === 'Bill' ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-teal-50 text-teal-800 border border-teal-200"
                        )}>
                          {tx.type}
                        </span>
                        <span className="text-xs font-bold text-gray-900">{tx.refNo}</span>
                      </div>
                      <span className="text-[11px] text-gray-500 font-medium">{formatDate(tx.date)}</span>
                    </div>

                    {tx.details && (
                      <p className="text-xs text-gray-500 italic font-medium">{tx.details}</p>
                    )}

                    <div className="flex justify-between items-end pt-1">
                      <div className="flex gap-4 text-xs">
                        {tx.debit > 0 && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] text-gray-400 uppercase tracking-wider">Debit (Paid)</span>
                            <span className="font-bold text-red-600">{formatCurrency(tx.debit)}</span>
                          </div>
                        )}
                        {tx.credit > 0 && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] text-gray-400 uppercase tracking-wider">Credit (Billed)</span>
                            <span className="font-bold text-emerald-600">{formatCurrency(tx.credit)}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex flex-col gap-0.5">
                        <span className="text-[9px] text-gray-400 uppercase tracking-wider">Balance</span>
                        <span className="font-extrabold text-gray-900">{formatLedgerBalance(tx.balance)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-450 font-semibold text-xs">
                  No transactions recorded in this period.
                </div>
              )}

              {/* Closing Balance Card */}
              <div className="p-4 bg-gray-50 flex flex-col gap-2 text-xs border-t border-gray-200 font-extrabold">
                <div className="flex justify-between items-center text-gray-500">
                  <span>Total Payments (Debits):</span>
                  <span className="text-gray-900">{formatCurrency(ledgerData.totalDebit)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-500">
                  <span>Total Billed (Credits):</span>
                  <span className="text-gray-900">{formatCurrency(ledgerData.totalCredit)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Closing Balance:</span>
                  <span className="text-orange-650 text-sm font-black">{formatLedgerBalance(ledgerData.closingBalance)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border rounded-lg p-16 flex flex-col items-center justify-center gap-3 text-center shadow-xs">
          <div className="h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-650 border border-teal-100">
            <ArrowLeftRight className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-extrabold text-gray-800">Select a vendor above</h3>
          <p className="text-xs text-gray-450">Choose a vendor from the dropdown selector to compile their account ledger statement.</p>
        </div>
      )}
    </div>
  );
};

export default VendorLedger;
