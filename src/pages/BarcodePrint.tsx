import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchBarcodesForPrint, clearBoxes } from '@/slices/barcodeSlice';
import BarcodeImage from '@/components/BarcodeImage';
import Button from '@/components/Button';
import { formatDate } from '@/utils';

export const BarcodePrint: React.FC = () => {
  const { source, id } = useParams<{ source: string; id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { boxes, loading, error } = useAppSelector((state) => state.barcodes);

  useEffect(() => {
    if (source && id) {
      dispatch(fetchBarcodesForPrint({ source, id }));
    }

    return () => {
      dispatch(clearBoxes());
    };
  }, [source, id, dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-3"></div>
          <p className="text-xs font-semibold text-gray-500">Loading barcode details...</p>
        </div>
      </div>
    );
  }

  if (boxes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white border border-gray-200 rounded p-6 max-w-sm w-full text-center shadow-md">
          <p className="text-xs text-gray-500 mb-4">No boxes found or generated for this {source?.toUpperCase() || 'document'}.</p>
          <Button onClick={() => navigate(-1)} className="w-full text-xs font-semibold">
            <ArrowLeft className="h-4 w-4 mr-1 inline" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100/50 p-4 print:bg-white print:p-0 flex flex-col items-center">
      {/* Control Bar */}
      <div className="no-print bg-white border-2 border-black rounded px-4 py-3 flex items-center justify-between shadow-sm mb-4 w-full max-w-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
            title="Go Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-black text-gray-800 uppercase tracking-wide">Print Box Labels</h1>
            <p className="text-[11px] text-gray-500 font-bold">{boxes.length} Labels</p>
          </div>
        </div>
        <Button onClick={handlePrint} className="odoo-btn-primary h-8 px-4 text-xs font-semibold">
          <Printer className="h-3.5 w-3.5 mr-1" /> Print
        </Button>
      </div>

      {/* Labels - Fixed Width Container */}
      <div className="space-y-2 print:space-y-0 w-full max-w-2xl print:max-w-full print:p-0" style={{ width: '100%', maxWidth: '105mm' }}>
        {boxes.map((box) => {
          const batchCode = box.batchCode || box.stockBatch?.batchCode || '—';
          const mfgDate = box.mfgDate || box.stockBatch?.mfgDate;
          const productName = box.product?.name || 'N/A';

          return (
            <div
              key={box.id}
              className="bg-white print:shadow-none select-none font-sans mx-auto print:mx-0"
              style={{
                width: '100%',
                border: '2px solid black',
                boxSizing: 'border-box',
                pageBreakAfter: 'always',
                display: 'flex',
                flexDirection: 'column',
                fontSize: '0.75rem',
              }}
            >
              {/* Row 1: SKU | PRODUCT */}
              <div style={{ display: 'flex', borderBottom: '2px solid black' }}>
                <div style={{ width: '25%', borderRight: '2px solid black', padding: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '2px' }}>SKU</div>
                  <div style={{ fontSize: '18px', fontWeight: 'black', textAlign: 'center', lineHeight: '1' }}>
                    {box.product?.sku || '—'}
                  </div>
                </div>
                <div style={{ width: '75%', padding: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '2px' }}>PRODUCT</div>
                  <div style={{ fontSize: '11px', fontWeight: 'black', textTransform: 'uppercase', lineHeight: '1.2' }}>
                    {productName}
                  </div>
                </div>
              </div>

              {/* Row 2: COLOUR | BRAND */}
              <div style={{ display: 'flex', borderBottom: '2px solid black', minHeight: '30px', alignItems: 'center' }}>
                <div style={{ width: '50%', borderRight: '2px solid black', padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '9px', fontWeight: 'bold' }}>COLOUR</div>
                  <div style={{ fontSize: '11px', fontWeight: 'black', textTransform: 'uppercase' }}>
                    {box.color || box.product?.color || '—'}
                  </div>
                </div>
                <div style={{ width: '50%', padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '9px', fontWeight: 'bold' }}>BRAND</div>
                  <div style={{ fontSize: '11px', fontWeight: 'black', textTransform: 'uppercase' }}>
                    {box.brand || box.product?.brand || '—'}
                  </div>
                </div>
              </div>

              {/* Row 3: BATCH CODE | MFG DATE */}
              <div style={{ display: 'flex', borderBottom: '2px solid black', minHeight: '28px' }}>
                <div style={{ width: '50%', borderRight: '2px solid black', padding: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '8px', fontWeight: 'bold', marginBottom: '2px' }}>BATCH CODE:</div>
                  <div style={{ fontSize: '10px', fontWeight: 'black', lineHeight: '1' }}>
                    {batchCode}
                  </div>
                </div>
                <div style={{ width: '50%', padding: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '8px', fontWeight: 'bold', marginBottom: '2px' }}>MFG DATE:</div>
                  <div style={{ fontSize: '10px', fontWeight: 'black', textAlign: 'center', lineHeight: '1' }}>
                    {mfgDate ? formatDate(mfgDate) : '—'}
                  </div>
                </div>
              </div>

              {/* Row 4: PACK OF | PCS */}
              <div style={{ display: 'flex', borderBottom: '2px solid black', minHeight: '32px' }}>
                <div style={{ width: '50%', borderRight: '2px solid black', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'black', textAlign: 'center', lineHeight: '1' }}>
                    PACK OF {box.packPerPiece}
                  </div>
                </div>
                <div style={{ width: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'black', textAlign: 'center', lineHeight: '1' }}>
                    {box.totalPcs} PCS
                  </div>
                </div>
              </div>

              {/* Row 5: BARCODE */}
              <div
                style={{
                  borderBottom: '2px solid black',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 2px',
                  minHeight: '45px',
                  flex: 1,
                }}
              >
                <BarcodeImage
                  barcode={box.barcode}
                  width="95%"
                  height="100%"
                  alt={`Barcode ${box.barcode}`}
                />
              </div>

              {/* Row 6: BOX INDEX */}
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 'black',
                  padding: '3px',
                  letterSpacing: '1px',
                }}
              >
                {String(box.boxIndex).padStart(2, '0')} OF {String(box.totalBoxes).padStart(2, '0')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A6;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default BarcodePrint;
