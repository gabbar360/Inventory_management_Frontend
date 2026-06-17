import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, User, Settings, ChevronDown, Grid } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import Sidebar from '@/components/Sidebar';
import ProfileModal from '@/components/ProfileModal';
import TokenVerifier from '@/components/TokenVerifier';
import AppSwitcher from '@/components/AppSwitcher';

const Layout: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar on mobile when route changes
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getAppTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Dashboard';
    if (path.startsWith('/leads')) return 'CRM Leads';
    if (path.startsWith('/website-quotes')) return 'Website Quotes';
    if (path.startsWith('/categories')) return 'Categories';
    if (path.startsWith('/products')) return 'Products';
    if (path.startsWith('/vendors')) return 'Vendors';
    if (path.startsWith('/purchase-orders')) return 'Purchase Orders';
    if (path.startsWith('/paymentsmade')) return 'Payments Made';
    if (path.startsWith('/vendor-ledger')) return 'Vendor Ledger';
    if (path.startsWith('/inward')) return 'Inward / Stock Receiving';
    if (path.startsWith('/customers')) return 'Customers';
    if (path.startsWith('/quotes')) return 'Quotes';
    if (path.startsWith('/sales-orders')) return 'Sales Orders';
    if (path.startsWith('/paymentsreceived')) return 'Payments Received';
    if (path.startsWith('/customer-ledger')) return 'Customer Ledger';
    if (path.startsWith('/order-dispatch')) return 'Order Dispatch';
    if (path.startsWith('/outward')) return 'Outward / Stock Delivery';
    if (path.startsWith('/locations')) return 'Warehouse Locations';
    if (path.startsWith('/inventory')) return 'Stock Inventory';
    if (path.startsWith('/samples')) return 'Product Samples';
    if (path.startsWith('/profit-loss')) return 'Profit & Loss Analysis';
    if (path.startsWith('/roles')) return 'Access Control';
    if (path.startsWith('/users')) return 'User Management';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Inventory';
  };

  const roleName = user?.role?.name?.replace('_', ' ') || 'N/A';

  return (
    <>
      <TokenVerifier />
      <div className="flex h-screen bg-[#f3f4f6]">
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Odoo Premium Purple Header */}
          <header className="bg-[#4D8B9F]">
            <div className="flex h-12 items-center justify-between px-3 sm:px-4">
              <div className="flex items-center gap-2">
                {/* Odoo App Switcher Icon */}
                <button
                  onClick={() => setAppSwitcherOpen(true)}
                  className="p-1.5 rounded hover:bg-white/10 text-white/90 hover:text-white transition-colors flex items-center justify-center"
                  title="App Switcher"
                >
                  <Grid className="h-5 w-5" />
                </button>

                <div className="h-4 w-px bg-white/20 hidden sm:block mx-1"></div>

                {/* Mobile Menu trigger */}
                <button
                  onClick={toggleSidebar}
                  className="lg:hidden p-1.5 rounded hover:bg-white/10 text-white/90 hover:text-white transition-colors"
                >
                  <Menu className="h-5 w-5" />
                </button>

                {/* Dynamic Odoo Navigation App Title */}
                <span className="text-sm font-semibold tracking-wide text-white ml-1">
                  {getAppTitle()}
                </span>
              </div>

              {/* User Dropdown */}
              <div className="flex items-center gap-3 relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-white/10 text-white transition-colors"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 border border-white/20">
                    <User className="h-3.5 w-3.5 text-white/90" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold leading-none">{user?.name}</p>
                    <p className="text-[10px] text-white/70 mt-0.5 leading-none capitalize">{roleName}</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-white/60" />
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded shadow-lg border border-gray-200 py-1 z-20 animate-fadeIn">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          setShowProfileModal(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <User className="h-4 w-4 text-gray-400" />
                        Profile Settings
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/settings');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Settings className="h-4 w-4 text-gray-400" />
                        Company Settings
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5">
            <Outlet />
          </main>
        </div>

        {showProfileModal && (
          <ProfileModal onClose={() => setShowProfileModal(false)} />
        )}

        {/* Premium App Switcher Grid Portal */}
        <AppSwitcher
          isOpen={appSwitcherOpen}
          onClose={() => setAppSwitcherOpen(false)}
        />
      </div>
    </>
  );
};

export default Layout;
