import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MapPin,
  ArrowDownToLine,
  ArrowUpFromLine,
  Warehouse,
  LogOut,
  Menu,
  FolderTree,
  Box,
  Power,
} from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { logoutUser, logoutAllDevices } from '@/slices/authSlice';
import { cn } from '@/utils';
import Button from '@/components/Button';
import toast from 'react-hot-toast';

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
  const navigate = useNavigate();
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const handleLogoutAll = async () => {
    try {
      await dispatch(logoutAllDevices()).unwrap();
      toast.success('Logged out from all devices');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'bg-white shadow-lg transition-all duration-300 ease-in-out z-50',
          'fixed lg:relative inset-y-0 left-0',
          'lg:translate-x-0',
          isOpen
            ? 'translate-x-0 w-64'
            : '-translate-x-full lg:translate-x-0 lg:w-16'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-gray-200 px-2">
            {isOpen ? (
              <>
                <div className="flex-1" />
                <span className="text-xl font-bold text-gray-900">
                  Inventory
                </span>
                <div className="flex-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggle}
                    className="p-2"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </div>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="p-2 mx-auto"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={handleLinkClick}
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

          {/* Logout Button */}
          <div className="border-t border-gray-200 p-4">
            {isOpen ? (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogoutAll}
                  className="w-full justify-start text-red-700 hover:text-red-800 hover:bg-red-50"
                >
                  <Power className="mr-2 h-4 w-4" />
                  Logout All Devices
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                  className="w-full justify-center p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
                {showLogoutMenu && (
                  <div className="absolute bottom-full left-full ml-2 mb-2 bg-white shadow-lg rounded-md border border-gray-200 py-1 min-w-[180px] z-50">
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowLogoutMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </button>
                    <button
                      onClick={() => {
                        handleLogoutAll();
                        setShowLogoutMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center"
                    >
                      <Power className="mr-2 h-4 w-4" />
                      Logout All
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
