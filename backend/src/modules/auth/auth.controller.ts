import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto.email, dto.password);
    return { data: result };
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refresh(dto.refreshToken);
    return { data: result };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Request() req: { user: { sub: string } },
    @Body() dto: RefreshTokenDto,
  ) {
    await this.authService.logout(req.user.sub, dto.refreshToken);
    return { data: { message: 'Logged out' } };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@Request() req: { user: { sub: string } }) {
    await this.authService.logoutAll(req.user.sub);
    return { data: { message: 'All sessions terminated' } };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    await this.authService.forgotPassword(body.email);
    return {
      data: { message: 'If that email exists, a reset link has been sent' },
    };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { data: { message: 'Password reset successfully' } };
  }
}
