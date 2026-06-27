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
  filterNode?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  onSearch,
  searchPlaceholder = 'Search...',
  actions = [],
  filterNode,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm mb-3">
      {/* Mobile Control Panel (< 768px) */}
      <div className="md:hidden space-y-2">
        {/* Top Row: Title + Action Buttons — flex-wrap so they never overflow */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-bold text-primary-500 uppercase tracking-wider">Inventory</span>
            <h1 className="text-sm font-bold text-gray-800 tracking-tight leading-tight">{title}</h1>
          </div>
          {actions.length > 0 && (
            <div className="flex gap-1 flex-shrink-0">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  onClick={action.onClick}
                  title={action.label}
                  size="sm"
                  className={
                    action.variant === 'primary'
                      ? 'odoo-btn-primary h-7 px-2 text-xs font-medium whitespace-nowrap'
                      : 'odoo-btn-secondary h-7 w-7 p-0 flex items-center justify-center'
                  }
                >
                  {action.variant === 'primary' ? (
                    <span className="text-xs leading-none">{action.label}</span>
                  ) : (
                    action.icon
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>
        {/* Search Bar & Custom Filters — full width below */}
        <div className="flex flex-col gap-2">
          {filterNode && (
            <div className="w-full">
              {filterNode}
            </div>
          )}
          {onSearch && (
            <div>
              <input
                type="text"
                placeholder={searchPlaceholder}
                className="px-3 py-1.5 w-full border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none text-xs bg-gray-50/50"
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Desktop Control Panel (>= 768px) */}
      <div className="hidden md:grid md:grid-cols-2 gap-2 items-center">
        {/* Left: Breadcrumb + Actions */}
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="hover:text-primary-600 cursor-pointer">Inventory</span>
            <span>/</span>
            <span className="font-semibold text-gray-700">{title}</span>
          </div>
          {actions.length > 0 && (
            <div className="flex gap-1.5 pt-0.5 flex-wrap">
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

        <div className="flex items-center justify-end gap-2">
          {filterNode && (
            <div className="relative flex-1 max-w-[240px] text-left">
              {filterNode}
            </div>
          )}
          {onSearch && (
            <div className="relative flex-1 max-w-[240px]">
              <input
                type="text"
                placeholder={searchPlaceholder}
                className="px-3 py-1.5 w-full border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none text-xs bg-gray-50/50"
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
          )}
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
