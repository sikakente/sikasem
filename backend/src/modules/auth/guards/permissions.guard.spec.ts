import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PrismaService } from '../../../prisma/prisma.service';

const makeContext = (user: object | null, handler = {}, cls = {}): ExecutionContext =>
  ({
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    prisma = {
      role: { findMany: jest.fn() },
    } as any;
    guard = new PermissionsGuard(reflector, prisma);
  });

  const mockRolesWithPermissions = (codes: string[]) => {
    (prisma.role.findMany as jest.Mock).mockResolvedValue([
      {
        name: 'admin',
        rolePermissions: codes.map((code) => ({ permission: { code } })),
      },
    ]);
  };

  it('returns true when the user roles include the required permission code', async () => {
    reflector.getAllAndOverride.mockReturnValue('inventory.adjust');
    mockRolesWithPermissions(['inventory.adjust', 'sales.void']);
    const context = makeContext({ roles: ['admin'] });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('returns false when the required permission is absent', async () => {
    reflector.getAllAndOverride.mockReturnValue('inventory.adjust');
    mockRolesWithPermissions(['sales.void']);
    const context = makeContext({ roles: ['viewer'] });

    await expect(guard.canActivate(context)).resolves.toBe(false);
  });

  it('falls back to a DB query when permission is not in the cache', async () => {
    reflector.getAllAndOverride.mockReturnValue('reports.export');
    mockRolesWithPermissions(['reports.export']);
    const context = makeContext({ roles: ['finance'] });

    await guard.canActivate(context);

    // DB was queried (not from cache on first call)
    expect(prisma.role.findMany).toHaveBeenCalledTimes(1);
  });

  it('returns true when no @RequirePermission() metadata is set', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = makeContext({ roles: ['viewer'] });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
