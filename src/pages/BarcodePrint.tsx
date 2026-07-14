import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchBarcodesForPrint, clearBoxes } from '@/slices/barcodeSlice';
import BarcodeImage from '@/components/BarcodeImage';
import Button from '@/components/Button';
import { formatDate } from '@/utils';

type SizeKey = '4x4' | '4x3' | '4x2';
const SIZES: Record<SizeKey, { w: string; h: string; label: string }> = {
  '4x4': { w: '100mm', h: '100mm', label: '4×4' },
  '4x3': { w: '100mm', h: '75mm',  label: '4×3' },
  '4x2': { w: '100mm', h: '50mm',  label: '4×2' },
};

export const BarcodePrint: React.FC = () => {
  const { source, id } = useParams<{ source: string; id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { boxes, loading, error } = useAppSelector((state) => state.barcodes);
  const [size, setSize] = React.useState<SizeKey>('4x4');
  const { w, h } = SIZES[size];

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
        <div className="flex items-center gap-2">
          <div className="flex border border-black rounded overflow-hidden text-xs font-semibold">
            {(Object.keys(SIZES) as SizeKey[]).map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`px-3 py-1.5 transition-colors ${
                  size === s ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                {SIZES[s].label}
              </button>
            ))}
          </div>
          <Button onClick={handlePrint} className="odoo-btn-primary h-8 px-4 text-xs font-semibold">
          <Printer className="h-3.5 w-3.5 mr-1" /> Print
          </Button>
        </div>
      </div>

      {/* Labels Container */}
      <div className="flex flex-col gap-4 print:gap-0 print:block">
        {boxes.map((box, index) => (
          <div
            key={box.id}
            style={{
              width: w,
              height: h,
              border: '2px solid black',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Arial, sans-serif',
              overflow: 'hidden',
              background: 'white',
              breakAfter: index < boxes.length - 1 ? 'page' : 'auto',
              marginBottom: '15px',
            }}
            className="print:mb-0 print:border-black"
          >
            {/* Layout varies by size */}
            {size === '4x4' && (
              <>
                <div style={{ display: 'flex', borderBottom: '1px solid black', flexShrink: 0 }}>
                  <div style={{ width: '28%', borderRight: '1px solid black', padding: '2px 6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>SKU</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', lineHeight: 1.1, wordBreak: 'break-all' }}>{box.product?.sku || '—'}</div>
                  </div>
                  <div style={{ width: '72%', padding: '2px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>PRODUCT</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', wordBreak: 'break-word', lineHeight: 1.2 }}>{box.product?.name || '—'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid black', flexShrink: 0 }}>
                  <div style={{ width: '50%', borderRight: '1px solid black', padding: '2px 6px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold' }}>COLOUR</div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>{box.color || '—'}</div>
                  </div>
                  <div style={{ width: '50%', padding: '2px 6px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold' }}>BRAND</div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>{box.brand || '—'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid black', flexShrink: 0 }}>
                  <div style={{ width: '50%', borderRight: '1px solid black', padding: '2px 6px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold' }}>BATCH CODE</div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{box.batchCode || '—'}</div>
                  </div>
                  <div style={{ width: '50%', padding: '2px 6px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold' }}>MFG DATE</div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{box.mfgDate ? formatDate(box.mfgDate) : '—'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid black', flexShrink: 0 }}>
                  <div style={{ width: '50%', borderRight: '1px solid black', padding: '2px 6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold' }}>PACK OF</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1.1 }}>{box.packPerBox || '—'}</div>
                  </div>
                  <div style={{ width: '50%', padding: '2px 6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold' }}>TOTAL PCS</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1.1 }}>{box.totalPcs || '—'}</div>
                  </div>
                </div>
                <div style={{ flexGrow: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px' }}>
                  <BarcodeImage barcode={box.barcode} width="100%" height="auto" />
                  <div style={{ position: 'absolute', bottom: '4px', left: 0, right: 0, textAlign: 'center', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', pointerEvents: 'none' }}>
                    Box {box.boxIndex} / {box.totalBoxes} | Total: {index + 1} / {boxes.length}
                  </div>
                </div>
              </>
            )}

            {size === '4x3' && (
              <>
                {/* Row 1: SKU + Product + Colour in one line */}
                <div style={{ display: 'flex', borderBottom: '1px solid black', flexShrink: 0 }}>
                  <div style={{ width: '20%', borderRight: '1px solid black', padding: '2px 5px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold' }}>SKU</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1.1, wordBreak: 'break-all' }}>{box.product?.sku || '—'}</div>
                  </div>
                  <div style={{ width: '55%', borderRight: '1px solid black', padding: '2px 5px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold' }}>PRODUCT</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', wordBreak: 'break-word', lineHeight: 1.2 }}>{box.product?.name || '—'}</div>
                  </div>
                  <div style={{ width: '25%', padding: '2px 5px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold' }}>COLOUR</div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>{box.color || '—'}</div>
                  </div>
                </div>
                {/* Row 2: Brand + Batch + MFG */}
                <div style={{ display: 'flex', borderBottom: '1px solid black', flexShrink: 0 }}>
                  <div style={{ width: '33%', borderRight: '1px solid black', padding: '2px 5px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold' }}>BRAND</div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>{box.brand || '—'}</div>
                  </div>
                  <div style={{ width: '34%', borderRight: '1px solid black', padding: '2px 5px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold' }}>BATCH</div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{box.batchCode || '—'}</div>
                  </div>
                  <div style={{ width: '33%', padding: '2px 5px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold' }}>MFG DATE</div>
                    <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{box.mfgDate ? formatDate(box.mfgDate) : '—'}</div>
                  </div>
                </div>
                {/* Row 3: Pack + Total Pcs + Barcode */}
                <div style={{ display: 'flex', borderBottom: '1px solid black', flexShrink: 0 }}>
                  <div style={{ width: '25%', borderRight: '1px solid black', padding: '2px 5px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold' }}>PACK OF</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{box.packPerBox || '—'}</div>
                  </div>
                  <div style={{ width: '25%', borderRight: '1px solid black', padding: '2px 5px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold' }}>TOTAL PCS</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{box.totalPcs || '—'}</div>
                  </div>
                  <div style={{ width: '50%', padding: '2px 5px', textAlign: 'center', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.1 }}>
                    <div>Box {box.boxIndex} / {box.totalBoxes}</div>
                    <div style={{ fontSize: '8px', fontWeight: 'normal' }}>Total: {index + 1} / {boxes.length}</div>
                  </div>
                </div>
                {/* Barcode row */}
                <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3px 6px' }}>
                  <BarcodeImage barcode={box.barcode} width="100%" height="auto" />
                </div>
              </>
            )}

            {size === '4x2' && (
              <>
                {/* Row 1: SKU + Product */}
                <div style={{ display: 'flex', borderBottom: '1px solid black', flexShrink: 0 }}>
                  <div style={{ width: '22%', borderRight: '1px solid black', padding: '2px 4px' }}>
                    <div style={{ fontSize: '8px', fontWeight: 'bold' }}>SKU</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: 1.1, wordBreak: 'break-all' }}>{box.product?.sku || '—'}</div>
                  </div>
                  <div style={{ width: '78%', padding: '2px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '8px', fontWeight: 'bold' }}>PRODUCT</div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', wordBreak: 'break-word', lineHeight: 1.2 }}>{box.product?.name || '—'}</div>
                  </div>
                </div>
                {/* Row 2: Colour + Brand + Batch + MFG + Pack + Pcs all compact */}
                <div style={{ display: 'flex', borderBottom: '1px solid black', flexShrink: 0 }}>
                  <div style={{ width: '16%', borderRight: '1px solid black', padding: '2px 3px' }}>
                    <div style={{ fontSize: '7px', fontWeight: 'bold' }}>CLR</div>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}>{box.color || '—'}</div>
                  </div>
                  <div style={{ width: '16%', borderRight: '1px solid black', padding: '2px 3px' }}>
                    <div style={{ fontSize: '7px', fontWeight: 'bold' }}>BRAND</div>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}>{box.brand || '—'}</div>
                  </div>
                  <div style={{ width: '20%', borderRight: '1px solid black', padding: '2px 3px' }}>
                    <div style={{ fontSize: '7px', fontWeight: 'bold' }}>BATCH</div>
                    <div style={{ fontSize: '9px', fontWeight: 'bold' }}>{box.batchCode || '—'}</div>
                  </div>
                  <div style={{ width: '22%', borderRight: '1px solid black', padding: '2px 3px' }}>
                    <div style={{ fontSize: '7px', fontWeight: 'bold' }}>MFG</div>
                    <div style={{ fontSize: '8px', fontWeight: 'bold' }}>{box.mfgDate ? formatDate(box.mfgDate) : '—'}</div>
                  </div>
                  <div style={{ width: '13%', borderRight: '1px solid black', padding: '2px 3px', textAlign: 'center' }}>
                    <div style={{ fontSize: '7px', fontWeight: 'bold' }}>PCK</div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{box.packPerBox || '—'}</div>
                  </div>
                  <div style={{ width: '13%', padding: '2px 3px', textAlign: 'center' }}>
                    <div style={{ fontSize: '7px', fontWeight: 'bold' }}>PCS</div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{box.totalPcs || '—'}</div>
                  </div>
                </div>
                {/* Barcode */}
                <div style={{ flexGrow: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 5px' }}>
                  <BarcodeImage barcode={box.barcode} width="100%" height="auto" />
                  <div style={{ position: 'absolute', bottom: '2px', right: '6px', fontSize: '8px', fontWeight: 'bold', textAlign: 'right', lineHeight: 1.1 }}>
                    <div>Box {box.boxIndex}/{box.totalBoxes}</div>
                    <div style={{ fontSize: '7px', fontWeight: 'normal' }}>T: {index + 1}/{boxes.length}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          @page { size: ${w} ${h}; margin: 0; }
          .no-print { display: none !important; }
          body { 
            margin: 0; 
            padding: 0; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
        }
      `}</style>
    </div>
  );
};

export default BarcodePrint;