import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store/hooks';
import { createCategory, updateCategory } from '@/slices/categorySlice';
import { Category } from '@/types';
import Button from '@/components/Button';
import Input from '@/components/Input';

interface AddEditCategoryProps {
  category?: Category;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CategoryFormData {
  name: string;
  hsnCode: string;
  gstRate: number;
}

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  hsnCode: z.string().min(1, 'HSN code is required'),
  gstRate: z.coerce.number().min(0).max(100, 'GST rate must be between 0 and 100'),
});

const AddEditCategory: React.FC<AddEditCategoryProps> = ({ category, onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      hsnCode: '',
      gstRate: 0,
    },
  });

  // Update form when category data is available
  useEffect(() => {
    if (category) {
      setValue('name', category.name);
      setValue('hsnCode', category.hsnCode);
      setValue('gstRate', category.gstRate);
    }
  }, [category, setValue]);

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (category) {
        await dispatch(updateCategory({ id: category.id, data })).unwrap();
        toast.success('Category updated successfully');
      } else {
        await dispatch(createCategory(data)).unwrap();
        toast.success('Category created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save category');
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
            {category ? 'Edit Category' : 'Add New Category'}
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Row 1: Category Name and HSN Code */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                Category Name
              </label>
              <Input
                placeholder="Enter category name"
                error={errors.name?.message}
                {...register('name')}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                HSN Code
              </label>
              <Input
                placeholder="Enter HSN code"
                error={errors.hsnCode?.message}
                {...register('hsnCode')}
                className="w-full"
              />
            </div>
          </div>

          {/* Row 2: GST Rate */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
              GST Rate (%)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="e.g., 18"
              error={errors.gstRate?.message}
              {...register('gstRate', { valueAsNumber: true })}
              className="w-full lg:w-1/2"
            />
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
              {category ? 'Update Category' : 'Save Category'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditCategory;
