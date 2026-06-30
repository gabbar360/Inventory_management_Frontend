import React, { useEffect, useState } from 'react';
import { inventoryService } from '@/services/inventoryService';
import { StockBatch } from '@/types';
import { formatDate } from '@/utils';

interface Props {
  productId: string | number;
}

const StockAvailabilityPanel: React.FC<Props> = ({ productId }) => {
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId || productId === '0' || productId === 0) {
      setBatches([]);
      return;
    }
    setLoading(true);
    inventoryService
      .getAvailableStock(productId.toString())
      .then(setBatches)
      .catch(() => setBatches([]))
      .finally(() => setLoading(false));
  }, [productId]);

  if (!productId || productId === '0' || productId === 0) return null;
  if (loading) return <div className="text-[10px] text-gray-400 mt-1">Loading stock...</div>;
  if (batches.length === 0)
    return <div className="text-[10px] text-red-500 mt-1 font-medium">⚠️ No stock available</div>;

  return (
    <div className="mt-1.5 border border-blue-200 rounded bg-blue-50 text-[10px]">
      {/* Batch wise rows */}
      <div className="divide-y divide-blue-100">
        {batches.map((batch) => (
          <div key={batch.id} className="px-2 py-1.5">
            <div className="font-medium text-[10px] text-gray-800">
              [{(batch.location as any)?.name || batch.locationId}] {(batch.vendor as any)?.name || '—'} – {formatDate(batch.inwardDate)}
            </div>
            {/* Stock quantities */}
            <div className="text-[9px] text-gray-500 mt-0.5">
              {batch.remainingBoxes} boxes, {batch.packPerBox} pack/box, {batch.remainingPacks ?? 0} packs, {batch.packPerPiece} pcs/pack, {batch.remainingPcs} pcs
              {batch.batchCode ? <span className="ml-2 text-blue-600 font-medium">#{batch.batchCode}</span> : null}
            </div>
            {/* Cost prices */}
            <div className="text-[9px] text-emerald-700 font-semibold mt-0.5 flex flex-wrap gap-x-3">
              {Number(batch.costPerBox) > 0 && (
                <span>Box: ₹{Number(batch.costPerBox).toFixed(2)}</span>
              )}
              {Number(batch.costPerPack) > 0 && (
                <span>Pack: ₹{Number(batch.costPerPack).toFixed(2)}</span>
              )}
              {Number(batch.costPerPcs) > 0 && (
                <span>Pcs: ₹{Number(batch.costPerPcs).toFixed(2)}</span>
              )}
              {Number(batch.costPerBox) === 0 && Number(batch.costPerPack) === 0 && Number(batch.costPerPcs) === 0 && (
                <span className="text-gray-400 font-normal">No cost price set</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StockAvailabilityPanel;
