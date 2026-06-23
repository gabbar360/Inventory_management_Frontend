import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  Menu,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/slices/authSlice';
import { cn } from '@/utils';
import Button from '@/components/Button';
import toast from 'react-hot-toast';
import { DynamicIcon } from '@/components/DynamicIcon';
import { fetchSidebarMenu } from '@/slices/menuSlice';
import { MenuItem } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);

  // Dynamic menu selected from Redux state
  const { menuTree, loading } = useAppSelector((state) => state.menu);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});

  // Fetch the dynamic menu on load
  useEffect(() => {
    dispatch(fetchSidebarMenu());
  }, [dispatch]);

  // Sync openGroups state with location path when menu loads
  useEffect(() => {
    if (menuTree.length > 0) {
      const initialOpen: Record<number, boolean> = {};
      menuTree.forEach((group) => {
        if (group.children && group.children.some((child) => location.pathname === child.path)) {
          initialOpen[group.id] = true;
        }
      });
      setOpenGroups((prev) => ({ ...initialOpen, ...prev }));
    }
  }, [menuTree, location.pathname]);

  const toggleGroup = (id: number) => {
    setOpenGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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

  const navLink = (item: MenuItem, isChild: boolean = false) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        key={item.id}
        to={item.path || '#'}
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
        {item.icon && (
          <DynamicIcon
            name={item.icon}
            className={cn(
              'h-4 w-4 flex-shrink-0 transition-colors',
              isOpen ? 'mr-2.5' : 'mx-auto',
              isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
            )}
          />
        )}
        {isOpen && <span className="truncate">{item.name}</span>}
      </Link>
    );
  };

  const dropdownGroup = (item: MenuItem) => {
    const children = item.children || [];
    const isGroupActive = children.some((child) => location.pathname === child.path);
    const isGroupOpen = !!openGroups[item.id];

    return (
      <div key={item.id} className="space-y-0.5">
        <button
          onClick={() => {
            if (!isOpen) onToggle();
            else toggleGroup(item.id);
          }}
          className={cn(
            'w-full group flex items-center py-1.5 text-xs sm:text-sm font-medium transition-colors pl-3',
            isGroupActive && !isGroupOpen
              ? 'bg-primary-100/60 text-primary-900 border-l-[3px] border-primary-600 rounded-r-sm pl-2 sm:pl-3'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          {item.icon && (
            <DynamicIcon
              name={item.icon}
              className={cn(
                'h-4 w-4 flex-shrink-0 transition-colors',
                isOpen ? 'mr-2.5' : 'mx-auto',
                isGroupActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
              )}
            />
          )}
          {isOpen && (
            <>
              <span className="flex-1 text-left truncate">{item.name}</span>
              {isGroupOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600" />
              )}
            </>
          )}
        </button>
        {isOpen && isGroupOpen && (
          <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-primary-200 pl-3">
            {children.map((child) => navLink(child, true))}
          </div>
        )}
      </div>
    );
  };

  const renderNavItem = (item: MenuItem) => {
    if (item.children && item.children.length > 0) {
      return dropdownGroup(item);
    }
    return navLink(item, false);
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
            {loading ? (
              isOpen ? (
                <div className="flex justify-center py-4">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
                </div>
              ) : null
            ) : (
              menuTree.map((item) => renderNavItem(item))
            )}
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
