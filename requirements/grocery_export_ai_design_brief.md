# AI System Design Brief
## Execution Notes, Design Constraints, and Build Priorities

## 1. Purpose of This Document

This document tells an AI system or builder how to design the platform. It should be used together with the PRD.

The platform is not just an inventory system. It is a combined:

- inventory management system
- export and logistics tracker
- Ghana POS system
- FX-aware profitability tracker
- business dashboard and reporting layer
- AI insights assistant

The hardest requirement is accurate end-to-end profitability tracking across purchase cost, shipment cost, sales, and exchange rate movement across time.

## 2. Primary Design Constraint

The system must be designed so that the business owner can answer these questions accurately:

- what did I buy
- where did I buy it from
- when did I ship it
- when did it arrive
- what did it cost me to land in Ghana
- what did I sell it for in GHS
- what was that worth in GBP at sale time
- what did I actually receive back in GBP when I converted the money
- what profit did I really make after logistics and FX

If the system cannot answer these accurately, the design is wrong.

## 3. Recommended System Approach

### Application Type
- React Native mobile app built with Expo
- targets iOS and Android from a single codebase
- operational screens optimised for phone
- tablet layout used for admin and reporting where screen space allows

### Frontend Stack
- React Native with Expo (managed workflow)
- Expo Router for file-based navigation
- TypeScript throughout
- barcode scanning via Expo Camera or a dedicated barcode library such as expo-barcode-scanner
- PDF viewing and download via expo-print or react-native-pdf
- state management via Zustand or React Query depending on server vs client state
- local storage via expo-secure-store for tokens and expo-sqlite or MMKV for offline caching if needed

### Suggested Architecture
- React Native Expo frontend
- NestJS backend API
- relational database (PostgreSQL)
- file storage for invoices, receipts, and attachments
- analytics layer for dashboard metrics
- AI assistant layer with controlled data access

## 4. Recommended Core Domain Model

At minimum, design the following core entities and relationships:

- users
- roles
- suppliers
- products
- product categories
- barcodes
- purchases
- purchase line items
- inventory locations
- inventory balances
- inventory movements
- shipments
- shipment line items
- shipment cost entries
- shipment status history
- receiving records
- customers
- sales transactions
- sales line items
- payments
- invoices
- receipts
- FX records
- conversion records
- alerts
- risk records
- opportunity records
- audit logs

## 5. Data Modelling Principles

### Inventory Must Be Movement-Based
Do not rely only on a current quantity field.

Use:
- inventory movements
- balances derived from movement history or maintained transactionally

This is needed for:
- traceability
- corrections
- auditability
- shipment allocation
- receiving discrepancies

### Costs Must Be Traceable
Each product unit should be attributable to:
- purchase cost
- supplier source
- shipment cost allocation
- landed cost

### FX Must Be Stored as Events
Do not only store one exchange rate field.

Store separate FX records for:
- purchase
- sale
- repatriation or conversion back to GBP

This is required for proper FX gain and loss analysis.

## 6. Cost and Profitability Logic

The system must support these cost layers:

### Base Cost
- purchase cost in GBP

### Purchase FX Layer
- GHS equivalent of purchase cost using FX rate at purchase time

### Logistics Layer
- freight
- duties
- local transport
- insurance
- packaging
- handling
- other shipment charges

### Landed Cost
The system should allocate shipment costs across units or line items using a defined rule such as:
- quantity-based allocation
- weight-based allocation
- value-based allocation

The AI designer should choose one for MVP and keep it configurable later.

### Sales Layer
- sale price in GHS
- sale FX conversion to GBP equivalent

### Repatriation Layer
- GHS converted back to GBP
- actual GBP received
- realised FX gain or loss

### Reporting Outputs Must Support
- gross profit
- net profit after shipping
- margin percentage
- profit by product
- profit by shipment
- profit by supplier
- FX gain and loss

## 7. Supplier Tracking Logic

The design must allow the user to analyse:
- which shop or supplier each product came from
- whether the same product is bought from multiple suppliers
- cost differences by supplier
- spend by supplier over time
- margin by supplier source where relevant

This means purchases must be linked to suppliers at transaction level, not only at product master level.

## 8. Shipment and Transit Logic

Shipment tracking must support:
- draft shipment creation
- product allocation into shipment
- stock movement into in-transit state
- status history
- actual arrival recording
- receiving discrepancies
- transit time calculation

Transit time should be calculated using dispatch date to actual arrival date.

System should also support:
- average transit time by carrier
- average transit time by route
- delayed shipment detection
- transit trend reporting

## 9. POS Design Requirements

Operational priorities for POS:
- barcode-first workflow
- fast cart building
- minimal clicks
- mobile usability
- clear payment capture
- instant receipt generation
- stock deduction in real time

POS must be tightly linked to Ghana inventory only unless multi-location selling is introduced later.

## 10. Invoice and Receipt Logic

Document generation must be deterministic and printable.

Requirements:
- invoice numbering
- receipt numbering
- PDF output
- document history
- ability to regenerate stored documents
- clear link to source transaction

## 11. Dashboard Design Priorities

Dashboard should prioritise action, not decoration.

Show:
- sales performance
- margin performance
- inventory status
- shipment status
- transit time
- shipping cost trends
- FX impact
- supplier spend insights
- risks requiring action
- opportunities requiring action

On mobile, use stacked KPI cards and concise charts.

## 12. AI Assistant Guardrails

The AI assistant should operate under strict rules.

### It Must Be Able To
- query internal structured business data
- summarise business performance
- detect anomalies
- identify risk patterns
- identify opportunity patterns
- answer natural language questions

### It Must Not
- invent figures
- mix internal facts with external trends without labeling them
- overstate certainty when data is incomplete

### AI Output Types
- internal data insight
- external trend summary
- recommendation
- alert explanation
- next best action

Each answer should separate those where possible.

## 13. Risk Engine Guidance

The system should include rules for risk identification, such as:
- low stock and high recent sell-through
- repeated shipment delays
- unusual shipping cost increase
- margin compression
- frequent receiving discrepancies
- supplier concentration risk
- large FX losses
- old stock or slow-moving stock
- expiry risk where applicable

Outputs should be visible in both:
- dashboard
- AI assistant

## 14. Opportunity Engine Guidance

The system should also look for:
- strong demand with understocking
- margin-rich products
- cheaper suppliers for the same item
- shipment consolidation opportunities
- price increase opportunities
- high-performing categories
- repeat purchase customer patterns
- profitable timing or seasonal patterns

## 15. Mobile-First Screen Priorities

The following screens must be especially strong on phone:

- barcode scan
- product lookup
- stock receive workflow
- shipment status update
- POS checkout
- receipt generation
- dashboard summary
- AI chat

## 16. Recommended MVP Build Order

1. authentication and roles
2. product and barcode
3. supplier management
4. purchasing
5. inventory movement engine
6. shipment creation and tracking
7. shipping cost capture
8. receiving workflow
9. POS
10. receipts and invoices
11. dashboard
12. FX event tracking
13. risk and alert rules
14. AI insights layer

## 17. Acceptance Standard for MVP

The MVP is acceptable only if the user can complete this end-to-end scenario:

1. create supplier
2. create or scan product
3. record purchase in GBP
4. record purchase FX
5. move stock into inventory
6. allocate stock to shipment
7. record shipment dates and shipping costs
8. receive stock in Ghana
9. sell stock through POS in GHS
10. record sale FX
11. log conversion of GHS back to GBP
12. see real profitability on dashboard

If this scenario works cleanly on phone and desktop, the core design is correct.

## 18. Suggested Outputs From AI Builder

The AI system designing this product should ideally produce:

- database schema
- entity relationship diagram
- API specification
- role and permission matrix
- screen list and user flows
- dashboard metric definitions
- AI insight rules
- risk detection rules
- deployment architecture
- phased roadmap

## 19. Final Instruction

Design this system around truth, traceability, and usability.

Truth means:
- financial numbers are reliable
- stock is accurate
- shipment timelines are accurate
- FX is tracked at the right points

Traceability means:
- every stock and money movement can be explained
- every document can be tied back to a source transaction

Usability means:
- staff can operate it quickly
- it works smoothly on phones
- the owner can understand the business at a glance

The system should feel simple to use, but rigorous underneath.
