import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../prisma/prisma.service';
import { SYSTEM_PROMPT } from './prompts/system-prompt';
import {
  inventoryTool,
  inventoryQueryTool,
} from './tools/inventory-query.tool';
import { salesTool, salesQueryTool } from './tools/sales-query.tool';
import { shipmentTool, shipmentQueryTool } from './tools/shipment-query.tool';
import { supplierTool, supplierQueryTool } from './tools/supplier-query.tool';
import { fxTool, fxQueryTool } from './tools/fx-query.tool';
import { riskTool, riskQueryTool } from './tools/risk-query.tool';
import { AiChatResponse } from './dto/chat-response.dto';

type ToolInput = Record<string, unknown>;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly prisma: PrismaService) {}

  async chat(userId: string, message: string): Promise<AiChatResponse> {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const tools: Anthropic.Tool[] = [
      inventoryTool,
      salesTool,
      shipmentTool,
      supplierTool,
      fxTool,
      riskTool,
    ];

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: message },
    ];
    const toolsUsed: string[] = [];

    const systemPrompt = SYSTEM_PROMPT.replace(
      '{date}',
      new Date().toISOString().split('T')[0],
    );

    let response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      tools,
      messages,
    });

    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          toolsUsed.push(block.name);
          const result = await this.executeTool(
            block.name,
            block.input as ToolInput,
          );
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        }),
      );

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        tools,
        messages,
      });
    }

    const rawText =
      response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
        ?.text ?? '';

    const parsed = this.parseResponseSections(rawText);

    const insightType = this.classifyInsight(parsed);

    await this.prisma.aiInsightLog.create({
      data: {
        userId,
        promptText: message,
        responseText: rawText,
        insightType,
      },
    });

    return {
      ...parsed,
      rawText,
      toolsUsed,
      createdAt: new Date().toISOString(),
    };
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.aiInsightLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          promptText: true,
          responseText: true,
          insightType: true,
          createdAt: true,
        },
      }),
      this.prisma.aiInsightLog.count({ where: { userId } }),
    ]);
    return { data: logs, meta: { total, page, limit } };
  }

  async executeTool(name: string, input: ToolInput): Promise<object> {
    const toolMap: Record<
      string,
      (prisma: PrismaService, input: ToolInput) => Promise<object>
    > = {
      get_inventory_summary: inventoryQueryTool as (
        p: PrismaService,
        i: ToolInput,
      ) => Promise<object>,
      get_sales_summary: salesQueryTool as (
        p: PrismaService,
        i: ToolInput,
      ) => Promise<object>,
      get_shipment_summary: shipmentQueryTool as (
        p: PrismaService,
        i: ToolInput,
      ) => Promise<object>,
      get_supplier_summary: supplierQueryTool as (
        p: PrismaService,
        i: ToolInput,
      ) => Promise<object>,
      get_fx_summary: fxQueryTool as (
        p: PrismaService,
        i: ToolInput,
      ) => Promise<object>,
      get_active_risks_and_alerts: riskQueryTool as (
        p: PrismaService,
        i: ToolInput,
      ) => Promise<object>,
    };

    const fn = toolMap[name];
    if (!fn) return {};

    try {
      return await fn(this.prisma, input);
    } catch (err) {
      this.logger.error(`Tool ${name} failed`, err);
      return {};
    }
  }

  parseResponseSections(
    text: string,
  ): Omit<AiChatResponse, 'rawText' | 'toolsUsed' | 'createdAt'> {
    const extract = (tag: string): string | undefined => {
      const match = text.match(
        new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'),
      );
      return match ? match[1].trim() : undefined;
    };

    return {
      internalData: extract('internal_data'),
      externalTrend: extract('external_trend'),
      recommendation: extract('recommendation'),
      risk: extract('risk'),
      opportunity: extract('opportunity'),
    };
  }

  private classifyInsight(
    parsed: Omit<AiChatResponse, 'rawText' | 'toolsUsed' | 'createdAt'>,
  ): string {
    if (parsed.risk) return 'risk';
    if (parsed.opportunity) return 'opportunity';
    if (parsed.recommendation) return 'recommendation';
    return 'general';
  }
}
