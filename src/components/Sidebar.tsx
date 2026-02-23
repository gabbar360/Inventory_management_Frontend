import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  Building2,
  MapPin,
  ArrowDownToLine,
  ArrowUpFromLine,
  Warehouse,
  LogOut,
  User,
  Menu,
  FolderTree,
  Box,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/slices/authSlice';
import { cn } from '@/utils';
import Button from '@/components/Button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Categories', href: '/categories', icon: FolderTree },
  { name: 'Products', href: '/products', icon: Box },
  { name: 'Vendors', href: '/vendors', icon: Users },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Warehouse', href: '/locations', icon: MapPin },
  { name: 'Inward', href: '/inward', icon: ArrowDownToLine },
  { name: 'Outward', href: '/outward', icon: ArrowUpFromLine },
  { name: 'Inventory', href: '/inventory', icon: Warehouse },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  return (
    <div
      className={cn(
        'bg-white shadow-lg sidebar-transition',
        isOpen ? 'w-64' : 'w-16'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-gray-200 px-2">
          {isOpen && (
            <div className="flex items-center space-x-2 flex-1">
              <Building2 className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">
                Inventory
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="p-2 ml-auto -mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    isActive ? 'text-primary-500' : 'text-gray-400'
                  )}
                />
                {isOpen && item.name}
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                <User className="h-4 w-4 text-primary-600" />
              </div>
            </div>
            {isOpen && (
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            )}
          </div>
          {isOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="mt-2 w-full justify-start"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
