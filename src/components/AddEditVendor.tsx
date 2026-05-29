import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
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
            {vendor ? 'Edit Vendor' : 'Add New Vendor'}
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Row 1: Vendor Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
              
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
               
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
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
             
              Address
            </label>
            <textarea
              placeholder="Enter address"
              {...register('address')}
              className={`flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.address ? 'border-red-500 focus:ring-red-500' : ''
              }`}
              rows={4}
            />
            {errors.address?.message && <p className="text-sm text-red-600 mt-1">{errors.address.message}</p>}
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
              {vendor ? 'Update Vendor' : 'Save Vendor'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditVendor;
