import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
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
const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }> = ({
  checked,
  onChange,
  disabled = false,
}) => (
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
  
  // Select state from Redux
  const { menus, loading, error } = useAppSelector((state) => state.menu);

  // Local state
  const [search, setSearch] = useState('');
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [statusConfirmModal, setStatusConfirmModal] = useState({
    isOpen: false,
    menuId: 0,
    currentStatus: false,
  });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    menuId: 0,
    menuName: '',
  });

  // Load all menus on component mount
  useEffect(() => {
    dispatch(fetchAllMenus());
  }, [dispatch]);

  // If editing, find the selected menu item from loaded list
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

  // Display errors if any occur
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

  const handleToggleStatus = (menuId: number, currentStatus: boolean) => {
    setStatusConfirmModal({
      isOpen: true,
      menuId,
      currentStatus,
    });
  };

  const confirmToggleStatus = async () => {
    try {
      await dispatch(
        updateMenuItem({
          id: statusConfirmModal.menuId,
          data: { isActive: !statusConfirmModal.currentStatus },
        })
      ).unwrap();
      toast.success('Menu status updated successfully');
      setStatusConfirmModal({ isOpen: false, menuId: 0, currentStatus: false });
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
    });
  };

  const confirmDelete = async () => {
    try {
      await dispatch(deleteMenuItem(deleteConfirmModal.menuId)).unwrap();
      toast.success('Menu item deleted successfully');
      setDeleteConfirmModal({ isOpen: false, menuId: 0, menuName: '' });
      dispatch(fetchAllMenus());
    } catch (err) {
      // Handled by slice
    }
  };

  // Perform client-side filter based on query
  const filteredMenus = menus.filter((menuItem) => {
    const term = search.toLowerCase();
    const nameMatch = menuItem.name.toLowerCase().includes(term);
    const pathMatch = menuItem.path ? menuItem.path.toLowerCase().includes(term) : false;
    const permMatch = menuItem.permission?.slug ? menuItem.permission.slug.toLowerCase().includes(term) : false;
    return nameMatch || pathMatch || permMatch;
  });

  const columns = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      render: (_value: string, record: any) => (
        <div className="flex items-center gap-2">
          {record.icon ? (
            <DynamicIcon name={record.icon} className="h-4 w-4 text-gray-500 flex-shrink-0" />
          ) : (
            <div className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="font-medium text-gray-800 text-xs sm:text-sm">{record.name}</span>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
          value === 'main' 
            ? 'bg-blue-50 border-blue-150 text-blue-700' 
            : 'bg-emerald-50 border-emerald-150 text-emerald-700'
        }`}>
          {value === 'main' ? 'Main Menu' : 'Submenu'}
        </span>
      ),
    },
    {
      key: 'path',
      title: 'Path',
      sortable: true,
      render: (value: string | null) => (
        <span className="font-mono text-xs text-gray-600">{value || '—'}</span>
      ),
    },
    {
      key: 'order',
      title: 'Order',
      sortable: true,
      align: 'center' as const,
      render: (value: number) => (
        <span className="text-gray-600 font-semibold">{value}</span>
      ),
    },
    {
      key: 'parent.name',
      title: 'Parent',
      sortable: true,
      render: (_value: any, record: any) => (
        <span className="text-gray-600 text-xs sm:text-sm">
          {record.parent ? record.parent.name : <span className="text-gray-400 italic">Root</span>}
        </span>
      ),
    },
    {
      key: 'permission.slug',
      title: 'Required Permission',
      sortable: true,
      render: (_value: any, record: any) => (
        <span className="text-xs">
          {record.permission ? (
            <span className="px-2 py-0.5 bg-blue-50 border border-blue-150 rounded text-blue-700 font-mono text-[10px]">
              {record.permission.slug}
            </span>
          ) : (
            <span className="text-gray-400 italic text-[11px]">Public (None)</span>
          )}
        </span>
      ),
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (value: boolean, record: any) => (
        <div className="flex items-center gap-1.5 flex-nowrap">
          <ToggleSwitch
            checked={value}
            onChange={() => handleToggleStatus(record.id, value)}
          />
          <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
            {value ? 'Active' : 'Inactive'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: any) => (
        <div className="flex gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEditMenu(record)}>
            <Edit className="h-4 w-4 text-gray-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(record)}
            className="text-red-650 hover:text-red-750 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Render form if in add/edit router paths
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

      {/* Grid Container */}
      <div className="card overflow-hidden bg-white border border-gray-200 rounded shadow-sm">
        <Table data={filteredMenus} columns={columns} loading={loading} />
      </div>

      {/* Confirm Status Change Modal */}
      <ConfirmModal
        isOpen={statusConfirmModal.isOpen}
        onClose={() => setStatusConfirmModal({ isOpen: false, menuId: 0, currentStatus: false })}
        onConfirm={confirmToggleStatus}
        title="Update Menu Status"
        message={`Are you sure you want to ${statusConfirmModal.currentStatus ? 'deactivate' : 'activate'} this menu item? This will affect its visibility in the sidebar.`}
        confirmText="Yes, Update"
        cancelText="Cancel"
        type="warning"
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, menuId: 0, menuName: '' })}
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
