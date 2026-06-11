import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  color?: string;
  brand?: string;
}

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU number is required'),
  upc: z.string().min(1, 'UPC number is required'),
  grade: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  color: z.string().optional(),
  brand: z.string().optional(),
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
      color: '',
      brand: '',
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
      setValue('color', product.color || '');
      setValue('brand', product.brand || '');
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
    <div className="space-y-3 animate-fadeIn">
      {/* Odoo style Breadcrumb Navigation & Control Bar */}
      <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="hover:text-primary-600 cursor-pointer" onClick={onCancel}>Products</span>
          <span>/</span>
          <span className="font-semibold text-gray-700">{product ? product.name : 'New Product'}</span>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={handleSubmit(onSubmit)} className="odoo-btn-primary px-4 h-8 text-xs font-semibold" loading={isSubmitting}>
            Save
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="odoo-btn-secondary px-4 h-8 text-xs">
            Discard
          </Button>
        </div>
      </div>

      {/* Odoo Sheet Form Card */}
      <div className="odoo-sheet max-w-5xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Row 1: Product Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Category
              </label>
              <select
                {...register('categoryId')}
                className={`flex h-8.5 w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.categoryId ? 'border-red-500 focus:ring-red-500' : ''
                }`}
              >
                <option value="">Select category</option>
                {categories && categories.length > 0 ? categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                )) : null}
              </select>
              {errors.categoryId?.message && <p className="text-xs text-red-650 mt-1">{errors.categoryId.message}</p>}
            </div>
          </div>

          {/* Row: Color and Brand */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Colour
              </label>
              <Input
                placeholder="Enter colour (e.g. WHITE)"
                error={errors.color?.message}
                {...register('color')}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Brand
              </label>
              <Input
                placeholder="Enter brand (e.g. NON BRANDED)"
                error={errors.brand?.message}
                {...register('brand')}
                className="w-full"
              />
            </div>
          </div>

          {/* Row 4: Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              placeholder="Enter product description"
              {...register('description')}
              className={`flex w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                errors.description ? 'border-red-500 focus:ring-red-550' : ''
              }`}
              rows={4}
            />
            {errors.description?.message && <p className="text-xs text-red-650 mt-1">{errors.description.message}</p>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditProduct;