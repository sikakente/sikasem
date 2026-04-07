import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';

const makeUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  fullName: 'Test User',
  passwordHash: '',
  userRoles: [{ role: { name: 'admin' } }],
  ...overrides,
});

const makeToken = (overrides = {}) => ({
  id: 'token-1',
  userId: 'user-1',
  tokenHash: '',
  revokedAt: null,
  expiresAt: new Date(Date.now() + 86400000),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmail' | 'findById'>>;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };

    const mockPrisma = {
      refreshToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
      verify: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('development'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = mockUsersService as any;
    prisma = mockPrisma as any;
    jwtService = mockJwtService as any;
  });

  describe('login()', () => {
    it('returns accessToken, refreshToken, and user for valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 10);
      const user = makeUser({ passwordHash: hash });
      usersService.findByEmail.mockResolvedValue(user as any);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await service.login('test@example.com', 'password123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      usersService.findByEmail.mockResolvedValue(makeUser({ passwordHash: hash }) as any);

      await expect(service.login('test@example.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login('unknown@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh()', () => {
    it('issues a new token pair and revokes the old token record', async () => {
      const storedToken = makeToken();
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(storedToken);
      (prisma.refreshToken.update as jest.Mock).mockResolvedValue({});
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      usersService.findById.mockResolvedValue(makeUser() as any);

      const result = await service.refresh('some-raw-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: storedToken.id } }),
      );
    });

    it('revokes all sessions and throws when a revoked token is presented', async () => {
      const storedToken = makeToken({ revokedAt: new Date() });
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(storedToken);
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({});

      await expect(service.refresh('revoked-token')).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('throws UnauthorizedException for an expired token', async () => {
      const expiredToken = makeToken({ expiresAt: new Date(Date.now() - 1000) });
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(expiredToken);

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout()', () => {
    it('sets revokedAt on the specific token row only', async () => {
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.logout('user-1', 'some-raw-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
      );
    });
  });

  describe('logoutAll()', () => {
    it('sets revokedAt on every token row for the user', async () => {
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      await service.logoutAll('user-1');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('resetPassword()', () => {
    it('updates passwordHash and revokes all refresh tokens', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', purpose: 'reset' });
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      await service.resetPassword('valid-reset-token', 'NewPassword1!');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('throws UnauthorizedException for invalid reset token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.resetPassword('bad-token', 'NewPassword1!')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
