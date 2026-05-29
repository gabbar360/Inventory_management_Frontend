import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
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
            {location ? 'Edit Location' : 'Add New Location'}
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Location Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
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
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
              Address (Optional)
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
              {location ? 'Update Location' : 'Save Location'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditLocation;
