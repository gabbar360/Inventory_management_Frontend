import { useAppSelector } from '@/store/hooks';

export const usePermission = () => {
  const user = useAppSelector((state) => state.auth.user);

  /**
   * Check if the authenticated user has a specific permission slug.
   * If the user's role is flagged as isSuperAdmin, this will bypass validation and return true.
   * 
   * @param permissionSlug - e.g. "sales-orders.read"
   * @returns boolean
   */
  const hasPermission = (permissionSlug: string): boolean => {
    if (!user) return false;

    // 1. Super Admin Dynamic Bypass
    if (user.role?.isSuperAdmin) {
      return true;
    }

    // 2. Exact match check
    return user.permissions?.includes(permissionSlug) || false;
  };

  return { hasPermission, user };
};
