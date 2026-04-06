# Product Requirements Document (PRD)
## Inventory, POS, Export Logistics & AI Intelligence Platform

## 1. Product Summary

### Goal
Build a mobile-first web application that enables a UK to Ghana grocery export business to:

- track inventory across the export lifecycle
- track shipments and transit time
- manage POS sales in Ghana
- track shipping and landed costs
- track FX exposure across the lifecycle
- track suppliers and shops where goods are purchased
- generate invoices and receipts
- provide dashboards and reporting
- provide AI-driven insights, risks, and opportunities

## 2. Core Product Modules

| Module | Description | Priority |
|---|---|---|
| Authentication & Roles | User access control | MVP |
| Product & Barcode | Product catalogue and scanning | MVP |
| Supplier Management | Shops where goods are sourced | MVP |
| Purchasing | Record stock purchases and source pricing | MVP |
| Inventory | Stock tracking across lifecycle | MVP |
| Shipment Tracking | Export lifecycle tracking | MVP |
| FX Tracking | GBP and GHS tracking at 3 points | MVP |
| POS | Sales in Ghana | MVP |
| Invoicing & Receipts | Financial documentation | MVP |
| Dashboard & Reports | Business performance visibility | MVP |
| AI Assistant | Insights, risks, opportunities | MVP-lite |
| Alerts | Notifications for issues | MVP |
| Audit Logs | Action tracking | MVP |

## 3. Business Objectives

The system must help the business:

- know current stock levels at all times
- know which goods have been purchased, shipped, received, and sold
- know which supplier or shop each product was sourced from
- know how long shipments take to arrive in Ghana
- know shipping costs and landed costs
- know sales, revenue, and profit
- know FX impact on profitability
- generate invoices and receipts
- monitor risks and opportunities
- interact with an AI assistant for insights

## 4. Users

### Primary Users
- Business owner
- Warehouse and packing staff
- Ghana receiving staff
- POS cashier or sales staff
- Finance or admin staff

### Secondary Users
- Accountant or bookkeeper
- Operations manager
- Analyst or read-only viewer

## 5. Platform Requirements

### Application Type
- responsive web application
- must work well on desktop, tablet, and phone
- no native app required for phase 1

### Mobile Requirements
- fast and clean phone experience
- barcode scanning via camera
- easy shipment updates
- easy POS use on phones
- dashboard readable on small screens
- AI chat usable on phone without friction

## 6. Functional Requirements

### 6.1 Authentication and Roles

#### User Story
As an admin, I want different users to have different permissions so that sensitive actions are controlled.

#### Acceptance Criteria
- users can log in and log out
- users can reset passwords
- admin can create and manage users
- roles must include at minimum:
  - admin
  - operations
  - warehouse
  - POS cashier
  - finance
  - viewer
- permissions must restrict access to products, inventory, shipments, POS, invoices, reports, and AI tools

---

### 6.2 Product and Barcode Management

#### User Story
As a user, I want to create products and scan them via barcode so I can manage inventory efficiently.

#### Acceptance Criteria
- user can create and edit products
- each product record includes:
  - product name
  - SKU
  - barcode
  - category
  - brand
  - description
  - unit type
  - cost price
  - selling price
  - supplier link where relevant
  - minimum stock threshold
  - expiry date if applicable
  - image
  - active or inactive status
- barcode must be unique
- system supports:
  - phone camera barcode scan
  - hardware barcode scanner input
- products can be searched instantly by barcode, SKU, or name

---

### 6.3 Supplier and Shop Tracking

#### User Story
As a user, I want to track the shops or suppliers where I get goods so I can analyse sourcing and cost efficiency.

#### Acceptance Criteria
- user can create, edit, and archive suppliers
- supplier record includes:
  - supplier name
  - location
  - contact details
  - notes
  - products usually sourced
- each purchase must be linked to a supplier or shop
- system can report:
  - spend by supplier
  - products by supplier
  - average cost by supplier
  - cost comparison across suppliers for the same product

---

### 6.4 Purchasing

#### User Story
As a user, I want to log purchases so I can track product cost, source, and FX impact.

#### Acceptance Criteria
- user can create purchase records
- each purchase record includes:
  - supplier
  - product
  - quantity
  - purchase date
  - unit cost in GBP
  - total cost in GBP
  - FX rate at purchase
  - GHS equivalent at purchase
- system increases inventory after purchase is recorded
- purchase history must remain visible for each product

---

### 6.5 Inventory Management

#### User Story
As a user, I want to track stock across locations and stages so I always know where goods are.

#### Inventory States
- in stock in UK
- allocated to shipment
- in transit
- received in Ghana
- available for sale
- sold
- damaged
- lost
- expired
- returned

#### Acceptance Criteria
- system maintains stock balance by product and location
- system records all stock movements
- system prevents negative stock unless explicitly allowed by admin
- user can make stock adjustments with a reason
- system shows stock history for each product
- system supports multiple locations, such as:
  - UK store or warehouse
  - shipment batch
  - Ghana warehouse
  - Ghana shop or outlet

---

### 6.6 Shipment Tracking

#### User Story
As a user, I want to track shipments so I know where goods are and how long they take.

#### Acceptance Criteria
- user can create shipment records
- shipment record includes:
  - shipment ID
  - shipment reference or name
  - packed date
  - dispatch date
  - expected arrival date
  - actual arrival date
  - origin
  - destination
  - carrier
  - tracking number
  - status
  - notes
- user can add products and quantities to shipment
- system moves stock from available to allocated or in transit
- system calculates:
  - dispatch to arrival transit time
  - average transit time
  - delayed shipments
  - transit time trend over time

---

### 6.7 Shipping Cost Tracking

#### User Story
As a user, I want to track all logistics costs so I know true profitability.

#### Acceptance Criteria
- user can record shipping-related costs per shipment, including:
  - freight
  - customs
  - local transport
  - insurance
  - packaging
  - handling fees
  - other charges
- system calculates:
  - total shipping cost per shipment
  - shipping cost per item
  - shipping cost per unit
  - landed cost per unit
  - shipment profitability after logistics cost

---

### 6.8 Receiving Goods in Ghana

#### User Story
As a user, I want to confirm goods received in Ghana so inventory becomes accurate.

#### Acceptance Criteria
- user can mark shipment as arrived
- user can record actual arrival date
- user can record received quantities
- system compares shipped quantities vs received quantities
- user can record shortages, damage, or loss
- system transfers received stock into Ghana inventory
- system locks final transit time when goods are received

---

### 6.9 POS Sales

#### User Story
As a cashier, I want to scan products and complete sales quickly so that checkout is fast and accurate.

#### Acceptance Criteria
- barcode scan adds item to cart immediately
- user can search by name or SKU if barcode is unavailable
- user can update quantities
- user can apply discounts if permitted
- system supports payment methods:
  - cash
  - card
  - mobile money
  - bank transfer
  - split payment
- completing a sale automatically reduces stock
- receipt is generated immediately
- transactions can be voided or refunded with permission
- receipt can be reprinted or downloaded

---

### 6.10 FX Tracking

#### Objective
Track GBP versus Ghana cedi at 3 critical points in the product lifecycle.

#### FX Point 1: At Purchase
When goods are purchased:
- record GBP purchase cost
- record exchange rate at purchase
- calculate GHS equivalent

#### FX Point 2: At Sale
When goods are sold:
- record GHS sale value
- record exchange rate at time of sale
- calculate GBP equivalent

#### FX Point 3: At Conversion Back to GBP
When sale proceeds are converted back to GBP:
- record GHS amount converted
- record exchange rate used
- record GBP received

#### Acceptance Criteria
- system stores all 3 FX events separately
- system links FX records to purchases, sales, and conversions
- system calculates:
  - FX gain or loss per product
  - FX gain or loss per shipment
  - FX gain or loss per period
  - realised GBP revenue
  - expected vs realised margin

---

### 6.11 Invoices and Receipts

#### User Story
As a user, I want to generate invoices and receipts so I can document transactions professionally.

#### Acceptance Criteria
- system generates invoices with:
  - business details
  - customer details
  - invoice number
  - invoice date
  - due date
  - line items
  - quantity
  - unit price
  - discounts
  - shipping charges where relevant
  - subtotal
  - tax if applicable
  - total
  - payment instructions
- system generates POS receipts with:
  - receipt number
  - date and time
  - items purchased
  - amount paid
  - payment method
  - store details
- documents can be:
  - printed
  - downloaded as PDF
  - stored in history

---

### 6.12 Customer Management

#### User Story
As a user, I want to track customers so I can see buying history and manage invoices.

#### Acceptance Criteria
- system stores customer records with:
  - name
  - phone
  - email
  - address
  - customer type
  - notes
- system links customers to sales and invoices
- system shows customer transaction history
- system supports retail and wholesale customer types

---

### 6.13 Dashboard and Reporting

#### User Story
As a business owner, I want a dashboard so I can understand business performance quickly.

#### Acceptance Criteria
Dashboard must show:
- total sales
- total revenue
- estimated gross profit
- inventory value
- low stock items
- fast-moving products
- slow-moving products
- shipments in transit
- delayed shipments
- average transit time
- shipping costs over time
- best-selling products
- profit by product
- profit by shipment
- FX impact on profit

Reports required:
- inventory report
- stock movement report
- shipment performance report
- shipping cost report
- sales report
- profitability report
- supplier spend report
- FX gain and loss report
- invoice report
- risk and exception report

Export options:
- CSV
- Excel
- PDF

---

### 6.14 AI Assistant

#### User Story
As a user, I want to ask the system questions and get insights on my business and broader trends.

#### Acceptance Criteria
AI assistant must:
- answer questions using internal business data
- distinguish between:
  - facts from internal data
  - external trend information
  - recommendations or inference
- answer questions such as:
  - which products are selling fastest
  - which products are not moving
  - what was profit last month
  - which shipments took the longest
  - how much was spent on shipping
  - which products have the highest margin
  - what risks need attention
  - what opportunities are being missed
  - what market trends may affect the business
- not invent numbers
- explain uncertainty where data is incomplete

---

### 6.15 Risk Detection

#### User Story
As a user, I want risks highlighted so I can act early.

#### Acceptance Criteria
System flags:
- low stock on high-demand items
- overstock on slow-moving items
- delayed shipments
- unusually high shipping costs
- damaged or lost goods
- falling margins
- large FX losses
- heavy dependence on one supplier
- sales decline trends
- expiry risk where applicable

Outputs:
- dashboard risk panel
- alerts
- AI-generated risk summary
- suggested actions

---

### 6.16 Opportunity Detection

#### User Story
As a user, I want the system to highlight missed opportunities.

#### Acceptance Criteria
System identifies:
- high demand but low stock
- high margin products that should be prioritised
- supplier cost savings opportunities
- products with strong repeat sales
- shipment consolidation opportunities
- pricing optimisation opportunities
- cross-sell or bundle opportunities
- profitable seasonal patterns

Outputs:
- dashboard opportunity panel
- AI suggestions
- priority or score if implemented

---

### 6.17 Alerts and Notifications

#### Acceptance Criteria
System supports alerts for:
- low stock
- delayed shipment
- expected arrival reminder
- goods received discrepancy
- unusual shipping cost spike
- FX loss threshold
- overdue invoice if applicable
- high-risk operational issue

Delivery channels:
- in-app
- email
- optional browser notification

---

### 6.18 Audit Logs

#### Acceptance Criteria
System logs:
- product creation and edits
- stock adjustments
- shipment changes
- sales voids and refunds
- invoice changes
- user actions that affect money or stock

## 7. Non-Functional Requirements

### Performance
- barcode scans must feel near-instant
- POS checkout must be fast
- dashboard must remain responsive with growing data
- search must return results quickly

### Usability
- clean interface for non-technical users
- minimal clicks for common actions
- readable on mobile
- large tap targets on phone

### Reliability
- protect against duplicate products and duplicate barcodes
- prevent accidental stock corruption
- support backups and recovery

### Security
- secure authentication
- encrypted passwords
- HTTPS
- role-based access
- audit logs for sensitive actions

### Scalability
System should later support:
- multiple Ghana shops
- multiple warehouses
- more users
- more countries
- accounting integrations
- supplier purchase ordering
- deeper AI and forecasting features

## 8. Key Calculations

The system must accurately calculate:
- revenue
- cost of goods sold
- gross profit
- net profit after shipping
- landed cost
- margin percentage
- stock turnover
- transit time
- shipping cost per unit
- FX gain or loss
- realised GBP revenue
- profit per shipment
- stock ageing

## 9. Core Workflows

### Purchase to Inventory
1. user records purchase
2. system records supplier and GBP cost
3. system records FX at purchase
4. inventory increases in UK location

### Inventory to Shipment
1. user creates shipment
2. user allocates stock
3. stock moves to shipment or in-transit state
4. shipping costs are added

### Shipment to Ghana Inventory
1. user marks shipment arrived
2. user records actual arrival date
3. user confirms quantities received
4. inventory becomes available in Ghana

### POS Sale
1. cashier scans product
2. item enters cart
3. sale completes
4. system records sale in GHS
5. system records FX at sale
6. stock reduces
7. receipt generates

### Conversion Back to GBP
1. user logs conversion of GHS proceeds
2. system records FX at conversion
3. system records GBP received
4. system calculates realised FX impact

## 10. MVP Scope

Must include:
- authentication
- role permissions
- product management
- barcode support
- supplier tracking
- purchasing
- inventory tracking
- shipment tracking
- shipping cost tracking
- goods receiving workflow
- POS
- invoices and receipts
- dashboard
- FX tracking at all 3 points
- AI basic insights
- alerts
- audit logs

## 11. Phase 2

Possible later additions:
- demand forecasting
- automatic FX rate feeds
- WhatsApp alerts
- supplier scoring
- purchase orders
- accounting integrations
- pricing optimisation AI
- native mobile app
- offline POS mode

## 12. Success Criteria

The product is successful if:
- inventory is accurate end to end
- shipments are traceable
- transit times are measurable
- profit including shipping and FX is visible
- sourcing decisions improve using supplier data
- staff can use the system on phones
- AI insights are useful and actionable
