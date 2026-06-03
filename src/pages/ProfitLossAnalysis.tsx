import React, { useState, useEffect } from 'react';
import {
  Download, TrendingUp, TrendingDown, FileText, Calendar,
  ChevronDown, ChevronUp, BarChart2, Package, DollarSign, Percent,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProfitLossData, generateProfitLossPDF, generateSingleInvoiceProfitLossPDF, fetchProductWiseProfitLossData } from '@/slices/outwardSlice';
import { formatCurrency, formatDate } from '@/utils';
import Table from '@/components/Table';

interface ProfitLossItem {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  productName: string;
  productGrade: string;
  categoryName: string;
  uom: string;
  packPerPiece: number;
  packPerBox: number;
  pcsPerBox: number;
  orderQty: number;
  dispatchQty: number;
  saleUnit: string;
  vendorName: string;
  purchasePrice: string;
  salesPrice: string;
  totalPurchasePrice: string;
  totalSalesPrice: string;
  difference: string;
  profitMargin: string;
  customerName: string;
}

interface ProductWiseProfitLoss {
  productId: number;
  productName: string;
  productGrade: string;
  categoryName: string;
  totalQuantity: number;
  totalPurchasePrice: string;
  totalSalesPrice: string;
  totalProfit: string;
  profitMargin: string;
  transactions: any[];
}

interface ColumnDef {
  key: string;
  title: string;
  render?: (value: any, record: any) => React.ReactNode;
}

const ProfitLossAnalysis: React.FC = () => {
  const dispatch = useAppDispatch();
  const { profitLossData, profitLossLoading, profitLossError, productWiseProfitLossData, productWiseProfitLossLoading } = useAppSelector(
    (state) => state.outward
  );
  const [viewMode, setViewMode] = useState<'invoice' | 'product'>('product');
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCOGS: 0,
    totalProfit: 0,
    profitMargin: 0,
    totalItems: 0,
  });

  useEffect(() => { loadData(); }, [dispatch]);

  useEffect(() => {
    if (profitLossError) toast.error(profitLossError);
  }, [profitLossError]);

  useEffect(() => {
    const data = viewMode === 'product' ? productWiseProfitLossData : profitLossData;
    if (data && data.length > 0) {
      const totalRevenue = data.reduce((sum: number, item: any) => sum + parseFloat(item.totalSalesPrice || 0), 0);
      const totalCOGS = data.reduce((sum: number, item: any) => sum + parseFloat(item.totalPurchasePrice || 0), 0);
      const totalProfit = data.reduce((sum: number, item: any) => {
        return sum + parseFloat(viewMode === 'product' ? (item.totalProfit || 0) : (item.difference || 0));
      }, 0);
      const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;
      setSummary({ totalRevenue, totalCOGS, totalProfit, profitMargin, totalItems: data.length });
    } else {
      setSummary({ totalRevenue: 0, totalCOGS: 0, totalProfit: 0, profitMargin: 0, totalItems: 0 });
    }
  }, [profitLossData, productWiseProfitLossData, viewMode]);

  const loadData = (view?: 'invoice' | 'product') => {
    if (view === 'invoice' || viewMode === 'invoice') {
      dispatch(fetchProfitLossData({ startDate: undefined, endDate: undefined }));
    } else if (view === 'product' || viewMode === 'product') {
      dispatch(fetchProductWiseProfitLossData({ startDate: undefined, endDate: undefined }));
    } else {
      dispatch(fetchProfitLossData({ startDate: undefined, endDate: undefined }));
      dispatch(fetchProductWiseProfitLossData({ startDate: undefined, endDate: undefined }));
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const action = await dispatch(generateProfitLossPDF({ startDate: undefined, endDate: undefined })).unwrap();
      const url = window.URL.createObjectURL(action);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AllProfitLoss_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Report downloaded successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate PDF');
    }
  };

  const handleDownloadSingleInvoicePDF = async (invoiceId: string) => {
    try {
      const action = await dispatch(generateSingleInvoiceProfitLossPDF(invoiceId)).unwrap();
      const url = window.URL.createObjectURL(action);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ProfitLoss_Invoice_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Invoice PDF downloaded');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate PDF');
    }
  };

  const toggleProductExpand = (productId: number) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) { newExpanded.delete(productId); } else { newExpanded.add(productId); }
    setExpandedProducts(newExpanded);
  };

  const isProfit = summary.totalProfit >= 0;
  const isProfitMarginPositive = summary.profitMargin >= 0;

  // ── Product columns ───────────────────────────────────────────────────────
  const productColumns: ColumnDef[] = [
    {
      key: 'productName',
      title: 'Product',
      render: (value: any, record: ProductWiseProfitLoss) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleProductExpand(record.productId)}
            className="p-0.5 hover:bg-gray-100 rounded text-gray-500 transition-colors flex-shrink-0"
          >
            {expandedProducts.has(record.productId)
              ? <ChevronUp className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <div>
            <div className="font-semibold text-xs text-gray-900">{value}</div>
            {record.productGrade && <div className="text-[10px] text-gray-400 mt-0.5">{record.productGrade}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'categoryName',
      title: 'Category',
      render: (value: any) => (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-600">{value}</span>
      ),
    },
    {
      key: 'totalQuantity',
      title: 'Qty',
      render: (value: any) => <span className="text-xs font-semibold text-gray-700 text-center block">{value}</span>,
    },
    {
      key: 'totalPurchasePrice',
      title: 'Purchase',
      render: (value: any) => <span className="text-xs text-gray-700 text-right block font-medium">₹{value}</span>,
    },
    {
      key: 'totalSalesPrice',
      title: 'Sales',
      render: (value: any) => <span className="text-xs text-gray-700 text-right block font-medium">₹{value}</span>,
    },
    {
      key: 'totalProfit',
      title: 'Profit',
      render: (value: any) => {
        const profit = parseFloat(value);
        return (
          <span className={`text-xs font-bold text-right block ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {profit >= 0 ? '+' : ''}₹{value}
          </span>
        );
      },
    },
    {
      key: 'profitMargin',
      title: 'Margin',
      render: (value: any) => {
        const margin = parseFloat(value);
        return (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${margin >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
            {margin >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {value}%
          </span>
        );
      },
    },
  ];

  // ── Invoice columns ───────────────────────────────────────────────────────
  const invoiceColumns = [
    {
      key: 'invoiceNo',
      title: 'Invoice',
      render: (value: string) => <span className="text-xs font-semibold text-primary-700">{value}</span>,
    },
    {
      key: 'invoiceDate',
      title: 'Date',
      render: (value: string) => <span className="text-xs text-gray-600">{formatDate(value)}</span>,
    },
    {
      key: 'productName',
      title: 'Product',
      render: (value: string, record: ProfitLossItem) => (
        <div>
          <div className="text-xs font-semibold text-gray-900">{value}</div>
          {record.productGrade && <div className="text-[10px] text-gray-400">{record.productGrade}</div>}
        </div>
      ),
    },
    {
      key: 'uom',
      title: 'UOM',
      render: (value: string) => <span className="text-[10px] text-gray-500">{value}</span>,
    },
    {
      key: 'orderQty',
      title: 'Qty',
      render: (value: number, record: ProfitLossItem) => (
        <span className="text-xs text-gray-700 text-center block">{value} {record.saleUnit}</span>
      ),
    },
    {
      key: 'purchasePrice',
      title: 'Purchase',
      render: (value: string) => <span className="text-xs text-gray-700 text-right block">₹{value}</span>,
    },
    {
      key: 'salesPrice',
      title: 'Sales',
      render: (value: string) => <span className="text-xs text-gray-700 text-right block">₹{value}</span>,
    },
    {
      key: 'difference',
      title: 'Profit',
      render: (value: string) => {
        const diff = parseFloat(value);
        return (
          <span className={`text-xs font-bold text-right block ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {diff >= 0 ? '+' : ''}₹{value}
          </span>
        );
      },
    },
    {
      key: 'profitMargin',
      title: 'Margin',
      render: (value: string) => {
        const margin = parseFloat(value);
        return (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${margin >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
            {margin >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {value}%
          </span>
        );
      },
    },
    {
      key: 'download',
      title: '',
      render: (_: any, record: ProfitLossItem) => (
        <button
          onClick={() => handleDownloadSingleInvoicePDF(record.id.toString())}
          disabled={profitLossLoading}
          className="p-1.5 text-gray-400 hover:text-primary-700 hover:bg-primary-50 rounded transition-all border border-transparent hover:border-primary-200"
          title="Download PDF"
        >
          <FileText className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  // ── Render expanded product transactions ──────────────────────────────────
  const renderProductDetails = (product: ProductWiseProfitLoss) => {
    if (!expandedProducts.has(product.productId)) return null;
    return (
      <tr className="bg-gray-50/70">
        <td colSpan={7} className="px-4 py-3">
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Transaction History
            </h4>
            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-3 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">Invoice</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">Customer</th>
                    <th className="px-3 py-1.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wide">Qty</th>
                    <th className="px-3 py-1.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">Purchase</th>
                    <th className="px-3 py-1.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">Sales</th>
                    <th className="px-3 py-1.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">Profit</th>
                    <th className="px-3 py-1.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {product.transactions.map((tx: any, idx: number) => (
                    <tr key={idx} className="border-t border-gray-200 hover:bg-white transition-colors">
                      <td className="px-3 py-1.5 font-semibold text-primary-700">{tx.invoiceNo}</td>
                      <td className="px-3 py-1.5 text-gray-600">{formatDate(tx.invoiceDate)}</td>
                      <td className="px-3 py-1.5 text-gray-600">{tx.customerName}</td>
                      <td className="px-3 py-1.5 text-center text-gray-700">{tx.quantity} {tx.saleUnit}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700">₹{tx.purchasePrice}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700">₹{tx.salesPrice}</td>
                      <td className={`px-3 py-1.5 text-right font-bold ${parseFloat(tx.profit) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {parseFloat(tx.profit) >= 0 ? '+' : ''}₹{tx.profit}
                      </td>
                      <td className={`px-3 py-1.5 text-right font-bold ${parseFloat(tx.profitMargin) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {tx.profitMargin}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  const isLoading = productWiseProfitLossLoading || profitLossLoading;

  return (
    <div className="space-y-3">
      {/* ── Odoo-style Page Header ── */}
      <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          {/* Left */}
          <div>
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
              <span className="hover:text-primary-600 cursor-pointer">Accounting</span>
              <span>/</span>
              <span className="font-semibold text-gray-700">Profit & Loss</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary-600 flex-shrink-0" />
              <h1 className="text-base font-bold text-gray-900 tracking-tight">Profit & Loss Analysis</h1>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-gray-100 border border-gray-300 rounded p-0.5">
              <button
                onClick={() => { setViewMode('product'); loadData('product'); }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${viewMode === 'product' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Package className="w-3.5 h-3.5" /> Product-wise
              </button>
              <button
                onClick={() => { setViewMode('invoice'); loadData('invoice'); }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${viewMode === 'invoice' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <FileText className="w-3.5 h-3.5" /> Invoice-wise
              </button>
            </div>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isLoading}
              className="odoo-btn-primary disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Revenue */}
        <div className="bg-white border border-blue-200 rounded shadow-sm p-3 flex items-center gap-3 hover:shadow transition-shadow">
          <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Revenue</p>
            <p className="text-base font-bold text-blue-700 leading-tight">{formatCurrency(summary.totalRevenue)}</p>
          </div>
        </div>

        {/* COGS */}
        <div className="bg-white border border-orange-200 rounded shadow-sm p-3 flex items-center gap-3 hover:shadow transition-shadow">
          <div className="w-8 h-8 rounded bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total COGS</p>
            <p className="text-base font-bold text-orange-700 leading-tight">{formatCurrency(summary.totalCOGS)}</p>
          </div>
        </div>

        {/* Profit/Loss */}
        <div className={`bg-white border rounded shadow-sm p-3 flex items-center gap-3 hover:shadow transition-shadow ${isProfit ? 'border-emerald-200' : 'border-red-200'}`}>
          <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${isProfit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{isProfit ? 'Net Profit' : 'Net Loss'}</p>
            <p className={`text-base font-bold leading-tight ${isProfit ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(summary.totalProfit)}</p>
          </div>
        </div>

        {/* Margin */}
        <div className={`bg-white border rounded shadow-sm p-3 flex items-center gap-3 hover:shadow transition-shadow ${isProfitMarginPositive ? 'border-purple-200' : 'border-red-200'}`}>
          <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${isProfitMarginPositive ? 'bg-purple-50 text-purple-600' : 'bg-red-50 text-red-600'}`}>
            <Percent className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Profit Margin</p>
            <p className={`text-base font-bold leading-tight ${isProfitMarginPositive ? 'text-purple-700' : 'text-red-700'}`}>{summary.profitMargin.toFixed(2)}%</p>
          </div>
        </div>

        {/* Items count */}
        <div className="bg-white border border-gray-200 rounded shadow-sm p-3 flex items-center gap-3 hover:shadow transition-shadow">
          <div className="w-8 h-8 rounded bg-gray-100 text-gray-600 flex items-center justify-center flex-shrink-0">
            <Package className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{viewMode === 'product' ? 'Products' : 'Invoices'}</p>
            <p className="text-base font-bold text-gray-800 leading-tight">{summary.totalItems}</p>
          </div>
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-gray-700">
              {viewMode === 'product' ? 'Product-wise Breakdown' : 'Invoice-wise Breakdown'}
            </h2>
            {!isLoading && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                {summary.totalItems} {viewMode === 'product' ? 'products' : 'invoices'}
              </span>
            )}
          </div>
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 border-t-primary-600 animate-spin" />
              Loading...
            </div>
          )}
        </div>

        {/* Product-wise Table (custom - supports expandable rows) */}
        {viewMode === 'product' && productWiseProfitLossData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {productColumns.map((col) => (
                    <th key={col.key} className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productWiseProfitLossData.map((product: ProductWiseProfitLoss) => {
                  const productData = product as Record<string, any>;
                  const isExpanded = expandedProducts.has(product.productId);
                  return (
                    <React.Fragment key={product.productId}>
                      <tr
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-primary-50/20 border-l-2 border-l-primary-400' : ''}`}
                        onClick={() => toggleProductExpand(product.productId)}
                      >
                        {productColumns.map((col) => (
                          <td key={col.key} className="px-4 py-2">
                            {col.render ? col.render(productData[col.key], product) : productData[col.key]}
                          </td>
                        ))}
                      </tr>
                      {renderProductDetails(product)}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'invoice' && profitLossData.length > 0 ? (
          <Table data={profitLossData} columns={invoiceColumns} loading={profitLossLoading} />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {isLoading ? (
              <>
                <div className="w-8 h-8 rounded-full border-4 border-gray-100 border-t-primary-600 animate-spin mb-2" />
                <p className="text-xs text-gray-500">Loading data...</p>
              </>
            ) : (
              <>
                <BarChart2 className="h-10 w-10 text-gray-200 mb-2" strokeWidth={1.5} />
                <p className="text-sm font-medium text-gray-400">No data available</p>
                <p className="text-xs text-gray-400 mt-1">Generate outward orders to see profit & loss reports.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfitLossAnalysis;
