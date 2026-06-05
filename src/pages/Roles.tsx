import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchRoles,
  fetchRoleById,
  updateRole,
  deleteRole,
  clearError,
} from '@/slices/roleSlice';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import ConfirmModal from '@/components/ConfirmModal';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import AddEditRole from '@/components/AddEditRole';

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

const Roles: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { roles, currentRole, pagination, loading, error } = useAppSelector(
    (state) => state.roles
  );

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    roleId: 0,
    currentStatus: false,
  });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    roleId: 0,
    roleName: '',
  });

  useEffect(() => {
    dispatch(fetchRoles({ page: currentPage, limit: 10, search }));
  }, [dispatch, search, currentPage]);

  useEffect(() => {
    if (id) {
      dispatch(fetchRoleById(Number(id)));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  });

  const handleAddRole = () => {
    navigate('/roles/add');
  };

  const handleEditRole = (role: any) => {
    navigate(`/roles/edit/${role.id}`);
  };

  const handleFormSuccess = () => {
    navigate('/roles');
    dispatch(fetchRoles({ page: currentPage, limit: 10, search }));
  };

  const handleFormCancel = () => {
    navigate('/roles');
  };

  const handleToggleStatus = (roleId: number, currentStatus: boolean) => {
    setConfirmModal({
      isOpen: true,
      roleId: Number(roleId),
      currentStatus,
    });
  };

  const confirmToggleStatus = async () => {
    try {
      await dispatch(
        updateRole({
          id: confirmModal.roleId,
          data: { isActive: !confirmModal.currentStatus },
        })
      ).unwrap();
      toast.success('Role status updated successfully');
      setConfirmModal({ isOpen: false, roleId: 0, currentStatus: false });
    } catch (error) {
      // Error handled by Redux
    }
  };

  const handleDeleteClick = (role: any) => {
    setDeleteConfirmModal({
      isOpen: true,
      roleId: role.id,
      roleName: role.name,
    });
  };

  const confirmDelete = async () => {
    try {
      await dispatch(deleteRole(deleteConfirmModal.roleId)).unwrap();
      toast.success('Role deleted successfully');
      setDeleteConfirmModal({ isOpen: false, roleId: 0, roleName: '' });
    } catch (error) {
      // Error handled by Redux
    }
  };

  const columns = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      render: (value: string) => (
        <span className="capitalize">{value.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'description',
      title: 'Description',
      sortable: true,
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (value: boolean, record: any) => (
        <div className="flex items-center gap-2">
          <ToggleSwitch
            checked={value}
            onChange={() => handleToggleStatus(record.id, value)}
          />
          <span className="text-sm font-medium text-gray-700">
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
          <Button variant="ghost" size="sm" onClick={() => handleEditRole(record)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(record)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Show form if in add/edit mode
  if (id || window.location.pathname.includes('/add')) {
    return (
      <AddEditRole
        role={id && currentRole ? currentRole : undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Roles"
        searchPlaceholder="Search roles..."
        onSearch={(value) => {
          debouncedSearch(value);
        }}
        actions={[
          {
            label: 'Add Role',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleAddRole,
            variant: 'primary' as const,
          },
        ]}
      />

      {/* Table */}
      <div className="card overflow-hidden">
        <Table data={roles} columns={columns} loading={loading} />

        <Pagination
          currentPage={pagination?.page || 1}
          totalPages={pagination?.pages || 1}
          total={pagination?.total || 0}
          limit={pagination?.limit || 10}
          onPageChange={setCurrentPage}
          loading={loading}
        />
      </div>

      {/* Confirm Status Change Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, roleId: 0, currentStatus: false })}
        onConfirm={confirmToggleStatus}
        title="Update Role Status"
        message={`Are you sure you want to ${confirmModal.currentStatus ? 'deactivate' : 'activate'} this role?`}
        confirmText="Yes, Update"
        cancelText="Cancel"
        type="warning"
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, roleId: 0, roleName: '' })}
        onConfirm={confirmDelete}
        title="Delete Role"
        message={`Are you sure you want to delete "${deleteConfirmModal.roleName}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default Roles;
