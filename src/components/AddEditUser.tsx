import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
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
  role: string;
  isActive?: boolean;
}

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  isActive: z.boolean().optional(),
});

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }> = (
  { checked, onChange, disabled = false }
) => (
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
      setValue('role', user.role);
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
            {user ? 'Edit User' : 'Add New User'}
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
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
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
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
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
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
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
              Role
            </label>
            <select
              {...register('role')}
              className={`flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.role ? 'border-red-500 focus:ring-red-500' : ''
              }`}
            >
              <option value="">Select a role</option>
              {roles && roles.length > 0 ? (
                roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name.replace('_', ' ')}
                  </option>
                ))
              ) : (
                <option disabled>No roles available</option>
              )}
            </select>
            {errors.role && (
              <p className="text-sm text-red-600 mt-1">{errors.role.message}</p>
            )}
          </div>

          {/* Status Toggle - Only for editing */}
          {user && (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <ToggleSwitch
                checked={isActiveValue !== false}
                onChange={(checked) => setValue('isActive', checked)}
              />
              <label className="text-sm font-medium text-gray-700">
                {isActiveValue !== false ? 'Unblocked' : 'Blocked'}
              </label>
            </div>
          )}

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
              {user ? 'Update User' : 'Save User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditUser;
