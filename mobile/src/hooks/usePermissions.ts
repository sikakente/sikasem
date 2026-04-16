import { useAuthStore } from '../store/auth.store';

type AppModule =
  | 'dashboard'
  | 'pos'
  | 'inventory'
  | 'shipments'
  | 'purchasing'
  | 'receiving'
  | 'sales'
  | 'customers'
  | 'fx'
  | 'invoices'
  | 'reports'
  | 'alerts'
  | 'ai'
  | 'settings'
  | 'users';

export type { AppModule };

export function usePermissions() {
  const { user } = useAuthStore();

  const hasRole = (...roles: string[]): boolean => roles.some((r) => user?.roles?.includes(r));

  const canAccess = (module: AppModule): boolean => {
    const moduleRoles: Record<AppModule, string[]> = {
      dashboard: ['admin', 'operations', 'finance', 'viewer'],
      pos: ['admin', 'operations', 'pos_cashier'],
      inventory: ['admin', 'operations', 'warehouse'],
      shipments: ['admin', 'operations', 'warehouse'],
      purchasing: ['admin', 'operations'],
      receiving: ['admin', 'operations', 'warehouse'],
      sales: ['admin', 'operations', 'finance', 'viewer'],
      customers: ['admin', 'operations', 'finance'],
      fx: ['admin', 'finance'],
      invoices: ['admin', 'finance'],
      reports: ['admin', 'finance', 'viewer'],
      alerts: ['admin', 'operations', 'finance'],
      ai: ['admin', 'operations', 'finance', 'viewer'],
      settings: ['admin'],
      users: ['admin'],
    };
    return hasRole(...(moduleRoles[module] ?? []));
  };

  return { hasRole, canAccess };
}
