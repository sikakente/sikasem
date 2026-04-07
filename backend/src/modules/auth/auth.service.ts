import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(email: string, password: string) {
    this.logger.log(`Login attempt: ${email}`);
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.warn(`Login failed: no account found for ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      this.logger.warn(`Login failed: wrong password for ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = user.userRoles.map((ur: { role: { name: string } }) => ur.role.name);
    const accessToken = this.signAccessToken(user.id, user.email, roles);
    const rawRefreshToken = this.generateRawToken();
    await this.storeRefreshToken(user.id, rawRefreshToken);

    this.logger.log(`Login success: ${email} (roles: ${roles.join(', ')})`);
    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { id: user.id, email: user.email, fullName: user.fullName, roles },
    };
  }

  async refresh(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findFirst({ where: { tokenHash } });

    if (!stored) {
      this.logger.warn('Token refresh failed: token not found');
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      this.logger.warn(`Token refresh failed: reuse detected for userId=${stored.userId} — revoking all sessions`);
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (stored.expiresAt < new Date()) {
      this.logger.warn(`Token refresh failed: expired token for userId=${stored.userId}`);
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.usersService.findById(stored.userId);
    const roles = user.userRoles.map((ur: { role: { name: string } }) => ur.role.name);

    const newAccessToken = this.signAccessToken(user.id, user.email, roles);
    const newRawRefreshToken = this.generateRawToken();
    await this.storeRefreshToken(user.id, newRawRefreshToken);

    this.logger.log(`Token refreshed for ${user.email}`);
    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      user: { id: user.id, email: user.email, fullName: user.fullName, roles },
    };
  }

  async logout(userId: string, rawRefreshToken: string) {
    this.logger.log(`Logout: userId=${userId}`);
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string) {
    this.logger.log(`Logout all sessions: userId=${userId}`);
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return; // Silently succeed — do not reveal email existence

    const resetToken = this.jwtService.sign(
      { sub: user.id, purpose: 'reset' },
      { expiresIn: '10m' },
    );

    const resetLink = `exportapp://reset-password?token=${resetToken}`;

    if (this.configService.get('NODE_ENV') === 'production') {
      // TODO: send via AWS SES
      console.log('TODO: send password reset email to', email);
    } else {
      console.log('[DEV] Password reset link:', resetLink);
    }
  }

  async resetPassword(resetToken: string, newPassword: string) {
    let payload: { sub: string; purpose: string };
    try {
      payload = this.jwtService.verify(resetToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (payload.purpose !== 'reset') {
      throw new UnauthorizedException('Invalid token purpose');
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { passwordHash: hash },
    });

    await this.logoutAll(payload.sub);
  }

  private signAccessToken(sub: string, email: string, roles: string[]) {
    return this.jwtService.sign({ sub, email, roles }, { expiresIn: '15m' });
  }

  private generateRawToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private async storeRefreshToken(userId: string, rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }
}
