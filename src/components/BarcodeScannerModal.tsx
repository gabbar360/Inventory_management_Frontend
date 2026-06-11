import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<ScannerProps> = ({
  onScanSuccess,
  onScanError,
  isOpen,
  onClose
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = "camera-barcode-reader";

  useEffect(() => {
    if (!isOpen) return;

    // Wait a brief tick for DOM element to render
    const timer = setTimeout(() => {
      try {
        const html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        const qrCodeSuccessCallback = (decodedText: string) => {
          onScanSuccess(decodedText);
          onClose();
        };

        const qrCodeErrorCallback = (errorMessage: string) => {
          if (onScanError) onScanError(errorMessage);
        };

        // Standard size and settings for barcode scanning
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
          toast.error("Could not access camera. Make sure permissions are granted.");
          onClose();
        });
      } catch (err) {
        console.error("Scanner setup failed");
        toast.error("Failed to initialize scanner camera.");
        onClose();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
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
      <div className="bg-white rounded border border-gray-300 shadow-2xl p-4 max-w-sm w-full">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Scan Box Barcode</h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 font-bold text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div className="relative border border-gray-200 rounded bg-gray-50 overflow-hidden" style={{ minHeight: '220px' }}>
          <div id={elementId} className="w-full"></div>
        </div>
        <div className="text-center mt-3">
          <p className="text-[10px] text-gray-400 leading-tight">
            Point the camera at the EAN-13 barcode on the box label.<br/>
            Hold steady to scan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerModal;