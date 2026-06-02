import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store/hooks';
import { createVendor, updateVendor } from '@/slices/vendorSlice';
import { Vendor } from '@/types';
import Button from '@/components/Button';
import Input from '@/components/Input';

interface AddEditVendorProps {
  vendor?: Vendor;
  onSuccess: () => void;
  onCancel: () => void;
}

interface VendorFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const AddEditVendor: React.FC<AddEditVendorProps> = ({ vendor, onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
  });

  // Update form when vendor data is available
  useEffect(() => {
    if (vendor) {
      setValue('name', vendor.name);
      setValue('email', vendor.email || '');
      setValue('phone', vendor.phone || '');
      setValue('address', vendor.address || '');
    }
  }, [vendor, setValue]);

  const onSubmit = async (data: VendorFormData) => {
    try {
      if (vendor) {
        await dispatch(updateVendor({ id: vendor.id, data })).unwrap();
        toast.success('Vendor updated successfully');
      } else {
        await dispatch(createVendor(data)).unwrap();
        toast.success('Vendor created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save vendor');
    }
  };

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Odoo style Breadcrumb Navigation & Control Bar */}
      <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="hover:text-primary-600 cursor-pointer" onClick={onCancel}>Vendors</span>
          <span>/</span>
          <span className="font-semibold text-gray-700">{vendor ? vendor.name : 'New Vendor'}</span>
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
          {/* Row 1: Vendor Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Vendor Name
            </label>
            <Input
              placeholder="Enter vendor name"
              error={errors.name?.message}
              {...register('name')}
              className="w-full"
            />
          </div>

          {/* Row 2: Email and Phone */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Phone
              </label>
              <Input
                placeholder="Enter phone number"
                error={errors.phone?.message}
                {...register('phone')}
                className="w-full"
              />
            </div>
          </div>

          {/* Row 3: Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Address
            </label>
            <textarea
              placeholder="Enter address"
              {...register('address')}
              className={`flex w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                errors.address ? 'border-red-500 focus:ring-red-500' : ''
              }`}
              rows={4}
            />
            {errors.address?.message && <p className="text-xs text-red-650 mt-1">{errors.address.message}</p>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditVendor;
