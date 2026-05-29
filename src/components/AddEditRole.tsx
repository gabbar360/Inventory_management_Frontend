import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store/hooks';
import { createRole, updateRole } from '@/slices/roleSlice';
import Button from '@/components/Button';
import Input from '@/components/Input';

interface AddEditRoleProps {
  role?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface RoleFormData {
  name: string;
  description?: string;
  isActive?: boolean;
}

const roleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Inline Toggle Component
const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }> = ({
  checked,
  onChange,
  disabled = false,
}) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      checked ? 'bg-blue-600' : 'bg-gray-300'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const AddEditRole: React.FC<AddEditRoleProps> = ({ role, onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      isActive: true,
    },
  });

  const isActiveValue = watch('isActive');

  useEffect(() => {
    if (role) {
      setValue('name', role.name);
      setValue('description', role.description || '');
      setValue('isActive', role.isActive !== false);
    }
  }, [role, setValue]);

  const onSubmit = async (data: RoleFormData) => {
    try {
      const submitData = {
        ...data,
        isActive: data.isActive === true,
      };
      if (role) {
        await dispatch(updateRole({ id: role.id, data: submitData })).unwrap();
        toast.success('Role updated successfully');
      } else {
        await dispatch(createRole(submitData)).unwrap();
        toast.success('Role created successfully');
      }
      onSuccess();
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to save role';
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
            {role ? 'Edit Role' : 'Add New Role'}
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Role Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
              Role Name
            </label>
            <Input
              placeholder="Enter role name"
              error={errors.name?.message}
              {...register('name')}
              className="w-full"
            />
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
              Description (Optional)
            </label>
            <textarea
              {...register('description')}
              placeholder="Enter role description"
              rows={4}
              className={`flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.description ? 'border-red-500 focus:ring-red-500' : ''
              }`}
            />
            {errors.description?.message && <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>}
          </div>

          {/* Status Toggle */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <ToggleSwitch
              checked={isActiveValue !== false}
              onChange={(checked) => setValue('isActive', checked)}
            />
            <label className="text-sm font-medium text-gray-700">
              {isActiveValue !== false ? 'Active' : 'Inactive'}
            </label>
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
              {role ? 'Update Role' : 'Save Role'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditRole;
