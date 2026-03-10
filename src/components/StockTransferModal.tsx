import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import Select from './Select';
import { StockBatch } from '@/types';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: StockBatch | null;
  locations: Array<{ id: string; name: string }>;
  onTransfer: (data: {
    stockBatchId: number;
    toLocationId: number;
    boxes: number;
    packs: number;
    pieces: number;
    remarks?: string;
  }) => Promise<void>;
}

const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  batch,
  locations,
  onTransfer,
}) => {
  const [toLocationId, setToLocationId] = useState('');
  const [boxes, setBoxes] = useState(0);
  const [packs, setPacks] = useState(0);
  const [pieces, setPieces] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !batch) return null;

  const availableLocations = locations.filter(
    (loc) => loc.id !== batch.location?.id?.toString()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toLocationId) return;

    setLoading(true);
    try {
      await onTransfer({
        stockBatchId: parseInt(batch.id.toString()),
        toLocationId: parseInt(toLocationId),
        boxes,
        packs,
        pieces,
        remarks,
      });
      onClose();
      setToLocationId('');
      setBoxes(0);
      setPacks(0);
      setPieces(0);
      setRemarks('');
    } catch (error) {
      console.error('Transfer failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Transfer Stock</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">From Location:</span>
              <span className="font-medium">{batch.location?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Available:</span>
              <span className="font-medium">
                {batch.remainingBoxes} boxes, {batch.remainingPacks || 0} packs, {batch.remainingPcs} pcs
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Location <span className="text-red-500">*</span>
            </label>
            <Select
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              options={[
                { value: '', label: 'Select Location' },
                ...availableLocations.map((loc) => ({
                  value: loc.id,
                  label: loc.name,
                })),
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Boxes
              </label>
              <input
                type="number"
                min="0"
                max={batch.remainingBoxes}
                value={boxes}
                onChange={(e) => setBoxes(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Packs
              </label>
              <input
                type="number"
                min="0"
                max={batch.remainingPacks || 0}
                value={packs}
                onChange={(e) => setPacks(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pieces
              </label>
              <input
                type="number"
                min="0"
                max={batch.remainingPcs}
                value={pieces}
                onChange={(e) => setPieces(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!toLocationId || (boxes === 0 && packs === 0 && pieces === 0) || loading}
              className="flex-1"
            >
              {loading ? 'Transferring...' : 'Transfer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockTransferModal;
