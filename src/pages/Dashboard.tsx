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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  ShoppingCart,
  Users,
  AlertTriangle,
  Activity,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  RefreshCw,
  Eye,
  BarChart3,
  PieChart as PieChartIcon,
  Settings,
  MapPin,
  Building,
  Truck,
} from 'lucide-react';
import { dashboardService } from '@/services/dashboardService';
import { formatCurrency, formatNumber } from '@/utils';
import Button from '@/components/Button';
import Select from '@/components/Select';
import Input from '@/components/Input';
import { locationService } from '@/services/locationService';
import { categoryService } from '@/services/categoryService';
import { vendorService } from '@/services/vendorService';
import { customerService } from '@/services/customerService';

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, change, icon, color, trend, subtitle }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow overflow-hidden">
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
          {React.cloneElement(icon as React.ReactElement, { className: 'h-6 w-6 text-white' })}
        </div>
        {change !== undefined && (
          <div className="flex items-center flex-shrink-0">
            {trend === 'up' ? (
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
            ) : trend === 'down' ? (
              <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
            ) : (
              <Activity className="h-4 w-4 text-gray-500 mr-1" />
            )}
            <span className={`text-sm font-semibold ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {change}%
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 mb-1 truncate">{title}</p>
        <p className="text-xl font-bold text-gray-900 mb-1 break-words leading-tight">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [kpis, setKpis] = useState<any>(null);
  const [revenueChart, setRevenueChart] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [refreshing, setRefreshing] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
    loadMasterData();
  }, [period, filters]);

  const loadMasterData = async () => {
    try {
      const [locationsData, categoriesData, vendorsData, customersData] = await Promise.all([
        locationService.getAll({ limit: 100 }).catch(() => ({ data: [] })),
        categoryService.getAll({ limit: 100 }).catch(() => ({ data: [] })),
        vendorService.getAll({ limit: 100 }).catch(() => ({ data: [] })),
        customerService.getAll({ limit: 100 }).catch(() => ({ data: [] })),
      ]);
      setLocations(locationsData.data || []);
      setCategories(categoriesData.data || []);
      setVendors(vendorsData.data || []);
      setCustomers(customersData.data || []);
    } catch (error) {
      console.error('Failed to load master data:', error);
      setLocations([]);
      setCategories([]);
      setVendors([]);
      setCustomers([]);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        period,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const [kpisData, chartData, productsData, customersData, performanceData] = await Promise.all([
        dashboardService.getKPIs(period),
        dashboardService.getRevenueChart(period),
        dashboardService.getTopProducts(10),
        dashboardService.getTopCustomers(10),
        dashboardService.getPerformanceMetrics(period),
      ]);

      console.log('KPIs Data:', kpisData); // Debug log
      setKpis(kpisData);
      setRevenueChart(chartData);
      setTopProducts(productsData);
      setTopCustomers(customersData);
      setPerformanceMetrics(performanceData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = async () => {
    await loadDashboardData();
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      category: '',
      vendor: '',
      customer: '',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
    });
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getTrendDirection = (trend: number) => {
    if (trend > 0) return 'up';
    if (trend < 0) return 'down';
    return 'neutral';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4 lg:p-6">
        <div className="animate-pulse">
          {/* Header Skeleton */}
          <div className="mb-6 lg:mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="h-6 sm:h-8 lg:h-10 bg-gray-200 rounded w-64 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-96"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
                <div className="h-8 w-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
          
          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-24 sm:h-32 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
          
          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 lg:mb-8">
            <div className="xl:col-span-2 h-80 bg-gray-200 rounded-2xl"></div>
            <div className="h-80 bg-gray-200 rounded-2xl"></div>
          </div>
          
          {/* Bottom Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            <div className="h-80 bg-gray-200 rounded-2xl"></div>
            <div className="h-80 bg-gray-200 rounded-2xl"></div>
            <div className="h-80 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4 lg:p-6">
      {/* Advanced Header */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1">
              Analytics Dashboard
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Real-time insights into your inventory performance
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            
            <div className="flex bg-white rounded-lg p-1 shadow-sm border">
              {(['week', 'month', 'year'] as const).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                  className={`text-xs sm:text-sm ${period === p ? 'shadow-sm' : ''}`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 animate-in slide-in-from-top duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">Advanced Filters</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
                <Button size="sm" onClick={applyFilters}>Apply Filters</Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              <Select
                label="Location"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                options={[
                  { value: '', label: 'All Locations' },
                  ...locations.map(l => ({ value: l.id, label: l.name }))
                ]}
              />
              
              <Select
                label="Category"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.map(c => ({ value: c.id, label: c.name }))
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
              
              <Input
                label="Min Amount"
                type="number"
                placeholder="₹0"
                value={filters.minAmount}
                onChange={(e) => handleFilterChange('minAmount', e.target.value)}
              />
              
              <Input
                label="Max Amount"
                type="number"
                placeholder="₹999999"
                value={filters.maxAmount}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-6 mb-8">
        <KPICard
          title="Stock Value"
          value={formatCurrency(kpis?.totalStockValue || 0)}
          subtitle="Current inventory"
          icon={<Package />}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
          trend="up"
          change={12.5}
        />
        <KPICard
          title="Revenue"
          value={formatCurrency(kpis?.totalRevenue || 0)}
          subtitle="Total sales"
          icon={<DollarSign />}
          color="bg-gradient-to-r from-green-500 to-green-600"
          trend="up"
          change={8.3}
        />
        <KPICard
          title="Purchase"
          value={formatCurrency(kpis?.totalPurchase || 0)}
          subtitle="Procurement"
          icon={<ShoppingCart />}
          color="bg-gradient-to-r from-orange-500 to-orange-600"
          trend="neutral"
          change={2.1}
        />
        <KPICard
          title="COGS"
          value={formatCurrency(kpis?.totalCOGS || 0)}
          subtitle="Cost of goods"
          icon={<Target />}
          color="bg-gradient-to-r from-red-500 to-red-600"
          trend="down"
          change={3.2}
        />
        <KPICard
          title="Expenses"
          value={formatCurrency(kpis?.totalExpenses || 0)}
          subtitle="Operating costs"
          icon={<AlertTriangle />}
          color="bg-gradient-to-r from-yellow-500 to-yellow-600"
          trend="down"
          change={1.8}
        />
        <KPICard
          title="Gross Profit"
          value={formatCurrency(kpis?.grossProfit || 0)}
          subtitle="Revenue - COGS"
          icon={<TrendingUp />}
          color="bg-gradient-to-r from-purple-500 to-purple-600"
          trend="up"
          change={15.7}
        />
        <KPICard
          title="Net Profit"
          value={formatCurrency(kpis?.netProfit || 0)}
          subtitle="Final profit"
          icon={<Activity />}
          color="bg-gradient-to-r from-indigo-500 to-indigo-600"
          trend="up"
          change={11.4}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Enhanced Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Revenue Analytics</h3>
              <p className="text-sm text-gray-600">Track your sales performance over time</p>
            </div>
            <div className="flex items-center gap-2 mt-3 sm:mt-0">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setChartType('area')}
                  className={`p-2 rounded-md transition-colors ${
                    chartType === 'area' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`p-2 rounded-md transition-colors ${
                    chartType === 'bar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`p-2 rounded-md transition-colors ${
                    chartType === 'line' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'area' ? (
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            ) : chartType === 'bar' ? (
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Enhanced Profit Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Profit Analysis</h3>
              <p className="text-sm text-gray-600">Financial breakdown</p>
            </div>
            <PieChartIcon className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Gross Profit</span>
                    <p className="text-xs text-green-600">Revenue - COGS</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(kpis?.grossProfit || 0)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border border-red-200">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Expenses</span>
                  <p className="text-xs text-red-600">Operating costs</p>
                </div>
              </div>
              <span className="text-lg font-bold text-red-600">
                -{formatCurrency(kpis?.totalExpenses || 0)}
              </span>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-indigo-500 rounded-full mr-3 animate-pulse"></div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Net Profit</span>
                    <p className="text-xs text-indigo-600">Final earnings</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-indigo-600">
                  {formatCurrency(kpis?.netProfit || 0)}
                </span>
              </div>
            </div>
            
            {/* Profit Margin */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Profit Margin</span>
                <span className="text-sm font-semibold text-gray-900">
                  {((kpis?.netProfit || 0) / (kpis?.totalRevenue || 1) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(((kpis?.netProfit || 0) / (kpis?.totalRevenue || 1) * 100), 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Enhanced Top Products */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Top Products</h3>
              <p className="text-sm text-gray-600">Best performing items</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topProducts.slice(0, 5)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" stroke="#64748b" fontSize={11} />
              <YAxis dataKey="productName" type="category" stroke="#64748b" fontSize={11} width={80} />
              <Tooltip 
                formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }}
              />
              <Bar dataKey="totalRevenue" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Enhanced Top Customers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Top Customers</h3>
              <p className="text-sm text-gray-600">Highest value clients</p>
            </div>
            <Button variant="ghost" size="sm">
              <Users className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            {topCustomers.slice(0, 6).map((customer, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200 group">
                <div className="flex items-center flex-1 min-w-0">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3 group-hover:scale-110 transition-transform">
                      {customer.customerName.charAt(0)}
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-xs text-white font-bold">#{index + 1}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{customer.customerName}</div>
                    <div className="text-sm text-gray-500 truncate">{customer.customerCode}</div>
                  </div>
                </div>
                <div className="text-right ml-3">
                  <div className="font-bold text-gray-900 text-sm">{formatCurrency(customer.totalRevenue)}</div>
                  <div className="text-xs text-gray-500">{formatNumber(customer.totalOrders)} orders</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* New Performance Metrics */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Performance</h3>
              <p className="text-sm text-gray-600">Key indicators</p>
            </div>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {/* Inventory Turnover */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Inventory Turnover</span>
                <span className="text-lg font-bold text-blue-600">
                  {performanceMetrics?.inventoryTurnover?.toFixed(1) || '0.0'}x
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((performanceMetrics?.inventoryTurnover || 0) * 20, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {performanceMetrics?.inventoryTurnoverTrend > 0 ? '+' : ''}
                {performanceMetrics?.inventoryTurnoverTrend?.toFixed(1) || '0'}% vs last period
              </p>
            </div>
            
            {/* Average Order Value */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Avg Order Value</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(performanceMetrics?.avgOrderValue || 0)}
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((performanceMetrics?.avgOrderValue || 0) / 1000, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-green-600 mt-1">
                {performanceMetrics?.avgOrderValueTrend > 0 ? '+' : ''}
                {performanceMetrics?.avgOrderValueTrend?.toFixed(1) || '0'}% vs last period
              </p>
            </div>
            
            {/* Customer Retention */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Customer Retention</span>
                <span className="text-lg font-bold text-purple-600">
                  {performanceMetrics?.customerRetention?.toFixed(0) || '0'}%
                </span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${performanceMetrics?.customerRetention || 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-purple-600 mt-1">
                {performanceMetrics?.customerRetentionTrend > 0 ? '+' : ''}
                {performanceMetrics?.customerRetentionTrend?.toFixed(1) || '0'}% vs last period
              </p>
            </div>
            
            {/* Stock Alerts */}
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Low Stock Items</span>
                <span className="text-lg font-bold text-orange-600">
                  {performanceMetrics?.lowStockCount || 0}
                </span>
              </div>
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                <p className="text-xs text-orange-600">
                  {performanceMetrics?.lowStockCount > 0 ? 'Requires attention' : 'All items in stock'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;