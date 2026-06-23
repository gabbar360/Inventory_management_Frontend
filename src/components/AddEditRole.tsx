import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createRole, updateRole } from '@/slices/roleSlice';
import {
  fetchMasterPermissions,
  fetchRolePermissions,
  syncRolePermissions,
  Permission
} from '@/slices/permissionSlice';
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
  isSuperAdmin?: boolean;
  isActive?: boolean;
}

const roleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
  isSuperAdmin: z.boolean().optional(),
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
      checked ? 'bg-blue-600' : 'bg-gray-300'
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

  // Selected permission IDs state (handles pending checkbox checks)
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);

  // Select state from Redux
  const { allPermissions, rolePermissions, loading: loadingPermissions } = useAppSelector(
    (state) => state.permissions
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      isSuperAdmin: false,
      isActive: true,
    },
  });

  const isActiveValue = watch('isActive');
  const isSuperAdminValue = watch('isSuperAdmin');

  // Load master permissions and initialize form on mount/edit
  useEffect(() => {
    dispatch(fetchMasterPermissions());

    if (role) {
      setValue('name', role.name);
      setValue('description', role.description || '');
      setValue('isSuperAdmin', role.isSuperAdmin === true);
      setValue('isActive', role.isActive !== false);
      dispatch(fetchRolePermissions(role.id));
    }
  }, [role, setValue, dispatch]);

  // Sync selected checkboxes when rolePermissions load from Redux
  useEffect(() => {
    if (role && rolePermissions.length > 0) {
      setSelectedPermissionIds(rolePermissions.map((p) => p.id));
    } else {
      setSelectedPermissionIds([]);
    }
  }, [rolePermissions, role]);

  const handlePermissionToggle = (permissionId: number) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSelectAll = () => {
    setSelectedPermissionIds(allPermissions.map((p) => p.id));
  };

  const handleClearAll = () => {
    setSelectedPermissionIds([]);
  };

  const onSubmit = async (data: RoleFormData) => {
    try {
      const submitData = {
        name: data.name,
        description: data.description,
        isSuperAdmin: data.isSuperAdmin === true,
        isActive: data.isActive === true,
      };

      let savedRole;
      if (role) {
        // 1. Update role metadata
        const response = await dispatch(updateRole({ id: role.id, data: submitData })).unwrap();
        savedRole = response;

        // 2. Sync permissions (if not super admin) via Redux Thunk
        if (!submitData.isSuperAdmin) {
          await dispatch(syncRolePermissions({ id: role.id, permissionIds: selectedPermissionIds })).unwrap();
        }
        
        toast.success('Role updated successfully');
      } else {
        // 1. Create new role metadata
        const response = await dispatch(createRole(submitData)).unwrap();
        savedRole = response;

        // 2. Sync permissions (if not super admin) via Redux Thunk
        if (!submitData.isSuperAdmin && savedRole?.id) {
          await dispatch(syncRolePermissions({ id: savedRole.id, permissionIds: selectedPermissionIds })).unwrap();
        }

        toast.success('Role created successfully');
      }
      onSuccess();
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to save role';
      toast.error(errorMessage);
    }
  };

  // Group permissions by module
  const permissionsByModule = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-10">
      {/* breadcrumb Navigation & Control Bar */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Left: General Settings */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-4 space-y-4 bg-white border border-gray-200 rounded shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-2">General Settings</h3>
            
            {/* Role Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Role Name
              </label>
              <Input
                placeholder="Enter role name"
                error={errors.name?.message}
                {...register('name')}
                className="w-full text-xs"
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
                rows={3}
                className={`flex w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.description ? 'border-red-500 focus:ring-red-500' : ''
                }`}
              />
              {errors.description?.message && <p className="text-xs text-red-650 mt-1">{errors.description.message}</p>}
            </div>

            {/* Super Admin Toggle */}
            <div className="flex items-center justify-between p-2.5 bg-blue-50/50 border border-blue-100 rounded">
              <div>
                <label className="block text-xs font-semibold text-blue-900">
                  Super Admin
                </label>
                <span className="text-[10px] text-blue-700">Full wildcard permissions bypass</span>
              </div>
              <ToggleSwitch
                checked={isSuperAdminValue === true}
                onChange={(checked) => setValue('isSuperAdmin', checked)}
              />
            </div>

            {/* Status Toggle */}
            <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded">
              <div>
                <label className="block text-xs font-semibold text-gray-750">
                  Role Status
                </label>
                <span className="text-[10px] text-gray-500">Allow users to inherit this role</span>
              </div>
              <ToggleSwitch
                checked={isActiveValue !== false}
                onChange={(checked) => setValue('isActive', checked)}
              />
            </div>
          </div>
        </div>

        {/* Right: Permissions Grid */}
        <div className="lg:col-span-2">
          {isSuperAdminValue ? (
            <div className="border border-blue-200 bg-blue-50/40 rounded p-6 text-center shadow-sm">
              <p className="text-xs font-semibold text-blue-900">Super Admin Configuration Selected</p>
              <p className="text-[11px] text-blue-700 mt-1">
                This role bypasses authorization checks and possesses full wildcard permissions.
                Individual permission assignments are unnecessary and disabled.
              </p>
            </div>
          ) : (
            <div className="card p-4 space-y-4 bg-white border border-gray-200 rounded shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-sm font-semibold text-gray-800">Permissions Grid</h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-[10px] py-1 px-2.5 h-7"
                    disabled={loadingPermissions}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-[10px] py-1 px-2.5 h-7"
                    disabled={loadingPermissions}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {loadingPermissions ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
                  <span className="text-xs text-gray-500">Fetching system permissions...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                  {Object.entries(permissionsByModule).map(([moduleName, perms]) => (
                    <div
                      key={moduleName}
                      className="border border-gray-150 rounded-md p-3 bg-gray-50/40 hover:bg-gray-50/80 transition-colors"
                    >
                      <h4 className="text-xs font-bold text-gray-700 capitalize border-b border-gray-200 pb-1 mb-2">
                        {moduleName.replace('-', ' ')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {perms.map((perm) => {
                          const isChecked = selectedPermissionIds.includes(perm.id);
                          return (
                            <label
                              key={perm.id}
                              className="flex items-center gap-2 cursor-pointer select-none text-[11px]"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handlePermissionToggle(perm.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                              />
                              <span className="text-gray-600 capitalize hover:text-gray-900 transition-colors">
                                {perm.action}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddEditRole;
