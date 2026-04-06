# Screen Map and User Flow Specification
## Inventory, POS, Export Logistics, FX Tracking, and AI Intelligence Platform

## 1. Purpose

This document defines the screen architecture and user flows for the system.

The design goal is operational speed on phone and clarity on desktop.

This is not just a list of pages. It is a practical screen map showing:
- what screens are needed
- what each screen must do
- how users move through the system
- what must be fastest on mobile

---

## 2. Design Principles

### 2.1 Mobile-first for operations
Operational tasks must be optimized for phone:
- barcode scanning
- stock updates
- shipment updates
- goods receiving
- POS checkout
- quick dashboard checks
- AI chat

### 2.2 Desktop-friendly for management
Management tasks can expand on larger screens:
- reporting
- supplier analysis
- FX analysis
- invoice management
- admin settings

### 2.3 Low-friction navigation
Core actions should always be reachable in one or two taps.

Recommended persistent navigation:
- Dashboard
- Products
- Inventory
- Shipments
- POS
- Invoices
- Reports
- AI Assistant
- More / Settings

---

## 3. Primary Navigation Structure

## 3.1 Top-level modules

1. Login
2. Dashboard
3. Products
4. Suppliers
5. Purchasing
6. Inventory
7. Shipments
8. Receiving
9. POS
10. Sales
11. Customers
12. Invoices
13. Receipts
14. Reports
15. Alerts and Risks
16. AI Assistant
17. Settings and Users

---

## 4. Screen Inventory

## 4.1 Authentication Screens

### Login Screen
Purpose:
- allow user login

Must include:
- email field
- password field
- forgot password
- sign in button

Mobile priority:
- large inputs
- fast load
- simple layout

### Forgot Password Screen
Purpose:
- reset user password

---

## 4.2 Dashboard Screens

### Main Dashboard
Purpose:
- give owner instant business overview

Must show:
- revenue today
- revenue this month
- gross profit estimate
- stock value
- low stock count
- delayed shipments count
- average transit time
- shipping costs this month
- FX impact summary
- best-selling products
- active alerts
- top risks
- top opportunities

Must support filters:
- date range
- location
- shipment
- product category

Mobile layout:
- KPI cards first
- short charts second
- risks and opportunities next
- quick actions at top

Desktop layout:
- larger charts
- side-by-side panels
- richer drilldowns

### Dashboard Detail Drilldowns
Examples:
- revenue trend view
- shipment trend view
- FX impact detail
- supplier spend summary
- product profitability detail

---

## 4.3 Product Screens

### Product List Screen
Purpose:
- browse and search products

Must support:
- search by barcode
- search by name
- search by SKU
- filters by category, status, stock state

Actions:
- add product
- edit product
- scan barcode
- open stock details

Mobile priority:
- barcode scan button floating or pinned
- fast search input

### Add Product Screen
Purpose:
- create new product

Fields:
- product name
- SKU
- barcode
- category
- brand
- description
- unit type
- default cost price
- default selling price
- minimum stock threshold
- expiry tracking on or off
- image upload
- status

### Product Detail Screen
Purpose:
- view one product deeply

Must show:
- barcode
- stock by location
- recent purchases
- recent shipments
- recent sales
- suppliers used
- margin summary
- risk flags
- reorder cues

### Edit Product Screen
Purpose:
- update product details

---

## 4.4 Supplier Screens

### Supplier List Screen
Purpose:
- view all suppliers or shops

Must support:
- search by name
- filter by country or active status
- add supplier

### Add Supplier Screen
Fields:
- name
- type
- contact name
- phone
- email
- address
- country
- notes

### Supplier Detail Screen
Must show:
- products sourced
- recent purchases
- total spend
- average product costs
- cost comparison opportunities
- supplier risk notes

### Edit Supplier Screen
Purpose:
- update supplier details

---

## 4.5 Purchasing Screens

### Purchase Order List Screen
Purpose:
- list recorded purchases

Filters:
- supplier
- date
- status
- product

Actions:
- create purchase
- open purchase detail

### Create Purchase Screen
Purpose:
- record stock purchase

Fields:
- supplier
- purchase date
- one or more line items
- product
- quantity
- unit cost GBP
- total cost GBP
- FX rate at purchase
- GHS equivalent
- expiry date if relevant
- notes

Behavior:
- saving completed purchase increases UK inventory

### Purchase Detail Screen
Must show:
- supplier
- date
- items bought
- GBP totals
- FX at purchase
- GHS equivalent
- linked inventory batches

---

## 4.6 Inventory Screens

### Inventory Overview Screen
Purpose:
- show current stock by product and location

Must support:
- search
- filters by location, category, stock status
- low stock highlight
- expired stock highlight

### Inventory Adjustment Screen
Purpose:
- allow controlled manual stock adjustment

Fields:
- product
- location
- adjustment type
- quantity
- reason
- notes

Rules:
- requires permission
- writes to audit log

### Inventory Movement History Screen
Purpose:
- show stock history

Must show:
- date
- product
- movement type
- quantity
- from location
- to location
- reference
- user

### Stock by Product Detail Screen
Purpose:
- drill into one product stock history

Must show:
- balances by location
- movement timeline
- related purchases
- related shipments
- related sales

---

## 4.7 Shipment Screens

### Shipment List Screen
Purpose:
- show all shipments

Must support:
- search by reference
- filter by status
- filter by carrier
- filter by date
- add shipment

### Create Shipment Screen
Purpose:
- build shipment

Fields:
- shipment reference
- shipment name
- origin
- destination
- carrier
- packed date
- dispatch date
- expected arrival date
- notes

Actions:
- add shipment items
- allocate inventory
- save draft
- dispatch shipment

### Shipment Detail Screen
Must show:
- shipment status
- item list
- quantities
- shipping costs
- dispatch date
- expected arrival
- actual arrival
- transit days
- status history
- discrepancy notes
- profitability summary if available

Quick actions:
- mark dispatched
- add costs
- mark arrived
- open receiving workflow

### Shipment Cost Entry Screen
Purpose:
- add logistics costs

Fields:
- cost type
- amount GBP
- date
- vendor
- description

### Shipment Status Update Screen
Purpose:
- quick mobile update of shipment stage

Must be extremely lightweight on phone.

---

## 4.8 Receiving Screens

### Receiving Queue Screen
Purpose:
- list shipments expected or arrived but not fully received

### Receive Shipment Screen
Purpose:
- confirm goods received in Ghana

Must show:
- shipment summary
- expected quantities
- per-line received quantities
- damaged quantities
- lost quantities
- notes

Actions:
- confirm receipt
- save partial
- submit receiving

Behavior:
- updates Ghana stock
- finalizes actual arrival date if entered
- records discrepancies

Mobile priority:
- large numeric inputs
- minimal clutter
- one product line per row/card

### Receiving History Screen
Purpose:
- view past receiving events

---

## 4.9 POS Screens

### POS Main Screen
Purpose:
- complete sales quickly

Core elements:
- barcode scan input
- search box
- product quick-add list
- cart panel
- quantity controls
- discount controls
- totals summary
- payment method selector
- complete sale button

Mobile behavior:
- scan and add must be near instant
- sticky cart total and checkout button
- large tap targets

### Payment Screen
Purpose:
- capture payment clearly

Fields:
- payment method
- amount paid
- split payment options
- reference for transfer or mobile money if needed

### Receipt Screen
Purpose:
- show completed sale and receipt

Actions:
- print
- download PDF
- re-send or re-open later

### Void / Refund Screen
Purpose:
- reverse or correct sales with permissions

Must log:
- user
- reason
- affected items
- inventory impact

---

## 4.10 Sales Screens

### Sales History Screen
Purpose:
- browse completed sales

Filters:
- date
- cashier
- product
- location
- customer
- payment method

### Sale Detail Screen
Must show:
- item lines
- totals
- payment breakdown
- receipt link
- FX at sale
- status
- refund history

---

## 4.11 FX Screens

### FX Overview Screen
Purpose:
- show exchange rate impact across the business

Must show:
- purchase FX summary
- sale FX summary
- conversion FX summary
- realised GBP outcome
- FX gain or loss trend

### FX Event Detail Screen
Purpose:
- inspect one FX event

Should show:
- event type
- source transaction
- currencies
- rate
- source amount
- target amount
- timestamp

### Cash Conversion Screen
Purpose:
- record conversion of GHS proceeds back to GBP

Fields:
- conversion date
- source amount GHS
- exchange rate
- GBP received
- fees
- notes

Optional:
- allocation to one or more sales or sales period

---

## 4.12 Customer Screens

### Customer List Screen
Purpose:
- browse customers

### Add Customer Screen
Fields:
- name
- phone
- email
- address
- customer type
- notes

### Customer Detail Screen
Must show:
- sales history
- invoices
- total spend
- frequency of purchase
- outstanding balance if used

---

## 4.13 Invoice and Receipt Screens

### Invoice List Screen
Purpose:
- manage invoices

Filters:
- status
- customer
- date
- overdue

### Create Invoice Screen
Purpose:
- generate invoice manually or from sale

Fields:
- customer
- date
- due date
- line items
- prices
- discount
- tax
- shipping
- notes

### Invoice Detail Screen
Must show:
- invoice summary
- line items
- total
- status
- PDF link
- payment or outstanding state

Actions:
- download PDF
- mark paid
- send

### Receipt Archive Screen
Purpose:
- access past receipts quickly

---

## 4.14 Report Screens

### Reports Home Screen
Purpose:
- entry point for all reporting

Reports:
- inventory report
- shipment report
- shipping cost report
- sales report
- profitability report
- supplier spend report
- FX report
- risk report

### Report Detail Screen
Purpose:
- show report results and filters

Must support:
- date range filters
- export to CSV
- export to Excel
- export to PDF

---

## 4.15 Alerts, Risks, and Opportunities Screens

### Alerts List Screen
Purpose:
- show active alerts

Must support:
- filter by severity
- filter by type
- acknowledge
- resolve

### Risk Detail Screen
Purpose:
- show one risk with reason and recommendation

### Opportunities Screen
Purpose:
- show business opportunities detected by rules or AI

Must show:
- type
- priority
- estimated benefit if known
- recommended action

---

## 4.16 AI Assistant Screens

### AI Chat Main Screen
Purpose:
- allow user to ask natural language questions about business

Must support example prompts such as:
- what are my top selling products this month
- which shipments took the longest
- what is hurting my margin
- are there any risks I should care about
- what opportunities am I missing
- which supplier is costing me the most
- what is my FX impact this quarter

UI needs:
- chat input
- chat history
- quick prompt suggestions
- answer cards or sections
- clear tags for:
  - internal data insight
  - external trend insight
  - recommendation
  - risk
  - opportunity

Mobile priority:
- lightweight
- readable responses
- easy follow-up questions

---

## 4.17 Settings and Admin Screens

### Settings Home
Sections:
- business profile
- logo and invoice branding
- currencies
- tax settings
- barcode settings
- notification settings
- AI settings
- user management

### User Management Screen
Purpose:
- create and manage users

### Role and Permission Screen
Purpose:
- define access controls

### Business Profile Screen
Fields:
- business name
- contact details
- address
- logo
- receipt footer
- invoice footer

---

## 5. Primary User Flows

## 5.1 Product Setup Flow
1. login
2. open Products
3. tap Add Product
4. enter product details
5. scan or enter barcode
6. save product
7. optionally assign supplier link

Outcome:
- product becomes available for purchasing and stock workflows

---

## 5.2 Supplier Setup Flow
1. open Suppliers
2. tap Add Supplier
3. enter shop or supplier details
4. save

Outcome:
- supplier available for purchase records

---

## 5.3 Purchase to Inventory Flow
1. open Purchasing
2. create purchase
3. select supplier
4. add products and quantities
5. enter GBP costs
6. enter FX rate at purchase
7. save purchase

Outcome:
- UK inventory increases
- purchase history is stored
- purchase FX event is stored

---

## 5.4 Shipment Creation Flow
1. open Shipments
2. tap Create Shipment
3. enter shipment header details
4. allocate inventory items
5. add shipping details
6. save as draft or dispatch

Outcome:
- stock moves to allocated or in-transit state
- shipment record exists

---

## 5.5 Shipment Receiving Flow
1. open Receiving
2. choose shipment
3. verify expected quantities
4. enter received, damaged, and lost quantities
5. confirm receipt

Outcome:
- Ghana inventory updates
- discrepancy records created
- transit time becomes reportable

---

## 5.6 POS Sale Flow
1. open POS
2. scan or search product
3. add to cart
4. choose payment method
5. complete sale

Outcome:
- Ghana stock decreases
- sale record created
- receipt created
- FX at sale recorded if prompted or automated

---

## 5.7 Cash Conversion Flow
1. open FX
2. choose Cash Conversion
3. enter GHS amount converted
4. enter exchange rate
5. enter GBP received
6. save

Outcome:
- conversion FX event created
- realised GBP amount recorded
- FX gain or loss reporting updated

---

## 5.8 Invoice Flow
1. open Invoices
2. create invoice or generate from sale
3. review line items
4. save
5. download or send

Outcome:
- invoice stored and printable

---

## 5.9 Dashboard Review Flow
1. open Dashboard
2. view KPIs
3. tap risk or opportunity cards
4. drill into detail

Outcome:
- owner gets fast understanding and can act

---

## 5.10 AI Insight Flow
1. open AI Assistant
2. ask question
3. view answer
4. open linked detail screens if supported

Outcome:
- user gets decision support grounded in business data

---

## 6. Fastest Mobile Actions

These actions must be reachable within 1 to 2 taps after login:

- start barcode scan
- create purchase
- create shipment
- receive shipment
- start POS sale
- view low stock
- view active alerts
- open AI assistant

Recommended mobile home shortcuts:
- Scan Product
- New Purchase
- New Shipment
- Receive Goods
- Start Sale
- Ask AI

---

## 7. MVP Screen Set

Must-have screens for MVP:

- Login
- Dashboard
- Product List
- Add/Edit Product
- Supplier List
- Add/Edit Supplier
- Purchase List
- Create Purchase
- Inventory Overview
- Inventory Movement History
- Shipment List
- Create Shipment
- Shipment Detail
- Shipment Cost Entry
- Receiving Queue
- Receive Shipment
- POS Main
- Payment
- Receipt
- Sales History
- Sale Detail
- FX Overview
- Cash Conversion
- Customer List
- Invoice List
- Create Invoice
- Invoice Detail
- Reports Home
- Alerts List
- Opportunities Screen
- AI Chat
- Settings
- User Management

---

## 8. UI Notes for AI Builder

The AI system designing the UI should prioritize:

- one-handed mobile usage for key workflows
- very large, obvious scan and checkout actions
- minimal typing where barcode or quick-select can replace it
- summary-first dashboards
- clear financial numbers
- visible stock state transitions
- simple forms with progressive disclosure
- no clutter on phone

The interface should feel operationally fast, not corporate and heavy.
