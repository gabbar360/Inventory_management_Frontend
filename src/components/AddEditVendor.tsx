import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store/hooks';
import { createVendor, updateVendor } from '@/slices/vendorSlice';
import { Vendor } from '@/types';
import { cn } from '@/utils';
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
  state?: string;
  gstNumber?: string;
}

const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  state: z.string().optional(),
  gstNumber: z.string().optional(),
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
      state: '',
      gstNumber: '',
    },
  });

  const [stateSearch, setStateSearch] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [indianStates, setIndianStates] = useState<string[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const stateDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: 'India' }),
        });
        const result = await response.json();
        if (!result.error && result.data?.states) {
          setIndianStates(result.data.states.map((s: { name: string }) => s.name));
        }
      } catch (err) {
        console.error('Error fetching Indian states:', err);
      } finally {
        setLoadingStates(false);
      }
    };
    fetchStates();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
        setShowStateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (vendor) {
      setValue('name', vendor.name);
      setValue('email', vendor.email || '');
      setValue('phone', vendor.phone || '');
      setValue('address', vendor.address || '');
      setValue('state', vendor.state || '');
      setValue('gstNumber', vendor.gstNumber || '');
      setStateSearch(vendor.state || '');
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
              Vendor Name <span className="text-red-500">*</span>
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                placeholder="Enter email address"
                error={errors.email?.message}
                {...register('email')}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
              <Input
                placeholder="Enter phone number"
                error={errors.phone?.message}
                {...register('phone')}
                className="w-full"
              />
            </div>
          </div>

          {/* Row 3: State and GST Number */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="relative" ref={stateDropdownRef}>
              <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search or select Indian state/UT"
                  className={cn(
                    'flex h-8.5 w-full rounded-md border border-gray-300 bg-white pl-3 pr-10 py-1.5 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
                    errors.state && 'border-red-500 focus:ring-red-550'
                  )}
                  value={stateSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStateSearch(val);
                    setValue('state', val);
                    setShowStateDropdown(true);
                  }}
                  onFocus={() => setShowStateDropdown(true)}
                />
                <input type="hidden" {...register('state')} />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {stateSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setStateSearch('');
                        setValue('state', '');
                        setShowStateDropdown(true);
                      }}
                      className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowStateDropdown(!showStateDropdown)}
                    className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', showStateDropdown && 'transform rotate-180')} />
                  </button>
                </div>
              </div>
              {errors.state && <p className="text-xs text-red-650 mt-1">{errors.state.message}</p>}

              {showStateDropdown && (
                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded bg-white py-1 text-xs shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200 divide-y divide-gray-50">
                  {loadingStates ? (
                    <div className="px-3 py-2 text-gray-500 text-[11px] flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></span>
                      <span>Fetching states...</span>
                    </div>
                  ) : indianStates.filter((state) =>
                    state.toLowerCase().includes(stateSearch.toLowerCase())
                  ).length > 0 ? (
                    indianStates
                      .filter((state) => state.toLowerCase().includes(stateSearch.toLowerCase()))
                      .map((state) => (
                        <button
                          key={state}
                          type="button"
                          className={cn(
                            'w-full text-left px-3 py-1.5 hover:bg-primary-50 hover:text-primary-900 transition-colors flex items-center justify-between',
                            stateSearch.toLowerCase() === state.toLowerCase() && 'bg-primary-50 text-primary-900 font-semibold'
                          )}
                          onClick={() => {
                            setStateSearch(state);
                            setValue('state', state);
                            setShowStateDropdown(false);
                          }}
                        >
                          <span>{state}</span>
                          {stateSearch.toLowerCase() === state.toLowerCase() && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-600"></span>
                          )}
                        </button>
                      ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500 text-[11px] italic">No matching states found</div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">GST Number</label>
              <Input
                placeholder="Enter GST number"
                error={errors.gstNumber?.message}
                {...register('gstNumber')}
                className="w-full"
              />
            </div>
          </div>

          {/* Row 4: Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
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
