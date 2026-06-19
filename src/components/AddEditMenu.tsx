import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createMenuItem, updateMenuItem, fetchAllMenus } from '@/slices/menuSlice';
import { fetchMasterPermissions } from '@/slices/permissionSlice';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import DynamicIcon from '@/components/DynamicIcon';

interface AddEditMenuProps {
  menu?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface MenuFormData {
  name: string;
  menuType: 'main' | 'sub';
  path?: string | null;
  icon?: string | null;
  order: number;
  menuItemId?: any;
  permissionId?: any;
  isActive?: boolean;
}

const menuSchema = z.object({
  name: z.string().min(1, 'Menu name is required'),
  menuType: z.enum(['main', 'sub']),
  path: z.string().nullable().optional().transform(v => v === '' ? null : v),
  icon: z.string().nullable().optional().transform(v => v === '' ? null : v),
  order: z.preprocess((val) => (val === '' || val === undefined ? 0 : Number(val)), z.number().int()),
  menuItemId: z.preprocess((val) => (val === '' || val === '0' || val === undefined || val === null ? null : Number(val)), z.number().int().nullable().optional()),
  permissionId: z.preprocess((val) => (val === '' || val === '0' || val === undefined || val === null ? null : Number(val)), z.number().int().nullable().optional()),
  isActive: z.boolean().optional(),
}).refine((data) => {
  // If submenu is selected, parent menuItemId must be selected
  if (data.menuType === 'sub' && !data.menuItemId) {
    return false;
  }
  return true;
}, {
  message: 'Parent Menu is required for submenus',
  path: ['menuItemId'],
}).refine((data) => {
  // If submenu is selected, route path is mandatory
  if (data.menuType === 'sub' && !data.path) {
    return false;
  }
  return true;
}, {
  message: 'Route Path is required for submenus',
  path: ['path'],
});

// Predefined list of popular Lucide icons
const POPULAR_ICONS = [
  'Home', 'Settings', 'Users', 'Shield', 'Layers', 'ShoppingCart', 'Package', 'MapPin',
  'FileText', 'CheckSquare', 'BarChart2', 'Download', 'Upload', 'CreditCard', 'HelpCircle',
  'List', 'Tags', 'PlusCircle', 'Printer', 'Folder', 'Layout', 'FileSpreadsheet'
];

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

const AddEditMenu: React.FC<AddEditMenuProps> = ({ menu, onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();

  // Redux states
  const { menus } = useAppSelector((state) => state.menu);
  const { allPermissions } = useAppSelector((state) => state.permissions);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MenuFormData>({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      order: 0,
      isActive: true,
      menuType: 'main',
      path: '',
      icon: '',
      menuItemId: '',
      permissionId: '',
    },
  });

  const isActiveValue = watch('isActive');
  const iconValue = watch('icon');
  const menuTypeValue = watch('menuType');

  // Fetch menus and permissions for dropdowns
  useEffect(() => {
    dispatch(fetchAllMenus());
    dispatch(fetchMasterPermissions());
  }, [dispatch]);

  // Set initial form values if editing
  useEffect(() => {
    if (menu) {
      setValue('name', menu.name);
      setValue('menuType', menu.type === 'sub' ? 'sub' : 'main');
      setValue('path', menu.path || '');
      setValue('icon', menu.icon || '');
      setValue('order', menu.order);
      setValue('menuItemId', menu.parentId ? String(menu.parentId) : '');
      setValue('permissionId', menu.permissionId ? String(menu.permissionId) : '');
      setValue('isActive', menu.isActive !== false);
    }
  }, [menu, setValue]);

  const onSubmit = async (data: MenuFormData) => {
    try {
      const isSub = data.menuType === 'sub';
      const submitData = {
        name: data.name,
        path: data.path || null,
        icon: data.icon || null,
        order: data.order,
        menuItemId: isSub ? (data.menuItemId || null) : null,
        permissionId: data.permissionId || null,
        isActive: data.isActive === true,
      };

      if (menu) {
        await dispatch(updateMenuItem({ id: menu.id, data: submitData })).unwrap();
        toast.success('Menu item updated successfully');
      } else {
        await dispatch(createMenuItem(submitData)).unwrap();
        toast.success('Menu item created successfully');
      }
      onSuccess();
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to save menu item';
      toast.error(errorMessage);
    }
  };

  // Only main categories should act as parent menu items (submenus cannot have nested submenus)
  const parentMenuOptions = menus
    .filter((m) => m.type === 'main' && (!menu || m.id !== menu.id))
    .map((m) => ({
      value: String(m.id),
      label: m.name,
    }));

  const permissionOptions = allPermissions.map((p) => ({
    value: String(p.id),
    label: `${p.module} (${p.slug})`,
  }));

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-10">
      {/* Breadcrumb Navigation & Control Bar */}
      <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="hover:text-primary-600 cursor-pointer" onClick={onCancel}>Menus</span>
          <span>/</span>
          <span className="font-semibold text-gray-700">{menu ? menu.name : 'New Menu Item'}</span>
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
        {/* Left Form: Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5 space-y-4 bg-white border border-gray-200 rounded shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-2">Menu Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Menu Type Selector */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Menu Type
                </label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      value="main"
                      checked={menuTypeValue === 'main'}
                      {...register('menuType')}
                      className="text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
                    />
                    <span>Main Menu (Top Level Folder/Link)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      value="sub"
                      checked={menuTypeValue === 'sub'}
                      {...register('menuType')}
                      className="text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
                    />
                    <span>Submenu (Child Item)</span>
                  </label>
                </div>
              </div>

              {/* Menu Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Menu Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Sales Orders, Products, Setup"
                  error={errors.name?.message}
                  {...register('name')}
                  className="w-full text-xs"
                />
              </div>

              {/* Parent Menu (Conditional) */}
              {menuTypeValue === 'sub' && (
                <div className="sm:col-span-2">
                  <Select
                    label="Parent Menu Category *"
                    error={errors.menuItemId?.message as string | undefined}
                    {...register('menuItemId')}
                    className="w-full"
                  >
                    <option value="">Select Parent Category...</option>
                    {parentMenuOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Route Path */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Route Path {menuTypeValue === 'sub' && <span className="text-red-500">*</span>}
                </label>
                <Input
                  placeholder="e.g. /sales-orders, /settings"
                  error={errors.path?.message}
                  {...register('path')}
                  className="w-full text-xs"
                  helperText={menuTypeValue === 'sub' ? "Submenus require route paths." : "Leave empty if this is a parent directory container with no route."}
                />
              </div>

              {/* Order Weight */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Display Order
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 10, 20"
                  error={errors.order?.message}
                  {...register('order')}
                  className="w-full text-xs"
                  helperText="Used to sort menu items (lower values display first)."
                />
              </div>

              {/* Required Permission */}
              <div className="sm:col-span-2">
                <Select
                  label="Required Permission (Optional)"
                  error={errors.permissionId?.message as string | undefined}
                  {...register('permissionId')}
                  className="w-full"
                >
                  <option value="">None (Publicly Visible)</option>
                  {permissionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form: Design (Icon Picker & Status) */}
        <div className="lg:col-span-1 space-y-4">
          {/* Icon Selection */}
          <div className="card p-5 space-y-4 bg-white border border-gray-200 rounded shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-semibold text-gray-800">Menu Visuals</h3>
              {iconValue && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs text-gray-700">
                  <DynamicIcon name={iconValue} className="h-4 w-4" />
                  <span className="font-mono text-[10px]">{iconValue}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Custom Icon Class (Lucide-react)
              </label>
              <Input
                placeholder="e.g. ShoppingCart, Home"
                error={errors.icon?.message}
                {...register('icon')}
                className="w-full text-xs mb-3"
              />

              <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
                Or click to select a popular icon:
              </label>
              <div className="grid grid-cols-6 gap-2 max-h-[160px] overflow-y-auto border border-gray-100 p-2 rounded bg-gray-50/50">
                {POPULAR_ICONS.map((icoName) => (
                  <button
                    key={icoName}
                    type="button"
                    title={icoName}
                    onClick={() => setValue('icon', icoName)}
                    className={`flex items-center justify-center p-2 border rounded hover:bg-white hover:text-primary-600 transition-colors ${
                      iconValue === icoName ? 'bg-primary-50 border-primary-300 text-primary-600' : 'bg-transparent border-gray-200 text-gray-400'
                    }`}
                  >
                    <DynamicIcon name={icoName} className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Status Settings */}
          <div className="card p-5 space-y-4 bg-white border border-gray-200 rounded shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-2">Visibility Settings</h3>
            
            {/* Status Toggle */}
            <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded">
              <div>
                <label className="block text-xs font-semibold text-gray-750">
                  Active Status
                </label>
                <span className="text-[10px] text-gray-500">Enable/disable display in layout sidebar</span>
              </div>
              <ToggleSwitch
                checked={isActiveValue !== false}
                onChange={(checked) => setValue('isActive', checked)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEditMenu;
