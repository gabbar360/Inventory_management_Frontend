import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { Volume2 } from 'lucide-react';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

// Local sound files from public folder
const SUCCESS_SOUND_URL = '/sounds/success.mpeg';
const ERROR_SOUND_URL = '/sounds/warnning.mpeg';

// Play success beep sound
const playBarcodeBeep = () => {
  try {
    const audio = new Audio(SUCCESS_SOUND_URL);
    audio.volume = 1.0;
    audio.play().catch(err => console.warn('Could not play success sound:', err));
  } catch (err) {
    console.error('Success sound error:', err);
  }
};

// Play error beep sound
const playErrorBeep = () => {
  try {
    const audio = new Audio(ERROR_SOUND_URL);
    audio.volume = 1.0;
    audio.play().catch(err => console.warn('Could not play error sound:', err));
  } catch (err) {
    console.error('Error sound error:', err);
  }
};

export const BarcodeScannerModal: React.FC<ScannerProps> = ({
  onScanSuccess,
  onScanError,
  isOpen,
  onClose
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = "camera-barcode-reader";
  const lastScannedRef = useRef<string>('');
  const [showTestButtons, setShowTestButtons] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Wait a brief tick for DOM element to render
    const timer = setTimeout(() => {
      try {
        const html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        const qrCodeSuccessCallback = (decodedText: string) => {
          // Prevent multiple rapid scans of same barcode
          if (lastScannedRef.current === decodedText) {
            return;
          }
          lastScannedRef.current = decodedText;
          
          // Play success beep sound on successful scan
          playBarcodeBeep();
          
          onScanSuccess(decodedText);
          onClose();
        };

        const qrCodeErrorCallback = (errorMessage: string) => {
          if (onScanError) onScanError(errorMessage);
        };

        const config = { 
          fps: 10, 
          qrbox: { width: 260, height: 160 } 
        };

        html5QrCode.start(
          { facingMode: "environment" },
          config,
          qrCodeSuccessCallback,
          qrCodeErrorCallback
        ).catch((err) => {
          console.error("Camera scanner initialization failed:", err);
          playErrorBeep();
          toast.error("Could not access camera. Make sure permissions are granted.");
          onClose();
        });
      } catch (err) {
        console.error("Scanner setup failed");
        playErrorBeep();
        toast.error("Failed to initialize scanner camera.");
        onClose();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      lastScannedRef.current = '';
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((err) => 
          console.warn("Failed to stop scanner camera on unmount:", err)
        );
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-65 p-4 animate-fadeIn">
      <style>{`
        @keyframes scanLine {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        
        @keyframes scanGlow {
          0% { box-shadow: 0 0 15px rgba(34, 197, 94, 0.3); }
          50% { box-shadow: 0 0 30px rgba(34, 197, 94, 0.8); }
          100% { box-shadow: 0 0 15px rgba(34, 197, 94, 0.3); }
        }
        
        .scanner-line {
          animation: scanLine 2s ease-in-out infinite;
          background: linear-gradient(90deg, transparent 0%, rgba(34, 197, 94, 0.8) 50%, transparent 100%);
          height: 2px;
          width: 100%;
          position: absolute;
          left: 0;
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.6);
        }
        
        .scanner-frame {
          animation: scanGlow 2s ease-in-out infinite;
        }
      `}</style>
      
      <div className="bg-white rounded border border-gray-300 shadow-2xl p-4 max-w-sm w-full">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Scan Box Barcode</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowTestButtons(!showTestButtons)}
              className="text-gray-400 hover:text-blue-600 transition-colors p-1"
              title="Test sounds"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 font-bold text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {showTestButtons && (
          <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3 flex gap-2">
            <button
              type="button"
              onClick={playBarcodeBeep}
              className="flex-1 text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded font-semibold transition"
            >
              Test ✓ Success
            </button>
            <button
              type="button"
              onClick={playErrorBeep}
              className="flex-1 text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded font-semibold transition"
            >
              Test ✗ Error
            </button>
          </div>
        )}
        
        <div className="relative border-2 border-gray-200 rounded bg-gray-50 overflow-hidden scanner-frame" style={{ minHeight: '220px' }}>
          <div id={elementId} className="w-full h-full"></div>
          
          <div className="scanner-line"></div>
          
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-green-500"></div>
            <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-green-500"></div>
            <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-green-500"></div>
            <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-green-500"></div>
          </div>
        </div>
        
        <div className="text-center mt-3">
          <p className="text-[10px] text-gray-400 leading-tight">
            Point the camera at the barcode on the box label.<br/>
            Hold steady to scan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerModal;
