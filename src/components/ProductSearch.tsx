import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { productService } from '@/services/productService';
import { Product } from '@/types';

interface ProductSearchProps {
  value?: string;
  onChange: (productId: string, product?: Product) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

const ProductSearch: React.FC<ProductSearchProps> = ({
  value,
  onChange,
  placeholder = "Search and select product...",
  error,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (search.length >= 2) {
      loadProducts();
    } else {
      setProducts([]);
    }
  }, [search]);

  useEffect(() => {
    if (value && !selectedProduct) {
      // Load the selected product details if we have a value but no selected product
      loadSelectedProduct();
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await productService.getAll({
        search,
        limit: 20,
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedProduct = async () => {
    if (!value) return;
    try {
      const product = await productService.getById(value);
      setSelectedProduct(product);
    } catch (error) {
      console.error('Failed to load selected product:', error);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSearch('');
    setIsOpen(false);
    onChange(product.id, product);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setSearch(searchValue);
    setIsOpen(true);
    
    if (!searchValue) {
      setSelectedProduct(null);
      onChange('');
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (products.length === 0 && search.length >= 2) {
      loadProducts();
    }
  };

  const displayValue = selectedProduct 
    ? `${selectedProduct.name}${selectedProduct.grade ? ` (${selectedProduct.grade})` : ''}`
    : search;

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Product *
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-10 pr-10 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
          ) : products.length > 0 ? (
            products.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductSelect(product)}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">
                  {product.name}
                  {product.grade && (
                    <span className="ml-2 text-sm text-gray-600">({product.grade})</span>
                  )}
                </div>
                {product.category && (
                  <div className="text-sm text-gray-500">{product.category.name}</div>
                )}
              </div>
            ))
          ) : search.length >= 2 ? (
            <div className="px-4 py-2 text-sm text-gray-500">No products found</div>
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">Type at least 2 characters to search</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearch;