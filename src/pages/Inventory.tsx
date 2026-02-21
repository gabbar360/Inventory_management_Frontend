import React, { useState, useEffect } from 'react';
import {
  Package,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Calendar,
  User,
  Archive,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchStockSummary,
  fetchAvailableStock,
  clearAvailableStock,
} from '@/slices/inventorySlice';
import { fetchLocations } from '@/slices/locationSlice';
import { StockBatch, StockSummary } from '@/types';
import { formatCurrency, formatNumber } from '@/utils';
import Button from '@/components/Button';
import Select from '@/components/Select';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';

const Inventory: React.FC = () => {
  const dispatch = useAppDispatch();
  const { stockSummary, availableStock, loading } = useAppSelector(
    (state) => state.inventory
  );
  const { locations } = useAppSelector((state) => state.locations);

  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [viewMode, setViewMode] = useState<'summary' | 'batches'>('summary');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, [selectedLocation]);

  const loadData = async () => {
    dispatch(fetchStockSummary(selectedLocation || undefined));
    dispatch(fetchLocations({ limit: 100 }));
  };

  const loadBatches = async (productId: string) => {
    dispatch(
      fetchAvailableStock({
        productId,
        locationId: selectedLocation || undefined,
      })
    );
    setSelectedProduct(productId);
    setViewMode('batches');
    setCurrentPage(1);
  };

  const locationOptions = [
    { value: '', label: 'All Locations' },
    ...locations.map((loc) => ({
      value: loc.id,
      label: loc.name,
    })),
  ];

  const totalStockValue = stockSummary.reduce(
    (sum, item) => sum + item.totalValue,
    0
  );
  const totalProducts = stockSummary.length;
  const lowStockItems = stockSummary.filter((item) => item.totalPcs < 100); // Assuming low stock threshold

  const summaryColumns = [
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
      key: 'totalPacks',
      title: 'Packs',
      render: (_: any, record: StockSummary) =>
        formatNumber(record.totalPacks || 0),
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
                {formatNumber(loc.boxes)} boxes, {formatNumber(loc.packs || 0)}{' '}
                packs, {formatNumber(loc.pcs)} pcs
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
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: StockSummary) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadBatches(record.productId)}
        >
          View Batches
        </Button>
      ),
    },
  ];

  const batchColumns = [
    {
      key: 'inwardDate',
      title: 'Batch Date',
      render: (value: string) => (
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
          {new Date(value).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'vendor',
      title: 'Vendor',
      render: (vendor: any) => (
        <div className="flex items-center">
          <User className="w-4 h-4 mr-2 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">
              {vendor?.name || 'N/A'}
            </div>
            <div className="text-sm text-gray-500">{vendor?.code || ''}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      title: 'Location',
      render: (location: any) => (
        <div className="flex items-center">
          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
          {location?.name || 'N/A'}
        </div>
      ),
    },
    {
      key: 'remainingBoxes',
      title: 'Remaining Stock',
      render: (_: any, record: StockBatch) => (
        <div>
          <div className="font-medium text-gray-900">
            {formatNumber(record.remainingBoxes)} boxes
          </div>
          <div className="text-sm text-gray-500">
            {formatNumber(record.remainingPacks || 0)} packs
          </div>
          <div className="text-sm text-gray-500">
            {formatNumber(record.remainingPcs)} pieces
          </div>
        </div>
      ),
    },
    {
      key: 'costPerBox',
      title: 'Cost/Box',
      render: (value: number) => formatCurrency(value),
    },
    {
      key: 'costPerPack',
      title: 'Cost/Pack',
      render: (_: any, record: StockBatch) => {
        const costPerPack =
          record.costPerPack ||
          record.costPerBox / (record.packPerBox || record.pcsPerBox || 1);
        return formatCurrency(costPerPack);
      },
    },
    {
      key: 'costPerPcs',
      title: 'Cost/Piece',
      render: (value: number) => formatCurrency(value),
    },
    {
      key: 'totalValue',
      title: 'Batch Value',
      render: (_: any, record: StockBatch) => {
        // Calculate total value based on remaining stock only
        const totalRemainingPcs = record.remainingPcs;
        const totalValue = totalRemainingPcs * record.costPerPcs;
        return formatCurrency(totalValue);
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventory</h1>
            {viewMode === 'batches' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setViewMode('summary');
                  setSelectedProduct('');
                  dispatch(clearAvailableStock());
                }}
              >
                ← Back to Summary
              </Button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('summary')}
                className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-sm transition-colors ${
                  viewMode === 'summary'
                    ? 'bg-white shadow-sm text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setViewMode('batches')}
                className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-sm transition-colors ${
                  viewMode === 'batches'
                    ? 'bg-white shadow-sm text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                disabled={!selectedProduct}
              >
                Batches
              </button>
            </div>
            <Select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              options={locationOptions}
              className="w-full sm:w-48"
            />
            <Button onClick={loadData} className="w-full sm:w-auto">Refresh</Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center min-w-0">
            <div className="flex-shrink-0 p-2 sm:p-3 rounded-lg bg-blue-500">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                Total Products
              </p>
              <p className="text-lg sm:text-2xl font-semibold text-gray-900 break-words">
                {totalProducts}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center min-w-0">
            <div className="flex-shrink-0 p-2 sm:p-3 rounded-lg bg-green-500">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-lg sm:text-2xl font-semibold text-gray-900 break-words">
                {formatCurrency(totalStockValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center min-w-0">
            <div className="flex-shrink-0 p-2 sm:p-3 rounded-lg bg-red-500">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                Low Stock Items
              </p>
              <p className="text-lg sm:text-2xl font-semibold text-gray-900 break-words">
                {lowStockItems.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Summary Table */}
      {viewMode === 'summary' && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Stock Summary
              {selectedLocation && (
                <span className="ml-2 text-xs sm:text-sm font-normal text-gray-500">
                  - {locations.find((l) => l.id === selectedLocation)?.name}
                </span>
              )}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table
            data={stockSummary}
            columns={summaryColumns}
            loading={loading}
            emptyMessage="No stock available"
          />
          </div>
        </div>
      )}

      {/* Stock Batches Table */}
      {viewMode === 'batches' && (
        <>
          {/* Batch Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
            <div className="stat-card">
              <div className="flex items-center min-w-0">
                <div className="flex-shrink-0 p-2 sm:p-3 rounded-lg bg-blue-500">
                  <Archive className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">
                    Total Batches
                  </p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900 break-words">
                    {availableStock.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center min-w-0">
                <div className="flex-shrink-0 p-2 sm:p-3 rounded-lg bg-green-500">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">
                    Total Boxes
                  </p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900 break-words">
                    {formatNumber(
                      availableStock.reduce(
                        (sum, batch) => sum + batch.remainingBoxes,
                        0
                      )
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center min-w-0">
                <div className="flex-shrink-0 p-2 sm:p-3 rounded-lg bg-purple-500">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">
                    Total Packs
                  </p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900 break-words">
                    {formatNumber(
                      availableStock.reduce(
                        (sum, batch) => sum + (batch.remainingPacks || 0),
                        0
                      )
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center min-w-0">
                <div className="flex-shrink-0 p-2 sm:p-3 rounded-lg bg-indigo-500">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">
                    Total Pieces
                  </p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900 break-words">
                    {formatNumber(
                      availableStock.reduce(
                        (sum, batch) => sum + batch.remainingPcs,
                        0
                      )
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center min-w-0">
                <div className="flex-shrink-0 p-2 sm:p-3 rounded-lg bg-orange-500">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">
                    Total Value
                  </p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900 break-words">
                    {formatCurrency(
                      availableStock.reduce((sum, batch) => {
                        const batchValue =
                          batch.remainingPcs * batch.costPerPcs;
                        return sum + batchValue;
                      }, 0)
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    Stock Batches
                    {selectedProduct && (
                      <span className="ml-2 text-xs sm:text-sm font-normal text-gray-500">
                        -{' '}
                        {
                          stockSummary.find(
                            (s) => s.productId === selectedProduct
                          )?.productName
                        }
                      </span>
                    )}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Showing batch-wise inventory details (FIFO order)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <span className="text-xs sm:text-sm text-gray-600">
                    {availableStock.length} batches
                  </span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table
              data={availableStock.slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage
              )}
              columns={batchColumns}
              loading={loading}
              emptyMessage="No batches available for this product"
            />
            </div>
            {availableStock.length > itemsPerPage && (
              <div className="card-footer">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(availableStock.length / itemsPerPage)}
                  total={availableStock.length}
                  limit={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="card border-red-200">
          <div className="card-header bg-red-50">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mr-2" />
              <h3 className="text-base sm:text-lg font-semibold text-red-900">
                Low Stock Alert ({lowStockItems.length} items)
              </h3>
            </div>
          </div>
          <div className="card-content">
            <div className="space-y-2">
              {lowStockItems.slice(0, 5).map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-b border-gray-200 last:border-0"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-gray-900 text-sm sm:text-base">
                      {item.productName}
                    </span>
                    <span className="ml-2 text-xs sm:text-sm text-gray-500">
                      ({item.categoryName})
                    </span>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <div className="text-xs sm:text-sm font-medium text-red-600">
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
