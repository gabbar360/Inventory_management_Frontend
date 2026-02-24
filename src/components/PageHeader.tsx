import React from 'react';
import { Search } from 'lucide-react';
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        
        {onSearch && (
          <div className="relative w-full sm:w-64 sm:ml-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        )}
        
        {actions.length > 0 && (
          <div className="flex gap-2 sm:ml-auto">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'outline'}
                onClick={action.onClick}
                size="sm"
              >
                {action.icon}
                <span className="hidden sm:inline ml-2">{action.label}</span>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
