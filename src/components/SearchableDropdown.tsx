import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/utils';

interface SearchableDropdownProps {
  label?: string;
  value: string;
  options: Array<{ name: string; code?: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
  className?: string;
}

export const SearchableDropdown = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  loading = false,
  required = false,
  className,
}: SearchableDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.name === value);
  const hasBg = className?.includes('bg-');
  const hasRounded = className?.includes('rounded');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionName: string) => {
    onChange(optionName);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold mb-1 text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "w-full px-2.5 h-8.5 border text-left flex items-center justify-between transition-colors cursor-pointer text-xs",
          !hasRounded && "rounded-sm",
          !hasBg && "bg-white",
          disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'hover:bg-gray-50',
          isOpen ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-300',
          className
        )}
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            placeholder={selectedOption ? selectedOption.name : placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="dropdown-search-input flex-1 outline-none bg-transparent border-none p-0 shadow-none focus:ring-0 text-gray-900 text-xs h-full placeholder:text-gray-400"
          />
        ) : (
          <span className={selectedOption ? 'text-gray-900 font-medium' : 'text-gray-500'}>
            {loading ? 'Loading...' : selectedOption?.name || placeholder}
          </span>
        )}
        
        <div className="flex items-center gap-1.5">
          {selectedOption && !isOpen && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-200 rounded-full"
            >
              <X size={12} className="text-gray-400" />
            </button>
          )}
          {!isOpen && (
            <ChevronDown
              size={14}
              className="transition-transform text-gray-400"
            />
          )}
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50">
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.code || option.name}
                  type="button"
                  onClick={() => handleSelect(option.name)}
                  className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${
                    selectedOption?.name === option.name
                      ? 'bg-blue-100 text-blue-900 font-semibold'
                      : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  {option.name}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500 text-xs text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
