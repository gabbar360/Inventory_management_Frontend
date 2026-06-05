import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
    className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
      checked ? 'bg-odooTeal' : 'bg-gray-300'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-4.5' : 'translate-x-0.5'
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
    <div className="space-y-3 animate-fadeIn">
      {/* Odoo style Breadcrumb Navigation & Control Bar */}
      <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="hover:text-primary-600 cursor-pointer" onClick={onCancel}>Access Control</span>
          <span>/</span>
          <span className="font-semibold text-gray-700">{role ? role.name : 'New Role'}</span>
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
          {/* Role Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              {...register('description')}
              placeholder="Enter role description"
              rows={4}
              className={`flex w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                errors.description ? 'border-red-500 focus:ring-red-500' : ''
              }`}
            />
            {errors.description?.message && <p className="text-xs text-red-650 mt-1">{errors.description.message}</p>}
          </div>

          {/* Status Toggle */}
          <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded">
            <ToggleSwitch
              checked={isActiveValue !== false}
              onChange={(checked) => setValue('isActive', checked)}
            />
            <label className="block text-xs font-semibold text-gray-750">
              {isActiveValue !== false ? 'Active' : 'Inactive'}
            </label>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditRole;
