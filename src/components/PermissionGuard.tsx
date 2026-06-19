import React from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionGuardProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  fallback = null,
  children,
}) => {
  const { hasPermission } = usePermission();

  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGuard;
