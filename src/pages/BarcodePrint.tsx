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
          <p className="text-xs font-semibold text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100/50 p-4 print:bg-white print:p-0 flex flex-col items-center">
      {/* Control Bar */}
      <div className="no-print bg-white border-2 border-black rounded px-4 py-3 flex items-center justify-between shadow-sm mb-4 w-full max-w-2xl">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-sm font-black uppercase">Print {boxes.length} Labels</h1>
        </div>
        <Button onClick={handlePrint} className="odoo-btn-primary h-8 px-4 text-xs font-semibold">
          <Printer className="h-3.5 w-3.5 mr-1" /> Print
        </Button>
      </div>

      {/* Labels Container */}
      {Array.from({ length: Math.ceil(boxes.length / 4) }, (_, pageIdx) => (
        <div
          key={pageIdx}
          style={{
            width: '8.27in',
            height: '11.69in',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: '3mm',
            padding: '3mm',
            boxSizing: 'border-box',
            breakAfter: pageIdx < Math.ceil(boxes.length / 4) - 1 ? 'page' : 'auto',
            marginBottom: '10px',
            background: 'white'
          }}
        >
          {boxes.slice(pageIdx * 4, pageIdx * 4 + 4).map((box) => (
            <div
              key={box.id}
              style={{
                width: '3.9in',
                height: '5.5in',
                border: '2px solid black',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'Arial, sans-serif',
                overflow: 'hidden',
                background: 'white',
              }}
            >
              {/* Row 1: SKU + Product */}
              <div style={{ display: 'flex', borderBottom: '1px solid black', flexShrink: 0 }}>
                <div style={{ width: '28%', borderRight: '1px solid black', padding: '0px 6px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold' }}>SKU</div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', lineHeight: 1 }}>{box.product?.sku || '—'}</div>
                </div>
                <div style={{ width: '72%', padding: '0px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold' }}>PRODUCT</div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', wordBreak: 'break-word' }}>{box.product?.name || '—'}</div>
                </div>
              </div>

              {/* Row 2: Colour + Brand */}
              <div style={{ display: 'flex', borderBottom: '1px solid black', flexShrink: 0 }}>
                <div style={{ width: '50%', borderRight: '1px solid black', padding: '0px 6px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold' }}>COLOUR</div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>{box.color || '—'}</div>
                </div>
                <div style={{ width: '50%', padding: '0px 6px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold' }}>BRAND</div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>{box.brand || '—'}</div>
                </div>
              </div>

              {/* Row 3: Batch Code + MFG Date */}
              <div style={{ display: 'flex', borderBottom: '1px solid black', flexShrink: 0 }}>
                <div style={{ width: '50%', borderRight: '1px solid black', padding: '4px 6px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold' }}>BATCH CODE</div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{box.batchCode || '—'}</div>
                </div>
                <div style={{ width: '50%', padding: '4px 6px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold' }}>MFG DATE</div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{box.mfgDate ? formatDate(box.mfgDate) : '—'}</div>
                </div>
              </div>

              {/* Row 4: Pack Of + Total Pcs */}
              <div style={{ display: 'flex', borderBottom: '1px solid black', flexShrink: 0 }}>
                <div style={{ width: '50%', borderRight: '1px solid black', padding: '4px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold' }}>PACK OF</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{box.packPerBox || '—'}</div>
                </div>
                <div style={{ width: '50%', padding: '4px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold' }}>TOTAL PCS</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{box.totalPcs || '—'}</div>
                </div>
              </div>

              {/* Row 5: Barcode */}
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
                <BarcodeImage barcode={box.barcode} width="100%" height="auto" />
              </div>
            </div>
          ))}
        </div>
      ))}

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }

        }
      `}</style>
    </div>
  );
};

export default BarcodePrint;