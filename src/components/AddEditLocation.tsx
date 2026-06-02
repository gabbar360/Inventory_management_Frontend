import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store/hooks';
import { createLocation, updateLocation } from '@/slices/locationSlice';
import { Location } from '@/types';
import Button from '@/components/Button';
import Input from '@/components/Input';

interface AddEditLocationProps {
  location?: Location;
  onSuccess: () => void;
  onCancel: () => void;
}

interface LocationFormData {
  name: string;
  address?: string;
}

const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  address: z.string().optional(),
});

const AddEditLocation: React.FC<AddEditLocationProps> = ({ location, onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: '',
      address: '',
    },
  });

  useEffect(() => {
    if (location) {
      setValue('name', location.name);
      setValue('address', location.address || '');
    }
  }, [location, setValue]);

  const onSubmit = async (data: LocationFormData) => {
    try {
      if (location) {
        await dispatch(updateLocation({ id: location.id, data })).unwrap();
        toast.success('Location updated successfully');
      } else {
        await dispatch(createLocation(data)).unwrap();
        toast.success('Location created successfully');
      }
      onSuccess();
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to save location';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Odoo style Breadcrumb Navigation & Control Bar */}
      <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="hover:text-primary-600 cursor-pointer" onClick={onCancel}>Warehouse Locations</span>
          <span>/</span>
          <span className="font-semibold text-gray-700">{location ? location.name : 'New Location'}</span>
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
          {/* Location Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Location Name
            </label>
            <Input
              placeholder="Enter location name"
              error={errors.name?.message}
              {...register('name')}
              className="w-full"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Address (Optional)
            </label>
            <textarea
              placeholder="Enter address"
              {...register('address')}
              className={`flex w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
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

export default AddEditLocation;
