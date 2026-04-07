# STEP-12: AI Assistant

## Goal
Build the Claude-powered natural language business insight layer. The backend safely queries business data on behalf of the model using tool use. The frontend provides a conversational chat interface with labelled answer cards. After this step the business owner can ask plain-English questions and get data-grounded answers about their business.

## Prerequisites
- STEP-00, STEP-01, STEP-03 (inventory), STEP-04 (shipments), STEP-06 (sales), STEP-07 (FX), STEP-09 (dashboard), STEP-11 (risks/opportunities)

## Reference Documents
- `requirements/grocery_export_prd.md` — section 6.14 (AI Assistant)
- `requirements/grocery_export_ai_design_brief.md` — section 12 (AI Guardrails)
- `requirements/grocery_export_screen_map_user_flows.md` — section 4.16, 5.10

---

## Key Decisions

### Tool Use Architecture
Claude does NOT receive raw SQL or direct database access. Instead, the backend exposes a set of **typed data-fetch tools** that Claude can call. The backend executes these tools against the database and returns structured results. Claude synthesises the results into a natural language response.

Flow:
```
User question → AiService.chat()
  → Build system prompt with business context
  → Call Claude with tools defined
  → Claude returns tool_use blocks
  → Backend executes each tool (safe Prisma queries)
  → Return tool results to Claude
  → Claude returns final text response
  → Parse response into labelled sections
  → Store in ai_insight_logs
  → Return to frontend
```

### Tool Definitions
Each tool is a Prisma query wrapped in a function. Claude can call multiple tools per request. Tools are read-only — never write to the database.

### Response Labelling
Claude is instructed (via system prompt) to structure its response with XML-style section tags:
```
<internal_data>Facts from your business data</internal_data>
<external_trend>General market context (if relevant)</external_trend>
<recommendation>Suggested action</recommendation>
<risk>Risk flag</risk>
<opportunity>Opportunity flag</opportunity>
```
The frontend parses these tags and renders each section with a distinct visual treatment.

### Model
Use `claude-sonnet-4-6` (current Sonnet model) as the default. This is the recommended default from the environment context.

### Guardrails
- Tools return empty results if no data is available — Claude must acknowledge uncertainty
- System prompt explicitly instructs Claude to never invent numbers
- If a tool returns no data, Claude says "I don't have enough data to answer this"
- External trend information is clearly labelled and separated from internal data facts

---

## Backend Files to Create

### `backend/src/modules/ai/ai.module.ts`
Imports `PrismaModule`. No exports (not used by other modules).

### `backend/src/modules/ai/prompts/system-prompt.ts`
```typescript
export const SYSTEM_PROMPT = `
You are a business intelligence assistant for a UK-to-Ghana grocery export business.
You have access to tools that query the business's live data.

Rules you must always follow:
1. Only state facts that come from the tool results. Never invent numbers.
2. If tool results are empty, say so clearly.
3. Separate internal data insights from general market information.
4. Use GBP for UK costs and GHS for Ghana sales unless asked otherwise.
5. Structure your response using these XML tags:
   <internal_data>...</internal_data>
   <external_trend>...</external_trend>
   <recommendation>...</recommendation>
   <risk>...</risk>
   <opportunity>...</opportunity>
   Only include sections that are relevant to the question.
6. Be concise. Use bullet points for lists of items.
7. Today's date is {date}. The business's base currency is GBP.
`;
```

### `backend/src/modules/ai/tools/inventory-query.tool.ts`
Tool name: `get_inventory_summary`
Description: "Get current stock levels, low stock products, and inventory value"
Parameters: `{ locationId?: string, lowStockOnly?: boolean }`
Implementation: queries `inventory_balances` joined with `products`. Returns top 20 results.

### `backend/src/modules/ai/tools/sales-query.tool.ts`
Tool name: `get_sales_summary`
Description: "Get sales performance, top products, revenue, and profit estimates"
Parameters: `{ dateFrom?: string, dateTo?: string, topN?: number }`
Implementation: aggregates `sale_items` and `sales`. Returns revenue, units sold, estimated margin per product.

### `backend/src/modules/ai/tools/shipment-query.tool.ts`
Tool name: `get_shipment_summary`
Description: "Get shipment status, transit times, delays, and shipping costs"
Parameters: `{ status?: string, dateFrom?: string, dateTo?: string }`
Implementation: queries `shipments` with `shipment_costs` totals and transit time calculations.

### `backend/src/modules/ai/tools/supplier-query.tool.ts`
Tool name: `get_supplier_summary`
Description: "Get supplier spend, product sourcing, and cost comparisons"
Parameters: `{ supplierId?: string, dateFrom?: string, dateTo?: string }`
Implementation: aggregates `purchase_order_items` grouped by supplier.

### `backend/src/modules/ai/tools/fx-query.tool.ts`
Tool name: `get_fx_summary`
Description: "Get FX rates, gain/loss, and repatriation summary"
Parameters: `{ dateFrom?: string, dateTo?: string }`
Implementation: queries `fx_records` and `cash_conversions` for period summary.

### `backend/src/modules/ai/tools/risk-query.tool.ts`
Tool name: `get_active_risks_and_alerts`
Description: "Get current open risks, alerts, and opportunities"
Parameters: `{}` (no params)
Implementation: returns open `risk_records`, `alerts` (high/critical only), `opportunity_records`.

### `backend/src/modules/ai/ai.service.ts`
```typescript
async chat(userId: string, message: string): Promise<AiChatResponse> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Define tools array from the tool definitions above
  const tools = [inventoryTool, salesTool, shipmentTool, supplierTool, fxTool, riskTool];

  // Initial message
  const messages = [{ role: 'user', content: message }];

  // Agentic loop: keep running until Claude stops requesting tools
  let response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT.replace('{date}', new Date().toISOString().split('T')[0]),
    tools,
    messages,
  });

  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    const toolResults = await Promise.all(
      toolUseBlocks.map(block => this.executeTool(block.name, block.input))
    );

    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: toolResults.map((result, i) => ({
        type: 'tool_result',
        tool_use_id: toolUseBlocks[i].id,
        content: JSON.stringify(result),
      })),
    });

    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT.replace('{date}', new Date().toISOString().split('T')[0]),
      tools,
      messages,
    });
  }

  const rawText = response.content.find(b => b.type === 'text')?.text ?? '';
  const parsed = this.parseResponseSections(rawText);

  // Store in ai_insight_logs
  await this.prisma.aiInsightLog.create({ data: { userId, promptText: message, responseText: rawText, insightType: this.classifyInsight(parsed) } });

  return parsed;
}

private async executeTool(name: string, input: object): Promise<object> {
  // dispatch to the correct tool function
  const toolMap = { get_inventory_summary: inventoryQueryTool, ... };
  return toolMap[name]?.(this.prisma, input) ?? {};
}

private parseResponseSections(text: string): AiChatResponse {
  // Extract content from <internal_data>, <external_trend>, <recommendation>, <risk>, <opportunity> tags
  // Return as structured object
}
```

### `backend/src/modules/ai/dto/chat-message.dto.ts`
```typescript
export class ChatMessageDto {
  @IsString() @MinLength(1) @MaxLength(2000) message: string;
}
```

### `backend/src/modules/ai/dto/chat-response.dto.ts`
```typescript
export interface AiChatResponse {
  internalData?: string;
  externalTrend?: string;
  recommendation?: string;
  risk?: string;
  opportunity?: string;
  rawText: string;
  toolsUsed: string[];
  createdAt: string;
}
```

### `backend/src/modules/ai/ai.controller.ts`
```
POST /api/v1/ai/chat     @Roles('admin','operations','finance','viewer')
GET  /api/v1/ai/history  @Roles('admin','operations','finance','viewer')
```
`POST /chat` is rate-limited to 20 requests per user per minute using a simple in-memory counter. Add `ThrottlerModule` if needed.

---

## Unit Tests to Write

### `backend/src/modules/ai/ai.service.spec.ts`
- `parseResponseSections()` correctly extracts `<internal_data>` content
- `parseResponseSections()` correctly extracts `<recommendation>`, `<risk>`, and `<opportunity>` content
- `parseResponseSections()` returns `rawText` unchanged when no XML tags are present
- `parseResponseSections()` returns `undefined` for sections whose tags are absent in the response
- `executeTool()` dispatches to the correct tool function by name
- `executeTool()` returns `{}` (empty object) for an unknown tool name — never throws
- `chat()` stores the interaction in `ai_insight_logs` after receiving the final response
- `chat()` passes today's date into the system prompt (the `{date}` placeholder is replaced)

### `backend/src/modules/ai/tools/inventory-query.tool.spec.ts`
- Returns an array of inventory items from the DB (mocked Prisma)
- Returns an empty array when no inventory records exist — does not throw

### `backend/src/modules/ai/tools/sales-query.tool.spec.ts`
- Returns revenue and unit totals scoped to the provided `dateFrom`/`dateTo`

---

## Frontend Files to Create

### `mobile/src/store/ai.store.ts`
```typescript
interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string | AiChatResponse;
  timestamp: Date;
}

interface AiState {
  messages: AiMessage[];
  isLoading: boolean;
  addMessage: (message: AiMessage) => void;
  clearHistory: () => void;
}
```
Messages are stored in-memory per session. Not persisted to device (server history available via `GET /ai/history`).

### `mobile/src/components/AiMessageBubble.tsx`
Renders a single AI message. For user messages: simple right-aligned bubble. For assistant messages: structured card layout with sections:
- `<internal_data>` section: blue tint, "Data" label, bar chart icon
- `<external_trend>` section: grey tint, "Trend" label, globe icon
- `<recommendation>` section: green tint, "Action" label, arrow icon
- `<risk>` section: red tint, "Risk" label, warning icon
- `<opportunity>` section: amber tint, "Opportunity" label, lightbulb icon

If only raw text (no tags), render as a plain text bubble.

### `mobile/src/components/AiPromptSuggestions.tsx`
Horizontal scrollable row of tappable prompt chips:
```
"Top selling products" | "Shipping costs this month" | "FX impact" | "What risks need attention?" | "Slow-moving stock" | "Which supplier costs most?"
```
Tapping a chip fills the input with that prompt.

### `mobile/src/app/(app)/ai/index.tsx`
AI Chat Main Screen:
- Header: "AI Assistant" with model name badge
- Chat message list (`FlashList`, inverted so newest at bottom)
- `AiPromptSuggestions` shown when chat is empty
- Text input at bottom with send button
- Loading indicator (animated typing dots) while waiting for response
- "Clear chat" button in header
- Each assistant message uses `AiMessageBubble`
- Long messages are truncated with a "Show more" toggle

### `mobile/src/lib/api/ai.api.ts`
```typescript
export const aiApi = {
  chat: (message: string) => client.post('/ai/chat', { message }),
  getHistory: (params?) => client.get('/ai/history', { params }),
};
```

---

## Implementation Steps

1. Install `@anthropic-ai/sdk` in backend — confirm `ANTHROPIC_API_KEY` is accessible from env/Secrets Manager
2. Implement the 6 tool functions — test each by calling them directly with Prisma
3. Write the system prompt — test it renders with today's date
4. Implement `AiService.chat()` with the agentic tool-use loop
5. Test a simple question via Swagger: "What are my top selling products?" — verify tool is called, results passed back to Claude, and a structured response is returned
6. Test a question that requires multiple tools: "What is my overall profitability and which shipment cost the most?"
7. Write unit tests for `parseResponseSections()` first, then implement until all pass
8. Implement rate limiting
9. Run `npm test` — all AI service unit tests must pass
10. Build `AiMessageBubble` component — test with mock data showing all section types
10. Build `AiPromptSuggestions` component
11. Build AI Chat screen — test the full conversation flow on device
12. Test on device: ask a real question about test data and verify the answer cites actual numbers

## Acceptance Criteria
- `POST /ai/chat` invokes the Claude tool-use loop and returns a structured response
- Claude only answers with data returned by the tools — if tools return empty, Claude says so
- Response parsing correctly separates internal_data, external_trend, recommendation, risk, and opportunity sections
- AI Chat screen renders section-labelled response cards correctly
- Prompt suggestions fill the input on tap
- Rate limiting rejects more than 20 requests/minute per user with a 429 response
- All interactions are stored in `ai_insight_logs`
- The response to "What are my top selling products?" names real products from the database
- `npm test` passes — `parseResponseSections()`, `executeTool()` dispatch, and `ai_insight_logs` persistence are all unit-tested
