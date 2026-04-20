import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, TrendingDown, FileText, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProfitLossData, generateProfitLossPDF, generateSingleInvoiceProfitLossPDF } from '@/slices/outwardSlice';
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

const ProfitLossAnalysis: React.FC = () => {
  const dispatch = useAppDispatch();
  const { profitLossData, profitLossLoading, profitLossError } = useAppSelector(
    (state) => state.outward
  );
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
    if (profitLossData && profitLossData.length > 0) {
      const totalRevenue = profitLossData.reduce((sum: number, item: ProfitLossItem) => sum + parseFloat(item.totalSalesPrice), 0);
      const totalCOGS = profitLossData.reduce((sum: number, item: ProfitLossItem) => sum + parseFloat(item.totalPurchasePrice), 0);
      const totalProfit = profitLossData.reduce((sum: number, item: ProfitLossItem) => sum + parseFloat(item.difference), 0);
      const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;

      setSummary({
        totalRevenue,
        totalCOGS,
        totalProfit,
        profitMargin,
        totalItems: profitLossData.length,
      });
    }
  }, [profitLossData]);

  const loadData = () => {
    dispatch(fetchProfitLossData({ startDate: undefined, endDate: undefined }));
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

  const columns = [
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
      key: 'packPerPiece',
      title: 'PCS/PACK',
      render: (value: number) => <span className="text-center block">{value}</span>,
    },
    {
      key: 'packPerBox',
      title: 'PACK/BOX',
      render: (value: number) => <span className="text-center block">{value}</span>,
    },
    {
      key: 'pcsPerBox',
      title: 'PCS/BOX',
      render: (value: number) => <span className="text-center block">{value}</span>,
    },
    {
      key: 'orderQty',
      title: 'Order Qty',
      render: (value: number, record: ProfitLossItem) => (
        <span className="text-center block">{value} {record.saleUnit}</span>
      ),
    },
    {
      key: 'dispatchQty',
      title: 'Dispatch Qty',
      render: (value: number, record: ProfitLossItem) => (
        <span className="text-center block">{value} {record.saleUnit}</span>
      ),
    },
    {
      key: 'vendorName',
      title: 'Vendor',
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
        <Table data={profitLossData} columns={columns} loading={profitLossLoading} />
      </div>
    </div>
  );
};

export default ProfitLossAnalysis;
