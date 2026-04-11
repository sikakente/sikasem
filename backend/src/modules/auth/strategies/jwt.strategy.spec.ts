import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate()', () => {
    it('returns the decoded sub, email, roles payload for a valid token', async () => {
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
        roles: ['admin'],
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        sub: 'user-1',
        email: 'test@example.com',
        roles: ['admin'],
      });
    });
  });
});
