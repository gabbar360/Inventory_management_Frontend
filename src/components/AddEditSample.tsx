import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store/hooks';
import { createSample, updateSample } from '@/slices/sampleSlice';
import { Sample } from '@/types';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';

interface AddEditSampleProps {
  sample?: Sample;
  onSuccess: () => void;
  onCancel: () => void;
}

interface SampleFormData {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  sentBy: string;
  sampleType: 'domestic' | 'export';
  kitPrice: number;
  trackingNumber?: string;
  dispatchMethod: string;
  sentDate: string;
  remarks?: string;
}

const sampleSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  sentBy: z.string().min(1, 'Employee name is required'),
  sampleType: z.enum(['domestic', 'export']),
  kitPrice: z.number().min(0, 'Kit price must be positive'),
  trackingNumber: z.string().optional(),
  dispatchMethod: z.string().min(1, 'Dispatch method is required'),
  sentDate: z.string().min(1, 'Sent date is required'),
  remarks: z.string().optional(),
});

const AddEditSample: React.FC<AddEditSampleProps> = ({ sample, onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SampleFormData>({
    resolver: zodResolver(sampleSchema),
    defaultValues: {
      sampleType: 'domestic',
      dispatchMethod: '',
      kitPrice: 0,
      sentDate: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (sample) {
      setValue('customerName', sample.customerName);
      setValue('customerEmail', sample.customerEmail || '');
      setValue('customerPhone', sample.customerPhone || '');
      setValue('customerAddress', sample.customerAddress || '');
      setValue('sentBy', sample.sentBy);
      setValue('sampleType', sample.sampleType);
      setValue('kitPrice', sample.kitPrice);
      setValue('trackingNumber', sample.trackingNumber || '');
      setValue('dispatchMethod', sample.dispatchMethod);
      setValue('sentDate', sample.sentDate.split('T')[0]);
      setValue('remarks', sample.remarks || '');
    }
  }, [sample, setValue]);

  const onSubmit = async (data: SampleFormData) => {
    try {
      if (sample) {
        await dispatch(updateSample({ id: sample.id, data: data as Partial<Sample> })).unwrap();
        toast.success('Sample updated successfully');
      } else {
        await dispatch(createSample(data as Partial<Sample>)).unwrap();
        toast.success('Sample created successfully');
      }
      onSuccess();
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to save sample';
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
            {sample ? 'Edit Sample' : 'Add New Sample'}
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Row 1: Customer Name and Email */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                Customer Name
              </label>
              <Input
                placeholder="Enter customer name"
                error={errors.customerName?.message}
                {...register('customerName')}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                Customer Email (Optional)
              </label>
              <Input
                type="email"
                placeholder="Enter customer email"
                error={errors.customerEmail?.message}
                {...register('customerEmail')}
                className="w-full"
              />
            </div>
          </div>

          {/* Row 2: Phone and Address */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                Customer Phone (Optional)
              </label>
              <Input
                placeholder="Enter customer phone"
                error={errors.customerPhone?.message}
                {...register('customerPhone')}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                Customer Address (Optional)
              </label>
              <Input
                placeholder="Enter customer address"
                error={errors.customerAddress?.message}
                {...register('customerAddress')}
                className="w-full"
              />
            </div>
          </div>

          {/* Row 3: Sent By and Sample Type */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                Sent By (Employee Name)
              </label>
              <Input
                placeholder="Enter employee name"
                error={errors.sentBy?.message}
                {...register('sentBy')}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                Sample Type
              </label>
              <Select label="" error={errors.sampleType?.message} {...register('sampleType')}>
                <option value="domestic">Domestic</option>
                <option value="export">Export</option>
              </Select>
            </div>
          </div>

          {/* Row 4: Kit Price and Dispatch Method */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                Kit Price
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter kit price"
                error={errors.kitPrice?.message}
                {...register('kitPrice', { valueAsNumber: true })}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                Dispatch Method
              </label>
              <Input
                placeholder="Enter dispatch method"
                error={errors.dispatchMethod?.message}
                {...register('dispatchMethod')}
                className="w-full"
              />
            </div>
          </div>

          {/* Row 5: Tracking Number and Sent Date */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                Tracking Number (Optional)
              </label>
              <Input
                placeholder="Enter tracking number"
                error={errors.trackingNumber?.message}
                {...register('trackingNumber')}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                Sent Date
              </label>
              <Input
                type="date"
                error={errors.sentDate?.message}
                {...register('sentDate')}
                className="w-full"
              />
            </div>
          </div>

          {/* Row 6: Remarks */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
              Remarks (Optional)
            </label>
            <textarea
              placeholder="Enter remarks"
              {...register('remarks')}
              className={`flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.remarks ? 'border-red-500 focus:ring-red-500' : ''
              }`}
              rows={4}
            />
            {errors.remarks?.message && <p className="text-sm text-red-600 mt-1">{errors.remarks.message}</p>}
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
              {sample ? 'Update Sample' : 'Save Sample'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditSample;
