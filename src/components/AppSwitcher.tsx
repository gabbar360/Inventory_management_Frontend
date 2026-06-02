import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Megaphone,
  Globe,
  FolderTree,
  Box,
  Users,
  ShoppingCart,
  ArrowDownToLine,
  FileText,
  ClipboardList,
  Truck,
  ArrowUpFromLine,
  MapPin,
  Warehouse,
  FlaskConical,
  TrendingUp,
  Settings,
  ShieldAlert,
  Grid,
  X
} from 'lucide-react';

interface AppItem {
  name: string;
  href: string;
  icon: React.ElementType;
  color: string;
  category: string;
}

const apps: AppItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'from-[#3b82f6] to-[#1d4ed8]', category: 'Core' },
  { name: 'Leads', href: '/leads', icon: Megaphone, color: 'from-[#10b981] to-[#047857]', category: 'Sales' },
  { name: 'Website Quotes', href: '/website-quotes', icon: Globe, color: 'from-[#06b6d4] to-[#0e7490]', category: 'Sales' },
  { name: 'Categories', href: '/categories', icon: FolderTree, color: 'from-[#f59e0b] to-[#b45309]', category: 'Inventory' },
  { name: 'Products', href: '/products', icon: Box, color: 'from-[#ec4899] to-[#be185d]', category: 'Inventory' },
  { name: 'Vendors', href: '/vendors', icon: Users, color: 'from-[#8b5cf6] to-[#6d28d9]', category: 'Purchase' },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart, color: 'from-[#6366f1] to-[#4338ca]', category: 'Purchase' },
  { name: 'Inward', href: '/inward', icon: ArrowDownToLine, color: 'from-[#14b8a6] to-[#0f766e]', category: 'Purchase' },
  { name: 'Customers', href: '/customers', icon: Users, color: 'from-[#f43f5e] to-[#be123c]', category: 'Sales' },
  { name: 'Quotes', href: '/quotes', icon: FileText, color: 'from-[#eab308] to-[#a16207]', category: 'Sales' },
  { name: 'Sales Orders', href: '/sales-orders', icon: ClipboardList, color: 'from-[#3b82f6] to-[#1d4ed8]', category: 'Sales' },
  { name: 'Order Dispatch', href: '/order-dispatch', icon: Truck, color: 'from-[#f97316] to-[#c2410c]', category: 'Sales' },
  { name: 'Outward', href: '/outward', icon: ArrowUpFromLine, color: 'from-[#ef4444] to-[#b91c1c]', category: 'Sales' },
  { name: 'Warehouse', href: '/locations', icon: MapPin, color: 'from-[#64748b] to-[#334155]', category: 'Inventory' },
  { name: 'Inventory', href: '/inventory', icon: Warehouse, color: 'from-[#22c55e] to-[#15803d]', category: 'Inventory' },
  { name: 'Samples', href: '/samples', icon: FlaskConical, color: 'from-[#d946ef] to-[#a21caf]', category: 'Core' },
  { name: 'Profit & Loss', href: '/profit-loss', icon: TrendingUp, color: 'from-[#84cc16] to-[#4d7c0f]', category: 'Reporting' },
  { name: 'Roles', href: '/roles', icon: ShieldAlert, color: 'from-[#6b7280] to-[#374151]', category: 'System' },
  { name: 'Users', href: '/users', icon: Users, color: 'from-[#4f46e5] to-[#3730a3]', category: 'System' },
  { name: 'Settings', href: '/settings', icon: Settings, color: 'from-[#475569] to-[#1e293b]', category: 'System' },
];

interface AppSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

const AppSwitcher: React.FC<AppSwitcherProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSearch('');
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ['All', 'Core', 'Sales', 'Purchase', 'Inventory', 'Reporting', 'System'];

  const filteredApps = apps.filter((app) => {
    const matchesSearch = app.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAppClick = (href: string) => {
    navigate(href);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#1e1c1e]/95 backdrop-blur-md text-white transition-opacity duration-300 animate-fadeIn">
      {/* Top bar */}
      <header className="flex h-16 items-center justify-between px-4 sm:px-6 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <Grid className="h-5.5 w-5.5 text-primary-300" />
          <span className="text-base sm:text-xl font-semibold tracking-wide">
            NovaStock <span className="hidden sm:inline">Launcher</span>
          </span>
        </div>
        
        {/* Search */}
        <div className="flex-1 max-w-md mx-3 sm:mx-6">
          <input
            type="text"
            placeholder="Search apps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full !bg-white border border-gray-300 rounded px-3 py-1.5 text-xs sm:text-sm !text-black !placeholder:text-black focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            autoFocus
          />
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <X className="h-5.5 w-5.5" />
        </button>
      </header>

      {/* Mobile Category Navigation Tab Bar */}
      <div className="md:hidden flex gap-1.5 overflow-x-auto px-4 py-2 border-b border-white/5 bg-black/10 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-primary-600 text-white font-bold'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left category sidebar */}
        <aside className="w-48 border-r border-white/10 bg-black/10 py-6 px-4 space-y-1 hidden md:block">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-2 mb-3">Categories</p>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary-600 text-white font-bold'
                  : 'bg-white/75 text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </aside>

        {/* Apps Grid */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8 max-w-7xl mx-auto">
            {filteredApps.map((app) => (
              <button
                key={app.name}
                onClick={() => handleAppClick(app.href)}
                className="group flex flex-col items-center justify-center text-center p-4 rounded-lg hover:bg-white/5 transition-all duration-200 transform hover:-translate-y-1"
              >
                {/* Custom Odoo-style Colorful Tile */}
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br ${app.color} shadow-lg flex items-center justify-center text-white mb-3 group-hover:scale-105 transition-transform duration-200`}>
                  <app.icon className="h-7 w-7 sm:h-8 sm:w-8 text-white filter drop-shadow-md" />
                </div>
                
                <span className="text-xs sm:text-sm font-medium text-white/90 group-hover:text-white transition-colors group-hover:font-semibold truncate w-full max-w-[120px]">
                  {app.name}
                </span>
                <span className="text-[10px] text-white/40 mt-0.5 group-hover:text-white/60 transition-colors uppercase tracking-wider">
                  {app.category}
                </span>
              </button>
            ))}

            {filteredApps.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-white/50">
                <p className="text-lg">No apps match your search</p>
                <p className="text-sm mt-1">Try searching for other modules like "Leads" or "Inventory"</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppSwitcher;
