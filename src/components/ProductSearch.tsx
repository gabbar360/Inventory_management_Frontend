import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
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
  placeholder = 'Search and select product and SKU',
  error,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAllProducts();
  }, []);

  useEffect(() => {
    if (search) {
      const filtered = allProducts.filter((p) =>
        `${p.name} ${p.grade || ''} ${p.sku || ''}`.toLowerCase().includes(search.toLowerCase())
      );
      setProducts(filtered);
    } else {
      setProducts(allProducts);
    }
  }, [search, allProducts]);

  useEffect(() => {
    if (!value || value === '0') {
      setSelectedProduct(null);
      setSearch('');
    } else if (value && value !== 'NaN') {
      if (!selectedProduct || selectedProduct.id.toString() !== value) {
        // Load the selected product details if value changes
        loadSelectedProduct();
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAllProducts = async () => {
    setLoading(true);
    try {
      const response = await productService.getAll({
        limit: 10000,
      });
      setAllProducts(response.data);
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
  };

  const handleChevronClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      inputRef.current?.focus();
    }
  };

  const displayValue = selectedProduct
    ? `${selectedProduct.name}${selectedProduct.grade ? ` (${selectedProduct.grade})` : ''}`
    : search;

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-semibold text-gray-700 mb-1">
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
          className={`w-full pr-7 h-8.5 text-xs border rounded-sm outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        <ChevronDown 
          className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 cursor-pointer" 
          onClick={handleChevronClick}
        />
      </div>

      {error && <p className="mt-1 text-xs text-red-650">{error}</p>}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-52 overflow-auto">
          {loading ? (
            <div className="px-3 py-1.5 text-xs text-gray-500">Loading...</div>
          ) : products.length > 0 ? (
            products.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductSelect(product)}
                className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="font-semibold text-xs text-gray-900">
                  {product.name}
                  {product.grade && (
                    <span className="ml-1.5 text-[10px] text-gray-500 font-normal">
                      ({product.grade})
                    </span>
                  )}
                  {product.sku && (
                    <span className="ml-1.5 text-[10px] text-blue-600 font-normal">
                      SKU: {product.sku}
                    </span>
                  )}
                </div>
                {product.category && (
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {product.category.name}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="px-3 py-1.5 text-xs text-gray-500">
              No products found
            </div>
          )}
        </div>
      )}
    </div>
  );

};

export default ProductSearch;
