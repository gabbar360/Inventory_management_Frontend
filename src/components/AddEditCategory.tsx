import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
    <div className="space-y-3 animate-fadeIn">
      {/* Odoo style Breadcrumb Navigation & Control Bar */}
      <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="hover:text-primary-600 cursor-pointer" onClick={onCancel}>Categories</span>
          <span>/</span>
          <span className="font-semibold text-gray-700">{category ? category.name : 'New Category'}</span>
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
          {/* Row 1: Category Name and HSN Code */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">
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
        </form>
      </div>
    </div>
  );
};

export default AddEditCategory;
