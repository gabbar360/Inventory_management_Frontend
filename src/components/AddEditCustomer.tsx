import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, X } from 'lucide-react';
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
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  shippingAddress?: string;
  gstNumber?: string;
  state?: string;
  reference?: string;
}

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  companyName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  shippingAddress: z.string().optional(),
  gstNumber: z.string().optional(),
  state: z.string().optional(),
  reference: z.string().optional(),
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
      companyName: '',
      email: '',
      phone: '',
      address: '',
      shippingAddress: '',
      gstNumber: '',
      state: '',
      reference: '',
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
      setValue('companyName', customer.companyName || '');
      setValue('email', customer.email || '');
      setValue('phone', customer.phone || '');
      setValue('address', customer.address || '');
      setValue('shippingAddress', customer.shippingAddress || '');
      setValue('gstNumber', customer.gstNumber || '');
      setValue('state', customer.state || '');
      setValue('reference', customer.reference || '');
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
    <div className="space-y-3 animate-fadeIn">
      {/* Odoo style Breadcrumb Navigation & Control Bar */}
      <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="hover:text-primary-600 cursor-pointer" onClick={onCancel}>Customers</span>
          <span>/</span>
          <span className="font-semibold text-gray-700">{customer ? customer.name : 'New Customer'}</span>
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Row 1: Customer Name and Company Name */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
               Company Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter Company Name"
                error={errors.name?.message}
                {...register('name')}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Name</label>
              <Input
                placeholder="Enter Customer Name"
                error={errors.companyName?.message}
                {...register('companyName')}
                className="w-full"
              />
            </div>
          </div>

          {/* Row 2: Email and Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
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
              <label className="block text-xs font-semibold text-gray-600 mb-1">
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

          {/* Row 3: GST Number and State */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                GST Number
              </label>
              <Input
                placeholder="Enter GST number"
                error={errors.gstNumber?.message}
                {...register('gstNumber')}
                className="w-full"
              />
            </div>

            <div className="relative" ref={stateDropdownRef}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                State
              </label>
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
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showStateDropdown && "transform rotate-180")} />
                  </button>
                </div>
              </div>
              {errors.state && (
                <p className="text-xs text-red-650 mt-1">{errors.state.message}</p>
              )}

              {/* Dropdown Suggestions */}
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
                    indianStates.filter((state) =>
                      state.toLowerCase().includes(stateSearch.toLowerCase())
                    ).map((state) => (
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
                    <div className="px-3 py-2 text-gray-500 text-[11px] italic">
                      No matching states found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Billing Address and Shipping Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Billing Address
              </label>
              <Input
                placeholder="Enter billing address"
                error={errors.address?.message}
                {...register('address')}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Shipping Address <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <Input
                placeholder="Enter shipping address"
                error={errors.shippingAddress?.message}
                {...register('shippingAddress')}
                className="w-full"
              />
            </div>
          </div>

          {/* Row 5: Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Reference <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <Input
                placeholder="Enter reference details"
                error={errors.reference?.message}
                {...register('reference')}
                className="w-full"
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditCustomer;
