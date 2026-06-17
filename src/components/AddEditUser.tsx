import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createUser,
  updateUser,
} from '@/slices/userSlice';
import { fetchRoles } from '@/slices/roleSlice';
import Button from '@/components/Button';
import Input from '@/components/Input';

interface AddEditUserProps {
  user?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  roleId: number;
  isActive?: boolean;
}

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().optional(),
  roleId: z.number().min(1, 'Role is required'),
  isActive: z.boolean().optional(),
});

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }> = (
  { checked, onChange, disabled = false }
) => (
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

const AddEditUser: React.FC<AddEditUserProps> = ({ user, onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const { roles } = useAppSelector((state) => state.roles);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      isActive: true,
    },
  });

  const isActiveValue = watch('isActive');

  useEffect(() => {
    dispatch(fetchRoles({ page: 1, limit: 100, search: '' }));
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setValue('name', user.name);
      setValue('email', user.email);
      setValue('roleId', user.roleId || user.role?.id);
      setValue('isActive', user.isActive !== false);
    }
  }, [user, setValue]);

  const onSubmit = async (data: UserFormData) => {
    try {
      const submitData = {
        ...data,
        isActive: data.isActive === true,
      };
      if (user) {
        await dispatch(updateUser({ id: user.id, data: submitData })).unwrap();
        toast.success('User updated successfully');
      } else {
        if (!data.password) {
          toast.error('Password is required for new users');
          return;
        }
        await dispatch(createUser({ ...data, password: data.password })).unwrap();
        toast.success('User created successfully');
      }
      onSuccess();
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to save user';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Odoo style Breadcrumb Navigation & Control Bar */}
      <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="hover:text-primary-600 cursor-pointer" onClick={onCancel}>User Management</span>
          <span>/</span>
          <span className="font-semibold text-gray-700">{user ? user.name : 'New User'}</span>
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
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Name
            </label>
            <Input
              placeholder="Enter user name"
              error={errors.name?.message}
              {...register('name')}
              className="w-full"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email
            </label>
            <Input
              type="email"
              placeholder="Enter email address"
              error={errors.email?.message}
              {...register('email')}
              className="w-full"
            />
          </div>

          {/* Password - Only for new users */}
          {!user && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Password
              </label>
              <Input
                type="password"
                placeholder="Enter password"
                error={errors.password?.message}
                {...register('password')}
                className="w-full"
              />
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Role
            </label>
            <select
              {...register('roleId', { valueAsNumber: true })}
              className={`flex h-8.5 w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                errors.roleId ? 'border-red-500 focus:ring-red-500' : ''
              }`}
            >
              <option value="">Select a role</option>
              {roles && roles.length > 0 ? (
                roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name.replace('_', ' ')}
                  </option>
                ))
              ) : (
                <option disabled>No roles available</option>
              )}
            </select>
            {errors.roleId && (
              <p className="text-xs text-red-650 mt-1">{errors.roleId.message}</p>
            )}
          </div>

          {/* Status Toggle - Only for editing */}
          {user && (
            <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded">
              <ToggleSwitch
                checked={isActiveValue !== false}
                onChange={(checked) => setValue('isActive', checked)}
              />
              <label className="block text-xs font-semibold text-gray-750">
                {isActiveValue !== false ? 'Unblocked' : 'Blocked'}
              </label>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddEditUser;
