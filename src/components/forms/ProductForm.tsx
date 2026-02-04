import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  QrCode,
  Barcode,
  Package,
  AlertTriangle,
} from 'lucide-react';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';
import { Product, Category } from '../../types';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Product>) => void;
  product?: Product | null;
  categories: Category[];
  loading?: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  product,
  categories,
  loading = false,
}) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    code: '',
    name: '',
    grade: '',
    categoryId: '',
    description: '',
    specifications: '',
    unit: 'PCS',
    minStockLevel: 0,
    maxStockLevel: 0,
    reorderLevel: 0,
    barcode: '',
    qrCode: '',
    weight: 0,
    dimensions: '',
    shelfLife: 0,
    storageCondition: '',
    isActive: true,
    isPerishable: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);

  const units = [
    'PCS',
    'KG',
    'GRAM',
    'LITER',
    'ML',
    'METER',
    'CM',
    'BOX',
    'CARTON',
    'DOZEN',
  ];

  const storageConditions = [
    'Room Temperature',
    'Cool & Dry',
    'Refrigerated (2-8°C)',
    'Frozen (-18°C)',
    'Controlled Temperature',
    'Hazardous Storage',
  ];

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        weight: product.weight || 0,
        shelfLife: product.shelfLife || 0,
      });
    } else {
      setFormData({
        code: '',
        name: '',
        grade: '',
        categoryId: '',
        description: '',
        specifications: '',
        unit: 'PCS',
        minStockLevel: 0,
        maxStockLevel: 0,
        reorderLevel: 0,
        barcode: '',
        qrCode: '',
        weight: 0,
        dimensions: '',
        shelfLife: 0,
        storageCondition: '',
        isActive: true,
        isPerishable: false,
      });
    }
    setCurrentStep(1);
    setErrors({});
  }, [product, isOpen]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.code?.trim()) newErrors.code = 'Product code is required';
      if (!formData.name?.trim()) newErrors.name = 'Product name is required';
      if (!formData.categoryId) newErrors.categoryId = 'Category is required';
      if (!formData.unit) newErrors.unit = 'Unit is required';
    }

    if (step === 2) {
      if (
        formData.minStockLevel &&
        formData.maxStockLevel &&
        formData.minStockLevel >= formData.maxStockLevel
      ) {
        newErrors.maxStockLevel =
          'Max stock level must be greater than min stock level';
      }
      if (
        formData.reorderLevel &&
        formData.minStockLevel &&
        formData.reorderLevel >= formData.minStockLevel
      ) {
        newErrors.reorderLevel =
          'Reorder level must be less than min stock level';
      }
    }

    if (step === 3 && formData.isPerishable) {
      if (!formData.shelfLife || formData.shelfLife <= 0) {
        newErrors.shelfLife = 'Shelf life is required for perishable items';
      }
      if (!formData.storageCondition?.trim()) {
        newErrors.storageCondition =
          'Storage condition is required for perishable items';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep(currentStep)) {
      onSubmit(formData);
    }
  };

  const generateBarcode = () => {
    const barcode = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    setFormData((prev) => ({ ...prev, barcode }));
  };

  const generateQRCode = () => {
    const qrCode = `QR${Date.now()}${Math.floor(Math.random() * 1000)}`;
    setFormData((prev) => ({ ...prev, qrCode }));
  };

  if (!isOpen) return null;

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <Package className="h-5 w-5 mr-2" />
        Basic Information
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Product Code *"
          value={formData.code || ''}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, code: e.target.value }))
          }
          error={errors.code}
          placeholder="e.g., PRD001"
        />

        <Input
          label="Product Name *"
          value={formData.name || ''}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          error={errors.name}
          placeholder="Enter product name"
        />

        <Input
          label="Grade/Variant"
          value={formData.grade || ''}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, grade: e.target.value }))
          }
          placeholder="e.g., Premium, Standard"
        />

        <Select
          label="Category *"
          value={formData.categoryId || ''}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, categoryId: e.target.value }))
          }
          error={errors.categoryId}
        >
          <option value="">Select Category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name} ({category.code})
            </option>
          ))}
        </Select>

        <Select
          label="Unit of Measurement *"
          value={formData.unit || 'PCS'}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, unit: e.target.value }))
          }
          error={errors.unit}
        >
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </Select>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive || false}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
            }
            className="rounded border-gray-300"
          />
          <label
            htmlFor="isActive"
            className="text-sm font-medium text-gray-700"
          >
            Active Product
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Product description"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Specifications
          </label>
          <textarea
            value={formData.specifications || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                specifications: e.target.value,
              }))
            }
            placeholder="Technical specifications"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <AlertTriangle className="h-5 w-5 mr-2" />
        Stock Management
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Minimum Stock Level"
          type="number"
          value={formData.minStockLevel || 0}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              minStockLevel: parseInt(e.target.value) || 0,
            }))
          }
          error={errors.minStockLevel}
          placeholder="0"
        />

        <Input
          label="Maximum Stock Level"
          type="number"
          value={formData.maxStockLevel || 0}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              maxStockLevel: parseInt(e.target.value) || 0,
            }))
          }
          error={errors.maxStockLevel}
          placeholder="0"
        />

        <Input
          label="Reorder Level"
          type="number"
          value={formData.reorderLevel || 0}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              reorderLevel: parseInt(e.target.value) || 0,
            }))
          }
          error={errors.reorderLevel}
          placeholder="0"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Weight (kg)"
          type="number"
          step="0.01"
          value={formData.weight || 0}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              weight: parseFloat(e.target.value) || 0,
            }))
          }
          placeholder="0.00"
        />

        <Input
          label="Dimensions (L x W x H)"
          value={formData.dimensions || ''}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, dimensions: e.target.value }))
          }
          placeholder="e.g., 10 x 5 x 3 cm"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Perishable & Storage Information
      </h3>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isPerishable"
          checked={formData.isPerishable || false}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, isPerishable: e.target.checked }))
          }
          className="rounded border-gray-300"
        />
        <label
          htmlFor="isPerishable"
          className="text-sm font-medium text-gray-700"
        >
          This is a perishable item
        </label>
      </div>

      {formData.isPerishable && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <Input
            label="Shelf Life (days) *"
            type="number"
            value={formData.shelfLife || 0}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                shelfLife: parseInt(e.target.value) || 0,
              }))
            }
            error={errors.shelfLife}
            placeholder="0"
          />

          <Select
            label="Storage Condition *"
            value={formData.storageCondition || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                storageCondition: e.target.value,
              }))
            }
            error={errors.storageCondition}
          >
            <option value="">Select Storage Condition</option>
            {storageConditions.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </Select>
        </div>
      )}

      {!formData.isPerishable && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Shelf Life (days)"
            type="number"
            value={formData.shelfLife || 0}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                shelfLife: parseInt(e.target.value) || 0,
              }))
            }
            placeholder="0 (No expiry)"
          />

          <Select
            label="Storage Condition"
            value={formData.storageCondition || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                storageCondition: e.target.value,
              }))
            }
          >
            <option value="">Select Storage Condition</option>
            {storageConditions.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Identification & Tracking
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Barcode
          </label>
          <div className="flex space-x-2">
            <Input
              value={formData.barcode || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, barcode: e.target.value }))
              }
              placeholder="Enter or generate barcode"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateBarcode}
            >
              <Barcode className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            QR Code
          </label>
          <div className="flex space-x-2">
            <Input
              value={formData.qrCode || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, qrCode: e.target.value }))
              }
              placeholder="Enter or generate QR code"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateQRCode}
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Product Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium">Code:</span> {formData.code}
          </div>
          <div>
            <span className="font-medium">Name:</span> {formData.name}
          </div>
          <div>
            <span className="font-medium">Category:</span>{' '}
            {categories.find((c) => c.id === formData.categoryId)?.name}
          </div>
          <div>
            <span className="font-medium">Unit:</span> {formData.unit}
          </div>
          <div>
            <span className="font-medium">Min Stock:</span>{' '}
            {formData.minStockLevel}
          </div>
          <div>
            <span className="font-medium">Max Stock:</span>{' '}
            {formData.maxStockLevel}
          </div>
          <div>
            <span className="font-medium">Perishable:</span>{' '}
            {formData.isPerishable ? 'Yes' : 'No'}
          </div>
          <div>
            <span className="font-medium">Active:</span>{' '}
            {formData.isActive ? 'Yes' : 'No'}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                <div className="ml-2 text-sm font-medium text-gray-700">
                  {step === 1 && 'Basic Info'}
                  {step === 2 && 'Stock Management'}
                  {step === 3 && 'Storage & Expiry'}
                  {step === 4 && 'Identification'}
                </div>
                {step < 4 && (
                  <div
                    className={`ml-4 w-16 h-0.5 ${
                      step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </div>

          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-3">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                >
                  Previous
                </Button>
              )}
            </div>

            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>

              {currentStep < 4 ? (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button type="submit" loading={loading}>
                  {product ? 'Update Product' : 'Create Product'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
