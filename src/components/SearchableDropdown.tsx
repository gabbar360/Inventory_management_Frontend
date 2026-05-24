import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface SearchableDropdownProps {
  label: string;
  value: string;
  options: Array<{ name: string; code?: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
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
}: SearchableDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.name === value);

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
      <label className="block text-sm font-medium mb-2 text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-4 py-2 border rounded-lg bg-white text-left flex items-center justify-between transition-colors cursor-pointer ${
          disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'hover:bg-gray-50'
        } ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'}`}
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            placeholder={`Search ${label.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 outline-none bg-transparent text-gray-900"
          />
        ) : (
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {loading ? 'Loading...' : selectedOption?.name || placeholder}
          </span>
        )}
        
        <div className="flex items-center gap-2">
          {selectedOption && !isOpen && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X size={16} className="text-gray-400" />
            </button>
          )}
          <ChevronDown
            size={18}
            className={`transition-transform text-gray-400 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.code || option.name}
                  type="button"
                  onClick={() => handleSelect(option.name)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    selectedOption?.name === option.name
                      ? 'bg-blue-100 text-blue-900 font-medium'
                      : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  {option.name}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-gray-500 text-sm text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
