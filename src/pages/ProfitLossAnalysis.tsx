import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, TrendingDown, FileText, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProfitLossData, generateProfitLossPDF, generateSingleInvoiceProfitLossPDF, fetchProductWiseProfitLossData } from '@/slices/outwardSlice';
import { formatCurrency, formatDate } from '@/utils';
import Button from '@/components/Button';
import Table from '@/components/Table';
import PageHeader from '@/components/PageHeader';

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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (profitLossError) {
      toast.error(profitLossError);
    }
  }, [profitLossError]);

  useEffect(() => {
    const data = viewMode === 'product' ? productWiseProfitLossData : profitLossData;
    if (data && data.length > 0) {
      const totalRevenue = data.reduce((sum: number, item: any) => sum + parseFloat(item.totalSalesPrice), 0);
      const totalCOGS = data.reduce((sum: number, item: any) => sum + parseFloat(item.totalPurchasePrice), 0);
      const totalProfit = data.reduce((sum: number, item: any) => sum + parseFloat(item.totalProfit || item.difference), 0);
      const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;

      setSummary({
        totalRevenue,
        totalCOGS,
        totalProfit,
        profitMargin,
        totalItems: data.length,
      });
    }
  }, [profitLossData, productWiseProfitLossData, viewMode]);

  const loadData = () => {
    dispatch(fetchProfitLossData({ startDate: undefined, endDate: undefined }));
    dispatch(fetchProductWiseProfitLossData({ startDate: undefined, endDate: undefined }));
  };

  const handleDownloadPDF = async () => {
    try {
      const action = await dispatch(
        generateProfitLossPDF({ startDate: undefined, endDate: undefined })
      ).unwrap();
      
      const url = window.URL.createObjectURL(action);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AllProfitLoss_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('All profit-loss report downloaded successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate PDF');
    }
  };

  const handleDownloadSingleInvoicePDF = async (invoiceId: string) => {
    try {
      const action = await dispatch(
        generateSingleInvoiceProfitLossPDF(invoiceId)
      ).unwrap();
      
      const url = window.URL.createObjectURL(action);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ProfitLoss_Invoice_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Invoice profit-loss PDF downloaded successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate PDF');
    }
  };

  const toggleProductExpand = (productId: number) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const productColumns: ColumnDef[] = [
    {
      key: 'productName',
      title: 'Product Name',
      render: (value: any, record: ProductWiseProfitLoss) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleProductExpand(record.productId)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            {expandedProducts.has(record.productId) ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <div>
            <div className="font-medium">{value}</div>
            {record.productGrade && <div className="text-xs text-gray-500">{record.productGrade}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'categoryName',
      title: 'Category',
    },
    {
      key: 'totalQuantity',
      title: 'Total Qty',
      render: (value: any) => <span className="text-center block">{value}</span>,
    },
    {
      key: 'totalPurchasePrice',
      title: 'Total Purchase',
      render: (value: any) => <span className="text-right block">₹{value}</span>,
    },
    {
      key: 'totalSalesPrice',
      title: 'Total Sales',
      render: (value: any) => <span className="text-right block">₹{value}</span>,
    },
    {
      key: 'totalProfit',
      title: 'Total Profit',
      render: (value: any) => {
        const profit = parseFloat(value);
        return (
          <span className={`text-right block font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₹{value}
          </span>
        );
      },
    },
    {
      key: 'profitMargin',
      title: 'Margin %',
      render: (value: any) => {
        const margin = parseFloat(value);
        return (
          <span className={`text-right block font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {value}%
          </span>
        );
      },
    },
  ];

  const invoiceColumns = [
    {
      key: 'invoiceNo',
      title: 'Invoice No',
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'invoiceDate',
      title: 'Date',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'productName',
      title: 'Product Name',
      render: (value: string, record: ProfitLossItem) => (
        <div>
          <div className="font-medium">{value}</div>
          {record.productGrade && <div className="text-xs text-gray-500">{record.productGrade}</div>}
        </div>
      ),
    },
    {
      key: 'uom',
      title: 'UOM',
    },
    {
      key: 'orderQty',
      title: 'Order Qty',
      render: (value: number, record: ProfitLossItem) => (
        <span className="text-center block">{value} {record.saleUnit}</span>
      ),
    },
    {
      key: 'purchasePrice',
      title: 'Purchase Price',
      render: (value: string) => <span className="text-right block">₹{value}</span>,
    },
    {
      key: 'salesPrice',
      title: 'Sales Price',
      render: (value: string) => <span className="text-right block">₹{value}</span>,
    },
    {
      key: 'difference',
      title: 'Difference',
      render: (value: string) => {
        const diff = parseFloat(value);
        return (
          <span className={`text-right block font-semibold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₹{value}
          </span>
        );
      },
    },
    {
      key: 'profitMargin',
      title: 'Margin %',
      render: (value: string) => {
        const margin = parseFloat(value);
        return (
          <span className={`text-right block font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {value}%
          </span>
        );
      },
    },
    {
      key: 'download',
      title: 'Download',
      render: (_: any, record: ProfitLossItem) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDownloadSingleInvoicePDF(record.id.toString())}
          loading={profitLossLoading}
        >
          <FileText className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const renderProductDetails = (product: ProductWiseProfitLoss) => {
    if (!expandedProducts.has(product.productId)) return null;

    return (
      <tr className="bg-gray-50">
        <td colSpan={7} className="p-4">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Transaction Details</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Invoice No</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Customer</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Purchase Price</th>
                    <th className="px-3 py-2 text-right">Sales Price</th>
                    <th className="px-3 py-2 text-right">Profit</th>
                    <th className="px-3 py-2 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {product.transactions.map((tx: any, idx: number) => (
                    <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{tx.invoiceNo}</td>
                      <td className="px-3 py-2">{formatDate(tx.invoiceDate)}</td>
                      <td className="px-3 py-2">{tx.customerName}</td>
                      <td className="px-3 py-2 text-center">{tx.quantity} {tx.saleUnit}</td>
                      <td className="px-3 py-2 text-right">₹{tx.purchasePrice}</td>
                      <td className="px-3 py-2 text-right">₹{tx.salesPrice}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${parseFloat(tx.profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{tx.profit}
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${parseFloat(tx.profitMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Profit & Loss Analysis"
        searchPlaceholder="Search..."
        onSearch={() => {}}
        actions={[
          {
            label: 'All Profit Loss PDF',
            icon: <Download className="h-4 w-4" />,
            onClick: handleDownloadPDF,
            variant: 'primary' as const,
          },
        ]}
      />

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('product')}
          className={`px-4 py-2 rounded font-medium transition ${
            viewMode === 'product'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Product-wise View
        </button>
        <button
          onClick={() => setViewMode('invoice')}
          className={`px-4 py-2 rounded font-medium transition ${
            viewMode === 'invoice'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Invoice-wise View
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total COGS</p>
              <p className="text-2xl font-bold text-orange-900">{formatCurrency(summary.totalCOGS)}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-orange-500 opacity-50" />
          </div>
        </div>

        <div className={`card bg-gradient-to-br ${summary.totalProfit >= 0 ? 'from-green-50 to-green-100 border border-green-200' : 'from-red-50 to-red-100 border border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Profit</p>
              <p className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {formatCurrency(summary.totalProfit)}
              </p>
            </div>
            <TrendingUp className={`h-8 w-8 ${summary.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'} opacity-50`} />
          </div>
        </div>

        <div className={`card bg-gradient-to-br ${summary.profitMargin >= 0 ? 'from-purple-50 to-purple-100 border border-purple-200' : 'from-red-50 to-red-100 border border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Profit Margin</p>
              <p className={`text-2xl font-bold ${summary.profitMargin >= 0 ? 'text-purple-900' : 'text-red-900'}`}>
                {summary.profitMargin.toFixed(2)}%
              </p>
            </div>
            <TrendingUp className={`h-8 w-8 ${summary.profitMargin >= 0 ? 'text-purple-500' : 'text-red-500'} opacity-50`} />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-indigo-900">{summary.totalItems}</p>
            </div>
            <Calendar className="h-8 w-8 text-indigo-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card overflow-x-auto">
        {viewMode === 'product' ? (
          <div>
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  {productColumns.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-left font-semibold">
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productWiseProfitLossData.map((product: ProductWiseProfitLoss) => {
                  const productData = product as Record<string, any>;
                  return (
                    <React.Fragment key={product.productId}>
                      <tr className="border-b hover:bg-gray-50">
                        {productColumns.map((col) => (
                          <td key={col.key} className="px-4 py-3">
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
            {productWiseProfitLossLoading && (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            )}
          </div>
        ) : (
          <Table data={profitLossData} columns={invoiceColumns} loading={profitLossLoading} />
        )}
      </div>
    </div>
  );
};

export default ProfitLossAnalysis;
