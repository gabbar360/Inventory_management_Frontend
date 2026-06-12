import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

// Play shopping mall scanner success beep sound (LOUD - pleasant beep-beep)
const playBarcodeBeep = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // First beep - HIGH frequency
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    
    osc1.frequency.value = 1000; // Higher pitch for success
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.7, audioContext.currentTime); // LOUD - 0.7 volume
    gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
    
    osc1.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.08);
    
    // Second beep - EVEN HIGHER frequency after 100ms
    setTimeout(() => {
      try {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        
        osc2.frequency.value = 1200; // Even higher for pleasant feel
        osc2.type = 'sine';
        
        gain2.gain.setValueAtTime(0.7, audioContext.currentTime); // LOUD - 0.7 volume
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
        
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.08);
      } catch (err) {
        console.warn('Second beep failed:', err);
      }
    }, 100);
  } catch (err) {
    console.warn('Beep sound failed:', err);
  }
};

// Play ALARM-style error sound (LOUD - buzz buzz buzz - annoying alarm)
const playErrorBeep = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create buzzing/alarm effect with square wave
    let buzzCount = 0;
    const createBuzz = () => {
      if (buzzCount >= 4) return; // 4 buzzes
      
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      osc.frequency.value = 350; // Lower frequency
      osc.type = 'square'; // Square wave for harsh sound (not sine like success)
      
      gain.gain.setValueAtTime(0.7, audioContext.currentTime); // LOUD - 0.7 volume
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.12);
      
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.12);
      
      buzzCount++;
      
      // Next buzz after 150ms
      if (buzzCount < 4) {
        setTimeout(createBuzz, 150);
      }
    };
    
    createBuzz();
  } catch (err) {
    console.warn('Error beep sound failed:', err);
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
          // Play error sound
          playErrorBeep();
          toast.error("Could not access camera. Make sure permissions are granted.");
          onClose();
        });
      } catch (err) {
        console.error("Scanner setup failed");
        // Play error sound
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
          0% {
            top: 0%;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0%;
          }
        }
        
        @keyframes scanGlow {
          0% {
            box-shadow: 0 0 15px rgba(34, 197, 94, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(34, 197, 94, 0.8);
          }
          100% {
            box-shadow: 0 0 15px rgba(34, 197, 94, 0.3);
          }
        }
        
        .scanner-line {
          animation: scanLine 2s ease-in-out infinite;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(34, 197, 94, 0.8) 50%, 
            transparent 100%);
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
          <button 
            type="button" 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 font-bold text-lg leading-none"
          >
            ×
          </button>
        </div>
        
        {/* Camera with Scanning Animation */}
        <div className="relative border-2 border-gray-200 rounded bg-gray-50 overflow-hidden scanner-frame" style={{ minHeight: '220px' }}>
          <div id={elementId} className="w-full h-full"></div>
          
          {/* Green Scanning Line */}
          <div className="scanner-line"></div>
          
          {/* Scanning Frame Corners */}
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
