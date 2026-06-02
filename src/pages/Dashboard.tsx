import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  Package,
  DollarSign,
  ShoppingCart,
  Users,
  AlertTriangle,
  Activity,
  Target,
  Filter,
  RefreshCw,
  Eye,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchKPIs,
  fetchRevenueChart,
  fetchTopProducts,
  fetchTopCustomers,
} from '@/slices/dashboardSlice';
import { fetchLocations } from '@/slices/locationSlice';
import { fetchCategories } from '@/slices/categorySlice';
import { fetchVendors } from '@/slices/vendorSlice';
import { fetchCustomers } from '@/slices/customerSlice';
import { formatCurrency, formatNumber } from '@/utils';
import Button from '@/components/Button';
import Select from '@/components/Select';
import Input from '@/components/Input';

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  borderAccent: string;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  icon,
  borderAccent,
  iconBg,
  trend,
  subtitle,
}) => (
  <div className={`bg-white rounded border border-gray-200 ${borderAccent} p-2.5 shadow-sm hover:shadow transition-shadow overflow-hidden`}>
    <div className="flex flex-col justify-between h-full space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 truncate" title={title}>
            {title}
          </p>
          <h3 className="text-xs sm:text-sm font-extrabold text-gray-800 tracking-tight leading-none truncate" title={value}>
            {value}
          </h3>
        </div>
        <div className={`w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-sm ${iconBg} flex items-center justify-center flex-shrink-0`}>
          {React.cloneElement(icon as React.ReactElement, {
            className: 'h-3.5 w-3.5 sm:h-4 sm:w-4',
          })}
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-auto pt-1 text-[9px] sm:text-[10px] border-t border-gray-100/60">
        <span className="text-gray-400 truncate font-semibold" title={subtitle}>{subtitle}</span>
        {change !== undefined && (
          <div className="flex items-center ml-1.5 flex-shrink-0">
            {trend === 'up' ? (
              <span className="inline-flex items-center font-bold text-green-600 bg-green-50 border border-green-200 px-1 py-0.25 rounded text-[8px] sm:text-[9px]">
                +{change}%
              </span>
            ) : trend === 'down' ? (
              <span className="inline-flex items-center font-bold text-red-650 bg-red-55/60 border border-red-200 px-1 py-0.25 rounded text-[8px] sm:text-[9px]">
                -{change}%
              </span>
            ) : (
              <span className="inline-flex items-center font-bold text-gray-650 bg-gray-50 border border-gray-250 px-1 py-0.25 rounded text-[8px] sm:text-[9px]">
                {change}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { kpis, revenueChart, topProducts, topCustomers, loading } =
    useAppSelector((state) => state.dashboard);
  const { locations } = useAppSelector((state) => state.locations);
  const { categories } = useAppSelector((state) => state.categories);

  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    category: '',
    vendor: '',
    customer: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadMasterData();
  }, [period, filters]);

  const loadMasterData = async () => {
    try {
      dispatch(fetchLocations({ limit: 100 }));
      dispatch(fetchCategories({ limit: 100 }));
      dispatch(fetchVendors({ limit: 100 }));
      dispatch(fetchCustomers({ limit: 100 }));
    } catch (error) {
      // Error loading master data
    }
  };

  const loadDashboardData = async () => {
    try {
      const filterParams = {
        period,
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.location && { location: filters.location }),
        ...(filters.category && { category: filters.category }),
        ...(filters.vendor && { vendor: filters.vendor }),
        ...(filters.customer && { customer: filters.customer }),
      };
      
      dispatch(fetchKPIs(filterParams));
      dispatch(fetchRevenueChart(filterParams));
      dispatch(fetchTopProducts({ limit: 10, ...filterParams }));
      dispatch(fetchTopCustomers({ limit: 10, ...filterParams }));
    } catch (error) {
      // Error loading dashboard data
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => {
      return { ...prev, [key]: value };
    });
  };

  const applyFilters = async () => {
    setShowFilters(false);
    await loadDashboardData();
  };

  const clearFilters = () => {
    const clearedFilters = {
      location: '',
      category: '',
      vendor: '',
      customer: '',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
    };
    setFilters(clearedFilters);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-4 lg:p-6">
        <div className="animate-pulse">
          {/* Header Skeleton */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col gap-3 mb-4">
              <div className="h-8 sm:h-10 bg-gray-200 rounded w-48 sm:w-64"></div>
              <div className="flex flex-wrap gap-2">
                <div className="h-8 w-16 sm:w-20 bg-gray-200 rounded"></div>
                <div className="h-8 w-16 sm:w-20 bg-gray-200 rounded"></div>
                <div className="h-8 w-24 sm:w-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>

          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-9 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 sm:mb-6">
            <div className="lg:col-span-2 h-64 sm:h-80 bg-gray-200 rounded-xl"></div>
            <div className="h-64 sm:h-80 bg-gray-200 rounded-xl"></div>
          </div>

          {/* Bottom Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="h-64 sm:h-80 bg-gray-200 rounded-xl"></div>
            <div className="h-64 sm:h-80 bg-gray-200 rounded-xl"></div>
            <div className="h-64 sm:h-80 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Panel (Header) */}
      <div className="bg-white border border-gray-200 rounded px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm mb-3">
        {/* Mobile Control Panel */}
        <div className="md:hidden space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-primary-500 uppercase tracking-wider">Inventory</span>
              <h1 className="text-base font-bold text-gray-800 tracking-tight leading-tight">Dashboard</h1>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                size="sm"
                className="odoo-btn-secondary h-7 px-2 text-xs"
                title="Filters"
              >
                <Filter className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                size="sm"
                className="odoo-btn-secondary h-7 px-2 text-xs"
                title="Refresh"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          <div className="flex bg-gray-50 border border-gray-300 rounded p-0.5 justify-around">
            {(['week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-1 text-center text-xs font-semibold rounded-sm transition-all ${
                  period === p
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-650 hover:bg-gray-105'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Control Panel - Real Odoo Style Grid */}
        <div className="hidden md:grid md:grid-cols-2 gap-2 items-center">
          {/* Left Side: Breadcrumb Path and Primary Actions */}
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="hover:text-primary-600 cursor-pointer">Inventory</span>
              <span>/</span>
              <span className="font-semibold text-gray-700">Dashboard</span>
            </div>
            <div className="flex gap-1.5 pt-0.5">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                size="sm"
                className="odoo-btn-primary h-7.5 text-xs px-3"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="ml-1.5">Refresh</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                size="sm"
                className={`odoo-btn-secondary h-7.5 text-xs px-3 ${showFilters ? 'bg-gray-100 border-gray-450' : ''}`}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="ml-1.5">Filters</span>
              </Button>
            </div>
          </div>

          {/* Right Side: Period Switcher tabs */}
          <div className="flex items-center justify-end">
            <div className="flex bg-gray-50 border border-gray-300 rounded p-0.5 w-52">
              {(['week', 'month', 'year'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-1 text-center text-xs font-semibold rounded-sm transition-all ${
                    period === p
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-650 hover:bg-gray-100'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded p-3.5 shadow-sm mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 mb-3 border-b border-gray-200">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Advanced Filters
            </h3>
            <div className="flex items-center gap-1.5 mt-2 sm:mt-0">
              <Button variant="outline" size="sm" onClick={clearFilters} className="odoo-btn-secondary h-7 text-xs px-2.5">
                Clear All
              </Button>
              <Button size="sm" onClick={applyFilters} className="odoo-btn-primary h-7 text-xs px-2.5">
                Apply Filters
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select
              label="Location"
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              options={[
                { value: '', label: 'All Locations' },
                ...locations.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />

            <Select
              label="Category"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />

            <Input
              label="Date From"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />

            <Input
              label="Date To"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
        <KPICard
          title="Stock Value"
          value={formatCurrency(kpis?.totalStockValue || 0)}
          subtitle="Current inventory"
          icon={<Package />}
          borderAccent="border-l-4 border-blue-500"
          iconBg="bg-blue-50 text-blue-600"
        />
        <KPICard
          title="Revenue"
          value={formatCurrency(kpis?.totalRevenue || 0)}
          subtitle="Total sales"
          icon={<DollarSign />}
          borderAccent="border-l-4 border-green-500"
          iconBg="bg-green-50 text-green-650"
        />
        <KPICard
          title="Purchase"
          value={formatCurrency(kpis?.totalPurchase || 0)}
          subtitle="Procurement"
          icon={<ShoppingCart />}
          borderAccent="border-l-4 border-orange-500"
          iconBg="bg-orange-50 text-orange-600"
        />
        <KPICard
          title="COGS"
          value={formatCurrency(kpis?.totalCOGS || 0)}
          subtitle="Cost of goods"
          icon={<Target />}
          borderAccent="border-l-4 border-red-500"
          iconBg="bg-red-50 text-red-650"
        />
        <KPICard
          title="Inward Expense"
          value={formatCurrency(kpis?.inwardExpenses || 0)}
          subtitle="Purchase costs"
          icon={<AlertTriangle />}
          borderAccent="border-l-4 border-amber-500"
          iconBg="bg-amber-50 text-amber-600"
        />
        <KPICard
          title="Outward Expense"
          value={formatCurrency(kpis?.outwardExpenses || 0)}
          subtitle="Sales costs"
          icon={<AlertTriangle />}
          borderAccent="border-l-4 border-yellow-500"
          iconBg="bg-yellow-50 text-yellow-650"
        />
        <KPICard
          title="Total Expenses"
          value={formatCurrency(kpis?.totalExpenses || 0)}
          subtitle="All operating costs"
          icon={<AlertTriangle />}
          borderAccent="border-l-4 border-rose-500"
          iconBg="bg-rose-50 text-rose-600"
        />
        <KPICard
          title="Gross Profit"
          value={formatCurrency(kpis?.grossProfit || 0)}
          subtitle="Revenue - COGS"
          icon={<TrendingUp />}
          borderAccent="border-l-4 border-teal-500"
          iconBg="bg-teal-50 text-teal-600"
        />
        <KPICard
          title="Net Profit"
          value={formatCurrency(kpis?.netProfit || 0)}
          subtitle="Final profit"
          icon={<Activity />}
          borderAccent="border-l-4 border-primary-600"
          iconBg="bg-primary-50 text-primary-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Enhanced Revenue Chart */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded p-3 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 mb-3 border-b border-gray-200 gap-2">
            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-0.5">
                Revenue Analytics
              </h3>
              <p className="text-[10px] text-gray-500">
                Track your sales performance over time
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-50 border border-gray-300 rounded p-0.5 w-36">
                <button
                  onClick={() => setChartType('area')}
                  className={`flex-1 py-0.5 text-center text-[10px] font-bold rounded-sm transition-all ${
                    chartType === 'area'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Area
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`flex-1 py-0.5 text-center text-[10px] font-bold rounded-sm transition-all ${
                    chartType === 'bar'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Bar
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`flex-1 py-0.5 text-center text-[10px] font-bold rounded-sm transition-all ${
                    chartType === 'line'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Line
                </button>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            {chartType === 'area' ? (
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#714B67" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#714B67" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    'Revenue',
                  ]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #ced4da',
                    borderRadius: '2px',
                    fontSize: '11px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#714B67"
                  strokeWidth={1.5}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            ) : chartType === 'bar' ? (
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    'Revenue',
                  ]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #ced4da',
                    borderRadius: '2px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="revenue" fill="#017e84" radius={[0, 0, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    'Revenue',
                  ]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #ced4da',
                    borderRadius: '2px',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#714B67"
                  strokeWidth={2}
                  dot={{ fill: '#714B67', strokeWidth: 1, r: 2.5 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Enhanced Profit Breakdown */}
        <div className="bg-white border border-gray-200 rounded p-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-200">
            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-0.5">
                Profit Analysis
              </h3>
              <p className="text-[10px] text-gray-500">Financial breakdown</p>
            </div>
            <PieChartIcon className="h-4 w-4 text-gray-400" />
          </div>

          <div className="space-y-2">
            <div className="relative">
              <div className="flex items-center justify-between p-2 bg-gray-50/50 rounded-sm border border-gray-200 border-l-4 border-teal-500">
                <div className="flex items-center min-w-0">
                  <div className="w-2 h-2 bg-teal-500 rounded-full mr-2 flex-shrink-0"></div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-gray-800 block truncate">
                      Gross Profit
                    </span>
                    <p className="text-[8px] text-gray-400 leading-none">Revenue - COGS</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-teal-600 flex-shrink-0 ml-1">
                  {formatCurrency(kpis?.grossProfit || 0)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-gray-50/50 rounded-sm border border-gray-200 border-l-4 border-red-500">
              <div className="flex items-center min-w-0">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2 flex-shrink-0"></div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-gray-800 block truncate">
                    Expenses
                  </span>
                  <p className="text-[8px] text-gray-400 leading-none">Operating costs</p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-red-650 flex-shrink-0 ml-1">
                -{formatCurrency(kpis?.totalExpenses || 0)}
              </span>
            </div>

            <div className="border-t border-gray-150 pt-2">
              <div className="flex items-center justify-between p-2 bg-gray-50/50 rounded-sm border border-gray-200 border-l-4 border-primary-600">
                <div className="flex items-center min-w-0">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mr-2 flex-shrink-0 animate-pulse"></div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-gray-800 block truncate">
                      Net Profit
                    </span>
                    <p className="text-[8px] text-gray-400 leading-none">Final earnings</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-primary-650 flex-shrink-0 ml-1">
                  {formatCurrency(kpis?.netProfit || 0)}
                </span>
              </div>
            </div>

            {/* Profit Margin */}
            <div className="mt-2 p-2 bg-gray-50 rounded-sm border border-gray-200">
              <div className="flex justify-between items-center mb-1 text-[10px] font-bold">
                <span className="text-gray-550 uppercase tracking-wider">Profit Margin</span>
                <span className="text-gray-800">
                  {(
                    ((kpis?.netProfit || 0) / (kpis?.totalRevenue || 1)) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-sm h-1 overflow-hidden">
                <div
                  className="bg-primary-600 h-1 transition-all duration-500"
                  style={{
                    width: `${Math.min(((kpis?.netProfit || 0) / (kpis?.totalRevenue || 1)) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {/* Enhanced Top Products */}
        <div className="bg-white border border-gray-200 rounded p-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-200">
            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-0.5">
                Top Products
              </h3>
              <p className="text-[10px] text-gray-500">Best performing items</p>
            </div>
            <div className="flex items-center">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-gray-700">
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={topProducts.slice(0, 5)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" stroke="#64748b" fontSize={10} />
              <YAxis
                dataKey="productName"
                type="category"
                stroke="#64748b"
                fontSize={10}
                width={85}
              />
              <Tooltip
                formatter={(value) => [
                  formatCurrency(Number(value)),
                  'Revenue',
                ]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #ced4da',
                  borderRadius: '2px',
                  fontSize: '11px',
                }}
              />
              <Bar
                dataKey="totalRevenue"
                fill="#017e84"
                radius={[0, 0, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Enhanced Top Customers */}
        <div className="bg-white border border-gray-200 rounded p-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-200">
            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-0.5">
                Top Customers
              </h3>
              <p className="text-[10px] text-gray-500">Highest value clients</p>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-gray-700">
              <Users className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-2">
            {topCustomers.slice(0, 5).map((customer, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50/50 rounded-sm border border-gray-200 hover:bg-gray-100/55 transition-colors"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div 
                      className="w-8 h-8 rounded bg-primary-600 text-white font-bold text-xs mr-2.5 flex items-center justify-center"
                      style={{ backgroundColor: index % 2 === 0 ? '#714B67' : '#017E84' }}
                    >
                      {customer.customerName.charAt(0)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-gray-800 truncate">
                      {customer.customerName}
                    </div>
                    <div className="text-[9px] text-gray-400 font-semibold leading-none">
                      {customer.customerCode}
                    </div>
                  </div>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <div className="font-extrabold text-gray-800 text-[11px]">
                    {formatCurrency(customer.totalRevenue)}
                  </div>
                  <div className="text-[9px] text-gray-400 font-semibold">
                    {formatNumber(customer.totalOrders)} orders
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* New Performance Metrics */}
        <div className="bg-white border border-gray-200 rounded p-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-200">
            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-0.5">
                Performance
              </h3>
              <p className="text-[10px] text-gray-500">Key indicators</p>
            </div>
            <Activity className="h-4 w-4 text-gray-400" />
          </div>

          <div className="space-y-2.5">
            {/* Inventory Turnover */}
            <div className="p-2 bg-gray-50/50 rounded-sm border border-gray-200 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-gray-700">
                  Inventory Turnover
                </span>
                <span className="text-xs font-black text-blue-600">0.0x</span>
              </div>
              <div className="w-full bg-gray-200 rounded-sm h-1 overflow-hidden">
                <div
                  className="bg-blue-500 h-1 transition-all duration-500"
                  style={{ width: '0%' }}
                ></div>
              </div>
              <p className="text-[8px] font-semibold text-blue-600 mt-1">0% vs last period</p>
            </div>

            {/* Average Order Value */}
            <div className="p-2 bg-gray-50/50 rounded-sm border border-gray-200 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-gray-700">
                  Avg Order Value
                </span>
                <span className="text-xs font-black text-green-600">
                  {formatCurrency(0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-sm h-1 overflow-hidden">
                <div
                  className="bg-green-500 h-1 transition-all duration-500"
                  style={{ width: '0%' }}
                ></div>
              </div>
              <p className="text-[8px] font-semibold text-green-600 mt-1">0% vs last period</p>
            </div>

            {/* Customer Retention */}
            <div className="p-2 bg-gray-50/50 rounded-sm border border-gray-200 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-gray-700">
                  Customer Retention
                </span>
                <span className="text-xs font-black text-purple-600">0%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-sm h-1 overflow-hidden">
                <div
                  className="bg-purple-500 h-1 transition-all duration-500"
                  style={{ width: '0%' }}
                ></div>
              </div>
              <p className="text-[8px] font-semibold text-purple-600 mt-1">0% vs last period</p>
            </div>

            {/* Stock Alerts */}
            <div className="p-2 bg-gray-50/50 rounded-sm border border-gray-200 border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-gray-700">
                  Low Stock Items
                </span>
                <span className="text-xs font-black text-orange-600">0</span>
              </div>
              <div className="flex items-center">
                <AlertTriangle className="h-3 w-3 text-orange-500 mr-1.5 flex-shrink-0" />
                <p className="text-[9px] font-semibold text-orange-600">All items in stock</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
