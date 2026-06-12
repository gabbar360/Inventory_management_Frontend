import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeImageProps {
  barcode: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  alt?: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

export const BarcodeImage: React.FC<BarcodeImageProps> = ({
  barcode,
  width = '250px',
  height = '70px',
  className = '',
  alt = `Barcode ${barcode}`,
  onLoad,
  onError
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && barcode) {
      try {
        // Always use CODE128 format for maximum compatibility
        JsBarcode(svgRef.current, barcode, {
          format: 'CODE128',
          displayValue: true,
          fontSize: 14,
          fontOptions: 'bold',
          height: 60,
          width: 2,
          margin: 5,
        });
        onLoad?.();
      } catch (err: any) {
        console.error('Failed to generate barcode image:', err);
        onError?.(err?.message || 'Failed to generate barcode');
      }
    }
  }, [barcode, onLoad, onError]);

  return (
    <svg
      ref={svgRef}
      className={`object-contain ${className}`}
      style={{ width, height }}
      aria-label={alt}
    />
  );
};

export default BarcodeImage;
