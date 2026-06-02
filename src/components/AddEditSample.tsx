import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store/hooks';
import { createSample, updateSample } from '@/slices/sampleSlice';
import { Sample } from '@/types';
import Button from '@/components/Button';
import Input from '@/components/Input';

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
    <div className="space-y-3 animate-fadeIn">
      {/* Odoo style Breadcrumb Navigation & Control Bar */}
      <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="hover:text-primary-600 cursor-pointer" onClick={onCancel}>Product Samples</span>
          <span>/</span>
          <span className="font-semibold text-gray-700">{sample ? sample.customerName : 'New Sample'}</span>
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
          {/* Row 1: Customer Name and Email */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Sample Type
              </label>
              <select
                {...register('sampleType')}
                className={`flex h-8.5 w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.sampleType ? 'border-red-500 focus:ring-red-550' : ''
                }`}
              >
                <option value="domestic">Domestic</option>
                <option value="export">Export</option>
              </select>
              {errors.sampleType?.message && <p className="text-xs text-red-650 mt-1">{errors.sampleType.message}</p>}
            </div>
          </div>

          {/* Row 4: Kit Price and Dispatch Method */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Remarks (Optional)
            </label>
            <textarea
              placeholder="Enter remarks"
              {...register('remarks')}
              className={`flex w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                errors.remarks ? 'border-red-500 focus:ring-red-550' : ''
              }`}
              rows={4}
            />
            {errors.remarks?.message && <p className="text-xs text-red-650 mt-1">{errors.remarks.message}</p>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditSample;
