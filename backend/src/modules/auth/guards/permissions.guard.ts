import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';

interface CacheEntry {
  permissions: Set<string>;
  expiresAt: number;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 5 * 60 * 1000;

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      'permission',
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermission) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.roles) return false;

    const cacheKey = [...user.roles].sort().join(',');
    const permissions = await this.getPermissions(cacheKey, user.roles);
    return permissions.has(requiredPermission);
  }

  private async getPermissions(
    cacheKey: string,
    roles: string[],
  ): Promise<Set<string>> {
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    const roleRecords = await this.prisma.role.findMany({
      where: { name: { in: roles } },
      include: { rolePermissions: { include: { permission: true } } },
    });

    const permissions = new Set<string>();
    for (const role of roleRecords) {
      for (const rp of role.rolePermissions) {
        permissions.add(rp.permission.code);
      }
    }

    this.cache.set(cacheKey, {
      permissions,
      expiresAt: Date.now() + this.TTL_MS,
    });
    return permissions;
  }
}
