import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchAllMenus,
  updateMenuItem,
  deleteMenuItem,
  clearMenuError,
} from '@/slices/menuSlice';
import Button from '@/components/Button';
import ConfirmModal from '@/components/ConfirmModal';
import Table from '@/components/Table';
import PageHeader from '@/components/PageHeader';
import AddEditMenu from '@/components/AddEditMenu';
import DynamicIcon from '@/components/DynamicIcon';

// Inline Toggle Component
const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }> = (
  { checked, onChange, disabled = false }
) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
      checked ? 'bg-blue-600' : 'bg-gray-300'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const Menus: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const { menus, loading, error } = useAppSelector((state) => state.menu);

  const [search, setSearch] = useState('');
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [statusConfirmModal, setStatusConfirmModal] = useState({
    isOpen: false,
    menuId: 0,
    currentStatus: false,
    menuType: 'main' as 'main' | 'sub',
  });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    menuId: 0,
    menuName: '',
    menuType: 'main' as 'main' | 'sub',
  });

  useEffect(() => {
    dispatch(fetchAllMenus());
  }, [dispatch]);

  useEffect(() => {
    if (id && menus.length > 0) {
      const found = menus.find((m) => m.id === Number(id));
      if (found) {
        setSelectedMenu(found);
      }
    } else {
      setSelectedMenu(null);
    }
  }, [id, menus]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearMenuError());
    }
  }, [error, dispatch]);

  const handleAddMenu = () => {
    navigate('/menus/add');
  };

  const handleEditMenu = (menuItem: any) => {
    navigate(`/menus/edit/${menuItem.id}`);
  };

  const handleFormSuccess = () => {
    navigate('/menus');
    dispatch(fetchAllMenus());
  };

  const handleFormCancel = () => {
    navigate('/menus');
  };

  const handleToggleStatus = (menuId: number, currentStatus: boolean, menuType: 'main' | 'sub') => {
    setStatusConfirmModal({
      isOpen: true,
      menuId,
      currentStatus,
      menuType,
    });
  };

  const confirmToggleStatus = async () => {
    try {
      await dispatch(
        updateMenuItem({
          id: statusConfirmModal.menuId,
          data: { isActive: !statusConfirmModal.currentStatus },
          type: statusConfirmModal.menuType,
        })
      ).unwrap();
      toast.success('Menu status updated successfully');
      setStatusConfirmModal({ isOpen: false, menuId: 0, currentStatus: false, menuType: 'main' });
      dispatch(fetchAllMenus());
    } catch (err) {
      // Handled by slice
    }
  };

  const handleDeleteClick = (menuItem: any) => {
    setDeleteConfirmModal({
      isOpen: true,
      menuId: menuItem.id,
      menuName: menuItem.name,
      menuType: menuItem.type as 'main' | 'sub',
    });
  };

  const confirmDelete = async () => {
    try {
      await dispatch(deleteMenuItem({ 
        id: deleteConfirmModal.menuId,
        type: deleteConfirmModal.menuType 
      })).unwrap();
      toast.success('Menu item deleted successfully');
      setDeleteConfirmModal({ isOpen: false, menuId: 0, menuName: '', menuType: 'main' });
      dispatch(fetchAllMenus());
    } catch (err) {
      // Handled by slice
    }
  };

  const toggleRow = (rowId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  // Build hierarchical structure
  const mainMenus = menus.filter((m) => m.type === 'main');
  const subMenusMap = new Map<number, any[]>();

  menus.forEach((m) => {
    if (m.type === 'sub' && m.parentId) {
      if (!subMenusMap.has(m.parentId)) {
        subMenusMap.set(m.parentId, []);
      }
      subMenusMap.get(m.parentId)!.push(m);
    }
  });

  // Filter based on search
  const term = search.toLowerCase();
  const filteredMainMenus = mainMenus.filter((mainMenu) => {
    const mainMatches =
      mainMenu.name.toLowerCase().includes(term) ||
      (mainMenu.path ? mainMenu.path.toLowerCase().includes(term) : false) ||
      (mainMenu.permission?.slug ? mainMenu.permission.slug.toLowerCase().includes(term) : false);

    if (mainMatches) return true;

    const subMenus = subMenusMap.get(mainMenu.id) || [];
    return subMenus.some(
      (sub) =>
        sub.name.toLowerCase().includes(term) ||
        (sub.path ? sub.path.toLowerCase().includes(term) : false) ||
        (sub.permission?.slug ? sub.permission.slug.toLowerCase().includes(term) : false)
    );
  });

  const isFormView = location.pathname.includes('/add') || !!id;
  if (isFormView) {
    return (
      <AddEditMenu
        menu={selectedMenu || undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Menu Management"
        searchPlaceholder="Search menu items..."
        onSearch={(value) => {
          setSearch(value);
        }}
        actions={[
          {
            label: 'Add Menu Item',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleAddMenu,
            variant: 'primary' as const,
          },
        ]}
      />

      {/* Menu Table */}
      <div className="card overflow-hidden bg-white border border-gray-200 rounded shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <span className="text-gray-500">Loading menus...</span>
          </div>
        ) : filteredMainMenus.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <span className="text-gray-500">No menus found</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 w-8"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[200px]">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[120px]">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[150px]">Path</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[60px]">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[120px]">Parent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[150px]">Permission</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 min-w-[80px]">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 min-w-[100px]">Actions</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-200">
                {filteredMainMenus.map((mainMenu) => {
                  const subMenus = subMenusMap.get(mainMenu.id) || [];
                  const isExpanded = expandedRows.has(mainMenu.id);
                  const hasChildren = subMenus.length > 0;

                  return (
                    <React.Fragment key={mainMenu.id}>
                      {/* Main Menu Row */}
                      <tr className="hover:bg-gray-50 transition-colors border-b-2 border-gray-200 bg-white">
                        <td className="px-4 py-3">
                          {hasChildren ? (
                            <button
                              onClick={() => toggleRow(mainMenu.id)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-600" />
                              )}
                            </button>
                          ) : (
                            <div className="w-6" />
                          )}
                        </td>

                        {/* Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {mainMenu.icon ? (
                              <DynamicIcon name={mainMenu.icon} className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            ) : (
                              <div className="h-4 w-4 flex-shrink-0" />
                            )}
                            <div>
                              <div className="font-semibold text-gray-800 text-sm">{mainMenu.name}</div>
                              {hasChildren && (
                                <span className="text-xs text-gray-500">{subMenus.length} submenus</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold border bg-blue-50 border-blue-150 text-blue-700 inline-block">
                            Main Menu
                          </span>
                        </td>

                        {/* Path */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-600">
                            {mainMenu.path || '—'}
                          </span>
                        </td>

                        {/* Order */}
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-gray-700">{mainMenu.order}</span>
                        </td>

                        {/* Parent */}
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">—</span>
                        </td>

                        {/* Permission */}
                        <td className="px-4 py-3">
                          {mainMenu.permission ? (
                            <span className="px-2 py-0.5 bg-blue-50 border border-blue-150 rounded text-blue-700 font-mono text-xs inline-block">
                              {mainMenu.permission.slug}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">Public</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <ToggleSwitch
                            checked={mainMenu.isActive}
                            onChange={() => handleToggleStatus(mainMenu.id, mainMenu.isActive, 'main')}
                          />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditMenu(mainMenu)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4 text-gray-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(mainMenu)}
                              className="text-red-650 hover:text-red-750 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Submenu Rows - Expandable with LEFT PADDING */}
                      {hasChildren && isExpanded && (
                        <>
                          {subMenus.map((subMenu, index) => (
                            <tr key={subMenu.id} className="hover:bg-blue-50 transition-colors bg-blue-50/40">
                              {/* Extra padding on left */}
                              <td colSpan={1} className="px-4 py-3">
                                <div className="flex items-center justify-center">
                                  {index === subMenus.length - 1 ? (
                                    <div className="text-gray-300 text-lg">└</div>
                                  ) : (
                                    <div className="text-gray-300 text-lg">├</div>
                                  )}
                                </div>
                              </td>

                              {/* Name - with extra left padding */}
                              <td className="px-4 py-3 pl-8">
                                <div className="flex items-center gap-2">
                                  {subMenu.icon ? (
                                    <DynamicIcon name={subMenu.icon} className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  ) : (
                                    <div className="h-4 w-4 flex-shrink-0" />
                                  )}
                                  <span className="font-medium text-gray-700 text-sm">{subMenu.name}</span>
                                </div>
                              </td>

                              {/* Type */}
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded text-xs font-semibold border bg-emerald-50 border-emerald-150 text-emerald-700 inline-block">
                                  Submenu
                                </span>
                              </td>

                              {/* Path */}
                              <td className="px-4 py-3">
                                <span className="font-mono text-xs text-gray-600">
                                  {subMenu.path || '—'}
                                </span>
                              </td>

                              {/* Order */}
                              <td className="px-4 py-3">
                                <span className="text-sm font-semibold text-gray-700">{subMenu.order}</span>
                              </td>

                              {/* Parent */}
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded">
                                  {mainMenu.name}
                                </span>
                              </td>

                              {/* Permission */}
                              <td className="px-4 py-3">
                                {subMenu.permission ? (
                                  <span className="px-2 py-0.5 bg-blue-50 border border-blue-150 rounded text-blue-700 font-mono text-xs inline-block">
                                    {subMenu.permission.slug}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic text-xs">Public</span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="px-4 py-3 text-center">
                                <ToggleSwitch
                                  checked={subMenu.isActive}
                                  onChange={() => handleToggleStatus(subMenu.id, subMenu.isActive, 'sub')}
                                />
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3 text-center">
                                <div className="flex justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditMenu(subMenu)}
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4 text-gray-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteClick(subMenu)}
                                    className="text-red-650 hover:text-red-750 hover:bg-red-50"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Status Change Modal */}
      <ConfirmModal
        isOpen={statusConfirmModal.isOpen}
        onClose={() => setStatusConfirmModal({ isOpen: false, menuId: 0, currentStatus: false })}
        onConfirm={confirmToggleStatus}
        title="Update Menu Status"
        message={`Are you sure you want to ${statusConfirmModal.currentStatus ? 'deactivate' : 'activate'} this menu item?`}
        confirmText="Yes, Update"
        cancelText="Cancel"
        type="warning"
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, menuId: 0, menuName: '', menuType: 'main' })}
        onConfirm={confirmDelete}
        title="Delete Menu Item"
        message={`Are you sure you want to delete "${deleteConfirmModal.menuName}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default Menus;
