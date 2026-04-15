import { useAuthStore } from '../store/auth.store';
import { usePermissions } from './usePermissions';

jest.mock('../store/auth.store');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('usePermissions', () => {
  describe('hasRole', () => {
    it('returns true when user has the specified role', () => {
      mockUseAuthStore.mockReturnValue({
        user: { id: '1', email: 'a@b.com', fullName: 'Test', roles: ['admin'] },
      } as any);

      const { hasRole } = usePermissions();
      expect(hasRole('admin')).toBe(true);
    });

    it('returns false when user does not have the specified role', () => {
      mockUseAuthStore.mockReturnValue({
        user: { id: '1', email: 'a@b.com', fullName: 'Test', roles: ['warehouse'] },
      } as any);

      const { hasRole } = usePermissions();
      expect(hasRole('finance')).toBe(false);
    });
  });

  describe('canAccess', () => {
    it('returns true for finance role accessing reports module', () => {
      mockUseAuthStore.mockReturnValue({
        user: { id: '1', email: 'a@b.com', fullName: 'Test', roles: ['finance'] },
      } as any);

      const { canAccess } = usePermissions();
      expect(canAccess('reports')).toBe(true);
    });

    it('returns false for pos_cashier role accessing reports module', () => {
      mockUseAuthStore.mockReturnValue({
        user: { id: '1', email: 'a@b.com', fullName: 'Test', roles: ['pos_cashier'] },
      } as any);

      const { canAccess } = usePermissions();
      expect(canAccess('reports')).toBe(false);
    });

    it('returns true for pos_cashier role accessing pos module', () => {
      mockUseAuthStore.mockReturnValue({
        user: { id: '1', email: 'a@b.com', fullName: 'Test', roles: ['pos_cashier'] },
      } as any);

      const { canAccess } = usePermissions();
      expect(canAccess('pos')).toBe(true);
    });

    it('returns false for viewer role accessing settings module', () => {
      mockUseAuthStore.mockReturnValue({
        user: { id: '1', email: 'a@b.com', fullName: 'Test', roles: ['viewer'] },
      } as any);

      const { canAccess } = usePermissions();
      expect(canAccess('settings')).toBe(false);
    });

    it('returns true for admin role accessing settings module', () => {
      mockUseAuthStore.mockReturnValue({
        user: { id: '1', email: 'a@b.com', fullName: 'Test', roles: ['admin'] },
      } as any);

      const { canAccess } = usePermissions();
      expect(canAccess('settings')).toBe(true);
    });
  });

  describe('null user', () => {
    it('returns false for all modules when user is null', () => {
      mockUseAuthStore.mockReturnValue({ user: null } as any);

      const { hasRole, canAccess } = usePermissions();
      expect(hasRole('admin')).toBe(false);
      expect(canAccess('dashboard')).toBe(false);
      expect(canAccess('pos')).toBe(false);
      expect(canAccess('inventory')).toBe(false);
      expect(canAccess('reports')).toBe(false);
      expect(canAccess('settings')).toBe(false);
    });
  });
});
