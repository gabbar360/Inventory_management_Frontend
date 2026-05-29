import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ChevronDown, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store/hooks';
import { createCustomer, updateCustomer } from '@/slices/customerSlice';
import { Customer } from '@/types';
import { cn } from '@/utils';
import Button from '@/components/Button';
import Input from '@/components/Input';

interface AddEditCustomerProps {
  customer?: Customer;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
  state?: string;
}

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  state: z.string().optional(),
});

const AddEditCustomer: React.FC<AddEditCustomerProps> = ({ customer, onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      gstNumber: '',
      state: '',
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
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ country: 'India' }),
        });
        const result = await response.json();
        if (!result.error && result.data && result.data.states) {
          const statesList = result.data.states.map((s: { name: string }) => s.name);
          setIndianStates(statesList);
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
      if (
        stateDropdownRef.current &&
        !stateDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (customer) {
      setValue('name', customer.name);
      setValue('email', customer.email || '');
      setValue('phone', customer.phone || '');
      setValue('address', customer.address || '');
      setValue('gstNumber', customer.gstNumber || '');
      setValue('state', customer.state || '');
      setStateSearch(customer.state || '');
    }
  }, [customer, setValue]);

  const onSubmit = async (data: CustomerFormData) => {
    try {
      if (customer) {
        await dispatch(updateCustomer({ id: customer.id, data })).unwrap();
        toast.success('Customer updated');
      } else {
        await dispatch(createCustomer(data)).unwrap();
        toast.success('Customer created');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save');
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
            {customer ? 'Edit Customer' : 'Add New Customer'}
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Row 1: Name and Email */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
               
                Customer Name
              </label>
              <Input
                placeholder="Enter customer name"
                error={errors.name?.message}
                {...register('name')}
                className="w-full"
              />
            </div>

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
          </div>

          {/* Row 2: Phone and Address */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
               
                Address
              </label>
              <Input
                placeholder="Enter address"
                error={errors.address?.message}
                {...register('address')}
                className="w-full"
              />
            </div>
          </div>

          {/* Row 3: State and GST Number */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative space-y-1" ref={stateDropdownRef}>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
              
                State
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search or select Indian state/UT"
                  className={cn(
                    'flex h-10 w-full rounded-md border border-gray-300 bg-white pl-3 pr-10 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
                    errors.state && 'border-red-500 focus:ring-red-500'
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
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowStateDropdown(!showStateDropdown)}
                    className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showStateDropdown && "transform rotate-180")} />
                  </button>
                </div>
              </div>
              {errors.state && (
                <p className="text-xs sm:text-sm text-red-600">{errors.state.message}</p>
              )}

              {/* Dropdown Suggestions */}
              {showStateDropdown && (
                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200 divide-y divide-gray-50">
                  {loadingStates ? (
                    <div className="px-4 py-3 text-gray-500 text-xs flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></span>
                      <span>Fetching states...</span>
                    </div>
                  ) : indianStates.filter((state) =>
                    state.toLowerCase().includes(stateSearch.toLowerCase())
                  ).length > 0 ? (
                    indianStates.filter((state) =>
                      state.toLowerCase().includes(stateSearch.toLowerCase())
                    ).map((state) => (
                      <button
                        key={state}
                        type="button"
                        className={cn(
                          'w-full text-left px-4 py-2 hover:bg-primary-50 hover:text-primary-900 transition-colors flex items-center justify-between',
                          stateSearch.toLowerCase() === state.toLowerCase() && 'bg-primary-50 text-primary-900 font-medium'
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
                    <div className="px-4 py-3 text-gray-500 text-xs italic">
                      No matching states found
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                
                GST Number
              </label>
              <Input
                placeholder="Enter GST number"
                error={errors.gstNumber?.message}
                {...register('gstNumber')}
                className="w-full"
              />
            </div>
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
              {customer ? 'Update Customer' : 'Save Customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditCustomer;
