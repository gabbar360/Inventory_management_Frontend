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
  FlaskConical,
  FileText,
  Megaphone,
  TrendingUp,
  ClipboardList,
  ShoppingCart,
  ShoppingBag,
  ChevronDown,
  ChevronRight,
  Globe,
  Truck,
} from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { logoutUser } from '@/slices/authSlice';
import { cn } from '@/utils';
import Button from '@/components/Button';
import toast from 'react-hot-toast';

const topNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Megaphone },
  { name: 'Website Quotes', href: '/website-quotes', icon: Globe },
  { name: 'Categories', href: '/categories', icon: FolderTree },
  { name: 'Products', href: '/products', icon: Box },
];

const purchaseItems = [
  { name: 'Vendors', href: '/vendors', icon: Users },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
  { name: 'Inward', href: '/inward', icon: ArrowDownToLine },
];

const salesItems = [
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Quotes', href: '/quotes', icon: FileText },
  { name: 'Sales Orders', href: '/sales-orders', icon: ClipboardList },
  { name: 'Order Dispatch', href: '/order-dispatch', icon: Truck },
  { name: 'Outward', href: '/outward', icon: ArrowUpFromLine },
];

const userManagementItems = [
  { name: 'Roles', href: '/roles', icon: Users },
  { name: 'Users', href: '/users', icon: Users },
];

const bottomNavigation = [
  { name: 'Warehouse', href: '/locations', icon: MapPin },
  { name: 'Inventory', href: '/inventory', icon: Warehouse },
  { name: 'Samples', href: '/samples', icon: FlaskConical },
  { name: 'Profit & Loss', href: '/profit-loss', icon: TrendingUp },
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
  const [purchaseOpen, setPurchaseOpen] = useState(
    purchaseItems.some((i) => location.pathname === i.href)
  );
  const [salesOpen, setSalesOpen] = useState(
    salesItems.some((i) => location.pathname === i.href)
  );
  const [userManagementOpen, setUserManagementOpen] = useState(
    userManagementItems.some((i) => location.pathname === i.href)
  );

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success('Logged out successfully');
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

  const navLink = (item: { name: string; href: string; icon: React.ElementType }) => {
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
            'h-5 w-5 flex-shrink-0',
            isOpen ? 'mr-3' : 'mx-auto',
            isActive ? 'text-primary-500' : 'text-gray-400'
          )}
        />
        {isOpen && item.name}
      </Link>
    );
  };

  const dropdownGroup = (
    label: string,
    Icon: React.ElementType,
    items: typeof purchaseItems,
    open: boolean,
    setOpen: (v: boolean) => void
  ) => {
    const isGroupActive = items.some((i) => location.pathname === i.href);
    return (
      <div>
        <button
          onClick={() => {
            if (!isOpen) onToggle();
            else setOpen(!open);
          }}
          className={cn(
            'w-full group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
            isGroupActive
              ? 'bg-primary-100 text-primary-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )}
        >
          <Icon
            className={cn(
              'h-5 w-5 flex-shrink-0',
              isOpen ? 'mr-3' : 'mx-auto',
              isGroupActive ? 'text-primary-500' : 'text-gray-400'
            )}
          />
          {isOpen && (
            <>
              <span className="flex-1 text-left">{label}</span>
              {open ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </>
          )}
        </button>
        {isOpen && open && (
          <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-2">
            {items.map(navLink)}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

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
                <span className="text-xl font-bold text-gray-900">Inventory</span>
                <div className="flex-1 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={onToggle} className="p-2">
                    <Menu className="h-5 w-5" />
                  </Button>
                </div>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={onToggle} className="p-2 mx-auto">
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
            {topNavigation.map(navLink)}

            {dropdownGroup('Purchase', ShoppingCart, purchaseItems, purchaseOpen, setPurchaseOpen)}
            {dropdownGroup('Sales', ShoppingBag, salesItems, salesOpen, setSalesOpen)}

            {bottomNavigation.map(navLink)}

            {dropdownGroup('User Management', Users, userManagementItems, userManagementOpen, setUserManagementOpen)}
          </nav>

          {/* Logout */}
          <div className="border-t border-gray-200 p-4">
            {isOpen ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
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
