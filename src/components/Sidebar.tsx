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
  CreditCard,
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
  { name: 'Payments Made', href: '/paymentsmade', icon: CreditCard },
  { name: 'Vendor Ledger', href: '/vendor-ledger', icon: FileText },
];

const salesItems = [
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Quotes', href: '/quotes', icon: FileText },
  { name: 'Sales Orders', href: '/sales-orders', icon: ClipboardList },
  { name: 'Order Dispatch', href: '/order-dispatch', icon: Truck },
  { name: 'Outward', href: '/outward', icon: ArrowUpFromLine },
  { name: 'Payments Received', href: '/paymentsreceived', icon: CreditCard },
  { name: 'Customer Ledger', href: '/customer-ledger', icon: FileText },
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

  const navLink = (item: { name: string; href: string; icon: React.ElementType }, isChild: boolean = false) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        key={item.name}
        to={item.href}
        onClick={handleLinkClick}
        className={cn(
          'group flex items-center py-1.5 text-xs sm:text-sm font-medium transition-colors mb-0.5 rounded-md',
          isChild && 'px-2',
          isActive
            ? 'bg-primary-100/60 text-primary-900 border-l-[3px] border-primary-600 rounded-r-sm'
            : isChild
            ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 pl-3'
        )}
      >
        <item.icon
          className={cn(
            'h-4 w-4 flex-shrink-0 transition-colors',
            isOpen ? 'mr-2.5' : 'mx-auto',
            isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
          )}
        />
        {isOpen && <span className="truncate">{item.name}</span>}
      </Link>
    );
  }

  const dropdownGroup = (
    label: string,
    Icon: React.ElementType,
    items: typeof purchaseItems,
    open: boolean,
    setOpen: (v: boolean) => void
  ) => {
    const isGroupActive = items.some((i) => location.pathname === i.href);
    return (
      <div className="space-y-0.5">
        <button
          onClick={() => {
            if (!isOpen) onToggle();
            else setOpen(!open);
          }}
          className={cn(
            'w-full group flex items-center py-1.5 text-xs sm:text-sm font-medium transition-colors pl-3',
            isGroupActive && !open
              ? 'bg-primary-100/60 text-primary-900 border-l-[3px] border-primary-600 rounded-r-sm pl-2 sm:pl-3'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <Icon
            className={cn(
              'h-4 w-4 flex-shrink-0 transition-colors',
              isOpen ? 'mr-2.5' : 'mx-auto',
              isGroupActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
            )}
          />
          {isOpen && (
            <>
              <span className="flex-1 text-left truncate">{label}</span>
              {open ? (
                <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600" />
              )}
            </>
          )}
        </button>
        {isOpen && open && (
          <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-primary-200 pl-3">
            {items.map((item) => navLink(item, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <div
        className={cn(
          'bg-gray-50 border-r border-gray-200 transition-all duration-300 ease-in-out z-50',
          'fixed lg:relative inset-y-0 left-0',
          'lg:translate-x-0',
          isOpen
            ? 'translate-x-0 w-52 sm:w-56 shadow-2xl lg:shadow-none'
            : '-translate-x-full lg:translate-x-0 lg:w-12'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo & Header */}
          <div className="flex h-12 items-center justify-center border-b border-gray-200 px-2 sm:px-3 bg-gray-100/50">
            {isOpen ? (
              <>
                <div className="flex items-center gap-1.5 flex-1 justify-center">
                  <img src="/images/vegnar.webp" alt="Vegnar Logo" className="h-6 w-auto object-contain" />
                </div>
                <Button variant="ghost" size="sm" onClick={onToggle} className="p-1 h-7 w-7 text-gray-500 hover:text-gray-850 hover:bg-gray-200">
                  <Menu className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={onToggle} className="p-1 h-7 w-7 mx-auto text-gray-500 hover:text-gray-850 hover:bg-gray-200">
                <Menu className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Navigation links */}
          <nav className="flex-1 space-y-0.5 px-1.5 py-3 overflow-y-auto">
            {topNavigation.map((item) => navLink(item, false))}

            {dropdownGroup('Purchase', ShoppingCart, purchaseItems, purchaseOpen, setPurchaseOpen)}
            {dropdownGroup('Sales', ShoppingBag, salesItems, salesOpen, setSalesOpen)}

            {bottomNavigation.map((item) => navLink(item, false))}

            {dropdownGroup('System Settings', Users, userManagementItems, userManagementOpen, setUserManagementOpen)}
          </nav>

          {/* Logout */}
          <div className="border-t border-gray-200 p-2 bg-gray-100/30">
            {isOpen ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-red-650 hover:text-red-750 hover:bg-red-50 text-xs py-1 px-2.5 h-8"
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
                  className="w-full justify-center p-1 text-red-650 hover:text-red-750 hover:bg-red-50 h-8"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
                {showLogoutMenu && (
                  <div className="absolute bottom-full left-full ml-1 mb-1 bg-white shadow-md rounded border border-gray-200 py-1 min-w-[140px] z-55 animate-fadeIn">
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowLogoutMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs text-red-650 hover:bg-red-50 flex items-center font-medium"
                    >
                      <LogOut className="mr-2 h-3.5 w-3.5" />
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
