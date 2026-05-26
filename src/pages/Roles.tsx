import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  clearError,
} from '@/slices/roleSlice';
import { formatDate, debounce } from '@/utils';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';

interface RoleFormData {
  name: string;
  description?: string;
  isActive?: boolean;
}

const roleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
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

const Roles: React.FC = () => {
  const dispatch = useAppDispatch();
  const { roles, pagination, loading, error } = useAppSelector(
    (state) => state.roles
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
  });

  const isActiveValue = watch('isActive');

  useEffect(() => {
    dispatch(fetchRoles({ page: currentPage, limit: 10, search }));
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

  const openModal = (role?: any) => {
    if (role) {
      setEditingRole(role);
      setValue('name', role.name);
      setValue('description', role.description || '');
      setValue('isActive', role.isActive !== false);
    } else {
      setEditingRole(null);
      reset({ isActive: true });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRole(null);
    reset();
  };

  const onSubmit = async (data: RoleFormData) => {
    try {
      const submitData = {
        ...data,
        isActive: data.isActive === true
      };
      if (editingRole) {
        await dispatch(
          updateRole({ id: editingRole.id, data: submitData })
        ).unwrap();
        toast.success('Role updated successfully');
      } else {
        await dispatch(createRole(submitData)).unwrap();
        toast.success('Role created successfully');
      }
      closeModal();
    } catch (error) {
      // Error handled by Redux
    }
  };

  const handleToggleStatus = (roleId: number, currentStatus: boolean) => {
    setConfirmModal({
      isOpen: true,
      roleId,
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
        title="Roles"
        searchPlaceholder="Search roles..."
        onSearch={(value) => {
          debouncedSearch(value);
        }}
        actions={[
          {
            label: 'Add Role',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => openModal(),
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingRole ? 'Edit Role' : 'Add Role'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Role Name"
            placeholder="Enter role name"
            error={errors.name?.message}
            {...register('name')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              placeholder="Enter role description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ToggleSwitch
              checked={isActiveValue !== false}
              onChange={(checked) => setValue('isActive', checked)}
            />
            <label className="text-sm font-medium text-gray-700">
              {isActiveValue !== false ? 'Active' : 'Inactive'}
            </label>
          </div>

          <div className="form-actions">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingRole ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

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
