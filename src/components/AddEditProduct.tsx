import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createProduct, updateProduct } from '@/slices/productSlice';
import { fetchCategories } from '@/slices/categorySlice';
import { Product } from '@/types';
import Button from '@/components/Button';
import Input from '@/components/Input';

interface AddEditProductProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ProductFormData {
  name: string;
  sku: string;
  upc: string;
  grade?: string;
  description?: string;
  categoryId: string;
}

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU number is required'),
  upc: z.string().min(1, 'UPC number is required'),
  grade: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
});

const AddEditProduct: React.FC<AddEditProductProps> = ({ product, onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const { categories } = useAppSelector((state) => state.categories);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      upc: '',
      grade: '',
      description: '',
      categoryId: '',
    },
  });

  // Fetch categories on mount
  useEffect(() => {
    dispatch(fetchCategories({ limit: 100 }));
  }, [dispatch]);

  // Update form when product data is available
  useEffect(() => {
    if (product) {
      setValue('name', product.name);
      setValue('sku', product.sku || '');
      setValue('upc', product.upc || '');
      setValue('grade', product.grade || '');
      setValue('description', product.description || '');
      setValue('categoryId', product.categoryId.toString());
    }
  }, [product, setValue]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (product) {
        await dispatch(updateProduct({ id: product.id, data })).unwrap();
        toast.success('Product updated successfully');
      } else {
        await dispatch(createProduct(data)).unwrap();
        toast.success('Product created successfully');
      }
      onSuccess();
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to save product';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            title="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Row 1: Product Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
            
              Product Name
            </label>
            <Input
              placeholder="Enter product name"
              error={errors.name?.message}
              {...register('name')}
              className="w-full"
            />
          </div>

          {/* Row 2: SKU and UPC */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                
                SKU Number
              </label>
              <Input
                placeholder="Enter SKU number"
                error={errors.sku?.message}
                {...register('sku')}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                
                UPC Number
              </label>
              <Input
                placeholder="Enter UPC number"
                error={errors.upc?.message}
                {...register('upc')}
                className="w-full"
              />
            </div>
          </div>

          {/* Row 3: Grade and Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                
                Grade
              </label>
              <Input
                placeholder="Enter product grade"
                error={errors.grade?.message}
                {...register('grade')}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
               
                Category
              </label>
              <select
                {...register('categoryId')}
                className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.categoryId ? 'border-red-500 focus:ring-red-500' : ''
                }`}
              >
                <option value="">Select category</option>
                {categories && categories.length > 0 ? categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                )) : null}
              </select>
              {errors.categoryId?.message && <p className="text-sm text-red-600 mt-1">{errors.categoryId.message}</p>}
            </div>
          </div>

          {/* Row 4: Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
             
              Description
            </label>
            <textarea
              placeholder="Enter product description"
              {...register('description')}
              className={`flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.description ? 'border-red-500 focus:ring-red-500' : ''
              }`}
              rows={4}
            />
            {errors.description?.message && <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="px-8"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={isSubmitting}
              className="px-8"
            >
              {product ? 'Update Product' : 'Save Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditProduct;
