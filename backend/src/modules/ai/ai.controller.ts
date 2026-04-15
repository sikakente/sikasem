import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { AiService } from './ai.service';
import { ChatMessageDto } from './dto/chat-message.dto';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

@ApiTags('ai')
@Controller('ai')
export class AiController {
  private readonly rateLimitMap = new Map<string, RateLimitEntry>();
  private readonly RATE_LIMIT = 20;
  private readonly WINDOW_MS = 60_000;

  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @HttpCode(200)
  @Roles('admin', 'operations', 'finance', 'viewer')
  async chat(@Body() dto: ChatMessageDto, @Req() req: Request) {
    const userId = (req.user as { sub: string }).sub;
    this.checkRateLimit(userId);
    return this.aiService.chat(userId, dto.message);
  }

  @Get('history')
  @Roles('admin', 'operations', 'finance', 'viewer')
  getHistory(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = (req.user as { sub: string }).sub;
    return this.aiService.getHistory(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  private checkRateLimit(userId: string): void {
    const now = Date.now();
    const entry = this.rateLimitMap.get(userId);

    if (!entry || now - entry.windowStart >= this.WINDOW_MS) {
      this.rateLimitMap.set(userId, { count: 1, windowStart: now });
      return;
    }

    if (entry.count >= this.RATE_LIMIT) {
      throw new HttpException(
        'Rate limit exceeded: 20 requests per minute',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count++;
  }
}
