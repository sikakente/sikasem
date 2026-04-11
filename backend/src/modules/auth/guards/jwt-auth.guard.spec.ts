import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

const makeContext = (handler: object, cls: object): ExecutionContext =>
  ({
    getHandler: () => handler,
    getClass: () => cls,
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({ headers: {} }),
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
  }) as unknown as ExecutionContext;

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new JwtAuthGuard(reflector);
  });

  it('allows through routes decorated with @Public() without a token', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = makeContext({}, {});

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('delegates to passport when route is not @Public()', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = makeContext({}, {});

    // Spy on the AuthGuard mixin's canActivate to avoid real passport execution
    const mixinProto = Object.getPrototypeOf(Object.getPrototypeOf(guard));
    const superSpy = jest
      .spyOn(mixinProto, 'canActivate')
      .mockResolvedValue(false);

    const result = await guard.canActivate(context);

    expect(superSpy).toHaveBeenCalledWith(context);
    expect(result).toBe(false);
    superSpy.mockRestore();
  });
});
