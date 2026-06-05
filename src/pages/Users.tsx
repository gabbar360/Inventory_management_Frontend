import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchUsers,
  fetchUserById,
  deleteUser,
  toggleUserStatus,
  clearError,
} from '@/slices/userSlice';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import ConfirmModal from '@/components/ConfirmModal';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import AddEditUser from '@/components/AddEditUser';

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

const Users: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { users, currentUser, pagination, loading, error } = useAppSelector(
    (state) => state.users
  );

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    userId: 0,
    currentStatus: false,
  });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    userId: 0,
    userName: '',
  });

  useEffect(() => {
    dispatch(fetchUsers({ page: currentPage, limit: 10, search }));
  }, [dispatch, search, currentPage]);

  useEffect(() => {
    if (id) {
      dispatch(fetchUserById(parseInt(id)));
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

  const handleAddUser = () => {
    navigate('/users/add');
  };

  const handleEditUser = (user: any) => {
    navigate(`/users/edit/${user.id}`);
  };

  const handleFormSuccess = () => {
    navigate('/users');
    dispatch(fetchUsers({ page: currentPage, limit: 10, search }));
  };

  const handleFormCancel = () => {
    navigate('/users');
  };

  const handleToggleStatus = (userId: number, currentStatus: boolean) => {
    setConfirmModal({
      isOpen: true,
      userId,
      currentStatus,
    });
  };

  const confirmToggleStatus = async () => {
    try {
      await dispatch(
        toggleUserStatus({
          id: confirmModal.userId,
          isActive: !confirmModal.currentStatus,
        })
      ).unwrap();
      toast.success('User status updated successfully');
      setConfirmModal({ isOpen: false, userId: 0, currentStatus: false });
    } catch (error) {
      // Error handled by Redux
    }
  };

  const handleDeleteClick = (user: any) => {
    setDeleteConfirmModal({
      isOpen: true,
      userId: user.id,
      userName: user.name,
    });
  };

  const confirmDelete = async () => {
    try {
      await dispatch(deleteUser(deleteConfirmModal.userId)).unwrap();
      toast.success('User deleted successfully');
      setDeleteConfirmModal({ isOpen: false, userId: 0, userName: '' });
    } catch (error) {
      // Error handled by Redux
    }
  };

  const columns = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
    },
    {
      key: 'email',
      title: 'Email',
      sortable: true,
    },
    {
      key: 'role',
      title: 'Role',
      render: (value: string) => (
        <span className="capitalize px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
          {value.replace('_', ' ')}
        </span>
      ),
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
            {value ? 'Unblocked' : 'Blocked'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: any) => (
        <div className="flex gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEditUser(record)}>
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
      <AddEditUser
        user={id && currentUser ? currentUser : undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Users"
        searchPlaceholder="Search users..."
        onSearch={(value) => {
          debouncedSearch(value);
        }}
        actions={[
          {
            label: 'Add User',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleAddUser,
            variant: 'primary' as const,
          },
        ]}
      />

      {/* Table */}
      <div className="card overflow-hidden">
        <Table data={users} columns={columns} loading={loading} />

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
        onClose={() => setConfirmModal({ isOpen: false, userId: 0, currentStatus: false })}
        onConfirm={confirmToggleStatus}
        title="Update User Status"
        message={`Are you sure you want to ${confirmModal.currentStatus ? 'block' : 'unblock'} this user?`}
        confirmText="Yes, Update"
        cancelText="Cancel"
        type="warning"
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, userId: 0, userName: '' })}
        onConfirm={confirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteConfirmModal.userName}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default Users;
