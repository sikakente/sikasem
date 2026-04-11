import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

const makeUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  fullName: 'Test User',
  passwordHash: 'hashed',
  phone: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  userRoles: [{ role: { name: 'admin' } }],
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = mockPrisma as any;
  });

  describe('findByEmail()', () => {
    it('returns the user record including roles', async () => {
      const user = makeUser();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(user);
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'test@example.com' } }),
      );
    });
  });

  describe('create()', () => {
    it('hashes the password before storing — stored hash is not the plain-text password', async () => {
      let capturedData: any;
      (prisma.user.create as jest.Mock).mockImplementation(({ data }) => {
        capturedData = data;
        return makeUser({ passwordHash: data.passwordHash });
      });

      const dto = {
        fullName: 'New User',
        email: 'new@example.com',
        password: 'plaintext123',
        roleId: 'role-uuid',
      };

      await service.create(dto);

      expect(capturedData.passwordHash).not.toBe('plaintext123');
      const isValid = await bcrypt.compare(
        'plaintext123',
        capturedData.passwordHash,
      );
      expect(isValid).toBe(true);
    });
  });

  describe('deactivate()', () => {
    it('sets isActive to false without deleting the record', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
      (prisma.user.update as jest.Mock).mockResolvedValue(
        makeUser({ isActive: false }),
      );

      const result = await service.deactivate('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
      expect(result.isActive).toBe(false);
    });

    it('throws NotFoundException when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deactivate('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
