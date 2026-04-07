import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

const makeContext = (user: object | null, handler = {}, cls = {}): ExecutionContext =>
  ({
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new RolesGuard(reflector);
  });

  it('returns true when request.user.roles includes a required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = makeContext({ roles: ['admin', 'viewer'] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('returns false when request.user.roles does not include any required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = makeContext({ roles: ['viewer'] });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('returns true when no @Roles() metadata is set', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = makeContext({ roles: ['viewer'] });

    expect(guard.canActivate(context)).toBe(true);
  });
});
