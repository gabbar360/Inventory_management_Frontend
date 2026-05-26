import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  clearError,
} from '@/slices/userSlice';
import { fetchRoles } from '@/slices/roleSlice';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: string;
  isActive?: boolean;
}

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  isActive: z.boolean().optional(),
});

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
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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
  const dispatch = useAppDispatch();
  const { users, pagination, loading, error } = useAppSelector(
    (state) => state.users
  );
  const { roles } = useAppSelector((state) => state.roles);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const isActiveValue = watch('isActive');

  useEffect(() => {
    dispatch(fetchUsers({ page: currentPage, limit: 10, search }));
    dispatch(fetchRoles({ page: 1, limit: 100, search: '' }));
  }, [dispatch, search, currentPage]);

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

  const openModal = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setValue('name', user.name);
      setValue('email', user.email);
      setValue('role', user.role);
      setValue('isActive', user.isActive !== false);
    } else {
      setEditingUser(null);
      reset({ isActive: true });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    reset();
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      if (editingUser) {
        await dispatch(
          updateUser({ id: editingUser.id, data })
        ).unwrap();
        toast.success('User updated successfully');
      } else {
        if (!data.password) {
          toast.error('Password is required for new users');
          return;
        }
        await dispatch(createUser({ ...data, password: data.password })).unwrap();
        toast.success('User created successfully');
      }
      closeModal();
    } catch (error) {
      // Error handled by Redux
    }
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
          <Button variant="ghost" size="sm" onClick={() => openModal(record)}>
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
            onClick: () => openModal(),
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingUser ? 'Edit User' : 'Add User'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Name"
            placeholder="Enter user name"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Email"
            type="email"
            placeholder="Enter email address"
            error={errors.email?.message}
            {...register('email')}
          />

          {!editingUser && (
            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              error={errors.password?.message}
              {...register('password')}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              {...register('role')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a role</option>
              {roles && roles.length > 0 ? (
                roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name.replace('_', ' ')}
                  </option>
                ))
              ) : (
                <option disabled>No roles available</option>
              )}
            </select>
            {errors.role && (
              <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>
            )}
          </div>

          {editingUser && (
            <div className="flex items-center gap-3">
              <ToggleSwitch
                checked={isActiveValue !== false}
                onChange={(checked) => setValue('isActive', checked)}
              />
              <label className="text-sm font-medium text-gray-700">
                {isActiveValue !== false ? 'Unblocked' : 'Blocked'}
              </label>
            </div>
          )}

          <div className="form-actions">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

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
