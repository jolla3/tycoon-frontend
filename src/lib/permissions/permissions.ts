// src/lib/permissions/permissions.ts
//
// USABILITY layer only — backend authorize() is the security boundary.
import type { Role } from '@/types/api';

const MANAGE_ROLES: Role[] = ['CLIENT_OWNER', 'CLIENT_ADMIN'];

export const permissions = {
  canManageEstates: (role: Role) => MANAGE_ROLES.includes(role),
  canManageHouses: (role: Role) => MANAGE_ROLES.includes(role),
  canManageTenants: (role: Role) => MANAGE_ROLES.includes(role),
  canManageBanking: (role: Role) => MANAGE_ROLES.includes(role),
  canAssignTransactions: (role: Role) => MANAGE_ROLES.includes(role),
  canManageStaff: (role: Role) => MANAGE_ROLES.includes(role),
  isPlatformAdmin: (role: Role) => role === 'SUPER_ADMIN',
  canAccessPlatform: (role: Role) => role === 'SUPER_ADMIN',
};
