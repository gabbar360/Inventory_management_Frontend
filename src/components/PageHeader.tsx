import React from 'react';
import { Filter, ArrowUpDown, LayoutGrid } from 'lucide-react';
import Button from './Button';

interface PageHeaderAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'outline';
}

interface PageHeaderProps {
  title: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: PageHeaderAction[];
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  onSearch,
  searchPlaceholder = 'Search...',
  actions = [],
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm mb-3">
      {/* Mobile Control Panel */}
      <div className="md:hidden space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-primary-500 uppercase tracking-wider">Inventory</span>
            <h1 className="text-base font-bold text-gray-800 tracking-tight leading-tight">{title}</h1>
          </div>
          {actions.length > 0 && (
            <div className="flex gap-1">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  onClick={action.onClick}
                  size="sm"
                  className={
                    action.variant === 'primary'
                      ? 'odoo-btn-primary h-7 px-2.5 text-xs'
                      : 'odoo-btn-secondary h-7 px-2.5 text-xs'
                  }
                >
                  {action.icon}
                </Button>
              ))}
            </div>
          )}
        </div>
        {onSearch && (
          <div className="relative">
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="pr-3 py-1.5 w-full border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none text-xs bg-gray-50/50"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Desktop Control Panel - Real Odoo Style Grid */}
      <div className="hidden md:grid md:grid-cols-2 gap-2 items-center">
        {/* Left Side: Breadcrumb Path and Primary Actions */}
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="hover:text-primary-600 cursor-pointer">Inventory</span>
            <span>/</span>
            <span className="font-semibold text-gray-700">{title}</span>
          </div>
          {actions.length > 0 && (
            <div className="flex gap-1.5 pt-0.5">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  onClick={action.onClick}
                  size="sm"
                  className={
                    action.variant === 'primary'
                      ? 'odoo-btn-primary h-7.5 text-xs px-3'
                      : 'odoo-btn-secondary h-7.5 text-xs px-3'
                  }
                >
                  {action.icon}
                  <span className="ml-1.5">{action.label}</span>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Search and View Mode Switchers */}
        <div className="flex items-center justify-end gap-2">
          {onSearch && (
            <div className="relative flex-1 max-w-[240px]">
              <input
                type="text"
                placeholder={searchPlaceholder}
                className="pr-3 py-1.5 w-full border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none text-xs bg-gray-50/50"
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
          )}

          {/* Odoo Standard Search Filters Placeholder Dropdowns */}
          <div className="flex bg-gray-100 rounded border border-gray-300 p-0.5">
            <button className="p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-white transition-colors" title="Filters">
              <Filter className="h-3.5 w-3.5" />
            </button>
            <button className="p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-white transition-colors" title="Group By">
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
            <button className="p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-white transition-colors" title="Favorites">
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
