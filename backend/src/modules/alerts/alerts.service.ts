import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from '@aws-sdk/client-ses';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertQueryDto } from './dto/alert-query.dto';
import { runLowStockRule } from './alert-rules/low-stock.rule';
import { runShipmentDelayRule } from './alert-rules/shipment-delay.rule';
import { runFxLossRule } from './alert-rules/fx-loss.rule';
import { runExpiryRiskRule } from './alert-rules/expiry-risk.rule';

interface CreateOrSkipParams {
  alertType: string;
  severity: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private sesClient: SESClient;

  constructor(private prisma: PrismaService) {
    this.sesClient = new SESClient({
      region: process.env.AWS_REGION ?? 'eu-west-1',
    });
  }

  @Cron('*/30 * * * *')
  async runAlertDetection(): Promise<void> {
    this.logger.log('Running alert detection...');
    const results = await Promise.allSettled([
      runLowStockRule(this.prisma, this),
      runShipmentDelayRule(this.prisma, this),
      runFxLossRule(this.prisma, this),
      runExpiryRiskRule(this.prisma, this),
    ]);
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error('Alert rule failed', result.reason);
      }
    }
    this.logger.log('Alert detection complete');
  }

  async createOrSkip(params: CreateOrSkipParams): Promise<void> {
    const existing = await this.prisma.alert.findFirst({
      where: {
        alertType: params.alertType,
        relatedEntityType: params.relatedEntityType ?? null,
        relatedEntityId: params.relatedEntityId ?? null,
        status: 'open',
      },
    });

    if (existing) return;

    const alert = await this.prisma.alert.create({
      data: {
        alertType: params.alertType,
        severity: params.severity,
        title: params.title,
        message: params.message,
        relatedEntityType: params.relatedEntityType,
        relatedEntityId: params.relatedEntityId,
        status: 'open',
      },
    });

    if (alert.severity === 'high' || alert.severity === 'critical') {
      this.sendEmailNotification(alert).catch((err) =>
        this.logger.error('Failed to send alert email', err),
      );
    }
  }

  async findAll(query: AlertQueryDto) {
    const { page = 1, limit = 20, severity, alertType, status } = query;
    const where: Record<string, unknown> = {};
    if (severity) where.severity = severity;
    if (alertType) where.alertType = alertType;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.alert.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findById(id: string) {
    const alert = await this.prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException(`Alert ${id} not found`);
    return alert;
  }

  async acknowledge(id: string, userId: string) {
    await this.findById(id);
    return this.prisma.alert.update({
      where: { id },
      data: {
        status: 'acknowledged',
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
    });
  }

  async resolve(id: string, userId: string) {
    await this.findById(id);
    return this.prisma.alert.update({
      where: { id },
      data: {
        status: 'resolved',
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
    });
  }

  async dismiss(id: string, userId: string) {
    await this.findById(id);
    return this.prisma.alert.update({
      where: { id },
      data: {
        status: 'dismissed',
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
    });
  }

  private async sendEmailNotification(alert: {
    id: string;
    alertType: string;
    severity: string;
    title: string;
    message: string;
  }): Promise<void> {
    const fromAddress = process.env.SES_FROM_EMAIL;
    if (!fromAddress) {
      this.logger.warn('SES_FROM_EMAIL not set — skipping email notification');
      return;
    }

    const recipients = await this.prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: {
          some: { role: { name: { in: ['admin', 'operations'] } } },
        },
      },
      select: { email: true },
    });

    if (recipients.length === 0) return;

    const input: SendEmailCommandInput = {
      Source: fromAddress,
      Destination: { ToAddresses: recipients.map((u) => u.email) },
      Message: {
        Subject: { Data: `[${alert.severity.toUpperCase()}] ${alert.title}` },
        Body: { Text: { Data: alert.message } },
      },
    };

    await this.sesClient.send(new SendEmailCommand(input));
  }
}
