import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { bulkUploadService, BulkUploadResult } from '@/services/bulkUploadService';
import Button from './Button';
import Modal from './Modal';

interface BulkUploadProps {
  type: 'categories' | 'products' | 'vendors' | 'customers' | 'locations' | 'inward' | 'outward';
  onSuccess: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const BulkUpload: React.FC<BulkUploadProps> = ({ type, onSuccess, isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Please select an Excel (.xlsx, .xls) or CSV file');
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }
    
    setFile(selectedFile);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      let uploadResult: BulkUploadResult;
      
      switch (type) {
        case 'categories':
          uploadResult = await bulkUploadService.uploadCategories(file);
          break;
        case 'products':
          uploadResult = await bulkUploadService.uploadProducts(file);
          break;
        case 'vendors':
          uploadResult = await bulkUploadService.uploadVendors(file);
          break;
        case 'customers':
          uploadResult = await bulkUploadService.uploadCustomers(file);
          break;
        case 'locations':
          uploadResult = await bulkUploadService.uploadLocations(file);
          break;
        case 'inward':
          uploadResult = await bulkUploadService.uploadInward(file);
          break;
        case 'outward':
          uploadResult = await bulkUploadService.uploadOutward(file);
          break;
      }
      
      setResult(uploadResult);
      
      if (uploadResult.success > 0) {
        toast.success(`Successfully uploaded ${uploadResult.success} records`);
        onSuccess();
      }
      
      if (uploadResult.failed > 0) {
        toast.error(`${uploadResult.failed} records failed to upload`);
      }
    } catch (error) {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await bulkUploadService.downloadTemplate(type);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Template downloaded successfully');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const resetUpload = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getTypeLabel = () => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bulk Upload ${getTypeLabel()}`}
      size="lg"
    >
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-900">Download Template</h3>
              <p className="text-sm text-blue-700 mt-1">
                Download the Excel template to see the required format
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
          </div>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          
          {file ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <FileText className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-900">{file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetUpload();
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports Excel (.xlsx, .xls) and CSV files up to 10MB
              </p>
            </div>
          )}
        </div>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Successful</p>
                    <p className="text-lg font-bold text-green-900">{result.success}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Failed</p>
                    <p className="text-lg font-bold text-red-900">{result.failed}</p>
                  </div>
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-900 mb-2">Errors:</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {result.errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="text-sm text-red-800">
                      <span className="font-medium">Row {error.row}:</span> {error.error}
                    </div>
                  ))}
                  {result.errors.length > 10 && (
                    <div className="text-sm text-red-600">
                      ... and {result.errors.length - 10} more errors
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          
          {file && !result && (
            <Button
              onClick={handleUpload}
              loading={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload {getTypeLabel()}
            </Button>
          )}
          
          {result && (
            <Button
              onClick={resetUpload}
            >
              Upload Another File
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default BulkUpload;