import React, { useState, useEffect } from 'react';
import { Package, MapPin, TrendingUp, AlertTriangle } from 'lucide-react';
import { inventoryService, StockSummary } from '@/services/inventoryService';
import { locationService } from '@/services/locationService';
import { Location } from '@/types';
import { formatCurrency, formatNumber } from '@/utils';
import Button from '@/components/Button';
import Select from '@/components/Select';
import Table from '@/components/Table';

const Inventory: React.FC = () => {
  const [stockSummary, setStockSummary] = useState<StockSummary[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedLocation]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stockData, locationsData] = await Promise.all([
        inventoryService.getStockSummary(selectedLocation || undefined),
        locationService.getAll({ limit: 100 }),
      ]);
      setStockSummary(stockData);
      setLocations(locationsData.data);
    } catch (error) {
      console.error('Failed to load inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const locationOptions = [
    { value: '', label: 'All Locations' },
    ...locations.map((loc) => ({
      value: loc.id,
      label: loc.name,
    })),
  ];

  const totalStockValue = stockSummary.reduce((sum, item) => sum + item.totalValue, 0);
  const totalProducts = stockSummary.length;
  const lowStockItems = stockSummary.filter(item => item.totalPcs < 100); // Assuming low stock threshold

  const columns = [
    {
      key: 'productName',
      title: 'Product',
      sortable: true,
      render: (value: string, record: StockSummary) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{record.categoryName}</div>
        </div>
      ),
    },
    {
      key: 'totalBoxes',
      title: 'Boxes',
      render: (value: number) => formatNumber(value),
    },
    {
      key: 'totalPcs',
      title: 'Pieces',
      render: (value: number) => formatNumber(value),
    },
    {
      key: 'totalValue',
      title: 'Value',
      render: (value: number) => formatCurrency(value),
    },
    {
      key: 'locations',
      title: 'Locations',
      render: (locations: any[]) => (
        <div className="space-y-1">
          {locations.map((loc, index) => (
            <div key={index} className="text-sm">
              <span className="font-medium">{loc.locationName}:</span>
              <span className="ml-1 text-gray-600">
                {formatNumber(loc.boxes)} boxes, {formatNumber(loc.pcs)} pcs
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (_: any, record: StockSummary) => {
        const isLowStock = record.totalPcs < 100;
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isLowStock
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {isLowStock ? (
              <>
                <AlertTriangle className="w-3 h-3 mr-1" />
                Low Stock
              </>
            ) : (
              <>
                <Package className="w-3 h-3 mr-1" />
                In Stock
              </>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <div className="flex items-center space-x-4">
          <Select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            options={locationOptions}
            className="w-48"
          />
          <Button onClick={loadData}>Refresh</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-lg bg-blue-500">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900">{totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-lg bg-green-500">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(totalStockValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-lg bg-red-500">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-semibold text-gray-900">{lowStockItems.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Summary Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Stock Summary
            {selectedLocation && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                - {locations.find(l => l.id === selectedLocation)?.name}
              </span>
            )}
          </h3>
        </div>
        <Table
          data={stockSummary}
          columns={columns}
          loading={loading}
          emptyMessage="No stock available"
        />
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="card border-red-200">
          <div className="card-header bg-red-50">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-red-900">
                Low Stock Alert ({lowStockItems.length} items)
              </h3>
            </div>
          </div>
          <div className="card-content">
            <div className="space-y-2">
              {lowStockItems.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                  <div>
                    <span className="font-medium text-gray-900">{item.productName}</span>
                    <span className="ml-2 text-sm text-gray-500">({item.categoryName})</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-red-600">
                      {formatNumber(item.totalPcs)} pieces remaining
                    </div>
                    <div className="text-xs text-gray-500">
                      Value: {formatCurrency(item.totalValue)}
                    </div>
                  </div>
                </div>
              ))}
              {lowStockItems.length > 5 && (
                <div className="text-center py-2">
                  <span className="text-sm text-gray-500">
                    ... and {lowStockItems.length - 5} more items
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;