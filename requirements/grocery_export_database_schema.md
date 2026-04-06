# Database Schema Specification
## Inventory, POS, Export Logistics, FX Tracking, and AI Intelligence Platform

## 1. Purpose

This document defines the proposed database schema for the grocery export business system. It is intended for an AI system, developer, or architect to use as the foundation for application design.

The schema is designed around five principles:

- stock traceability
- financial traceability
- shipment traceability
- FX event traceability
- mobile-friendly operational simplicity on top of rigorous backend data

---

## 2. Design Principles

### 2.1 Use a relational database
Recommended default: PostgreSQL.

Reason:
- strong transactional support
- suitable for inventory and finance records
- supports structured reporting well
- works well with web apps and analytics

### 2.2 Use transaction-based stock tracking
Do not rely only on a single quantity field on products.

Use:
- inventory movements
- inventory balances by location
- shipment allocations
- receiving records
- sales deductions

### 2.3 Keep financial events separate but linked
Purchase, shipping cost, sale, and FX conversion should be stored as separate but connected records.

### 2.4 Use immutable or append-friendly financial history
Avoid destructive edits on cost, stock, and money records. Prefer status changes, adjustments, and audit logs.

---

## 3. Entity Relationship Summary

Core domains:

- users and permissions
- products and suppliers
- purchases
- inventory
- shipments
- receiving
- sales and POS
- invoices and receipts
- FX tracking
- alerts and insights
- audit logging

High-level relationships:

- a supplier has many purchases
- a product can be sourced from many suppliers through purchases
- a purchase creates inventory
- inventory can be allocated to shipments
- a shipment contains many products
- a shipment has many shipment cost records
- a shipment is received into Ghana inventory
- sales reduce Ghana inventory
- sales can create receipts and optionally invoices
- FX records are linked to purchase, sale, or conversion events
- conversions link Ghana cash proceeds back to GBP realisation

---

## 4. Tables

## 4.1 users
Stores system users.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | Primary key |
| full_name | VARCHAR | |
| email | VARCHAR UNIQUE | login identifier |
| password_hash | VARCHAR | |
| phone | VARCHAR | optional |
| is_active | BOOLEAN | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

## 4.2 roles
Stores role definitions.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| name | VARCHAR UNIQUE | admin, warehouse, POS, finance, viewer |
| description | TEXT | |

## 4.3 user_roles
Maps users to roles.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| user_id | FK users.id | |
| role_id | FK roles.id | |

## 4.4 permissions
Optional if fine-grained permission system is needed.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| code | VARCHAR UNIQUE | e.g. inventory.adjust |
| description | TEXT | |

## 4.5 role_permissions
Maps roles to permissions.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| role_id | FK roles.id | |
| permission_id | FK permissions.id | |

---

## 4.6 suppliers
Stores supplier or shop details.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| name | VARCHAR | |
| supplier_type | VARCHAR | shop, wholesaler, importer, other |
| contact_name | VARCHAR | optional |
| phone | VARCHAR | optional |
| email | VARCHAR | optional |
| address_line_1 | VARCHAR | optional |
| address_line_2 | VARCHAR | optional |
| city | VARCHAR | optional |
| country | VARCHAR | |
| currency_code | VARCHAR(3) | default GBP if UK supplier |
| notes | TEXT | |
| is_active | BOOLEAN | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

## 4.7 product_categories
Stores product categories.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| name | VARCHAR UNIQUE | |
| description | TEXT | |

## 4.8 products
Stores master product records.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| name | VARCHAR | |
| sku | VARCHAR UNIQUE | |
| barcode | VARCHAR UNIQUE | primary barcode |
| category_id | FK product_categories.id | |
| brand | VARCHAR | optional |
| description | TEXT | |
| unit_type | VARCHAR | unit, pack, box, bottle, kg |
| base_currency | VARCHAR(3) | default GBP |
| default_cost_price_gbp | NUMERIC(12,2) | optional |
| default_selling_price_ghs | NUMERIC(12,2) | optional |
| minimum_stock_threshold | NUMERIC(12,2) | |
| expiry_tracking_enabled | BOOLEAN | |
| image_url | TEXT | optional |
| is_active | BOOLEAN | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

## 4.9 product_barcodes
Supports multiple barcodes per product if needed.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| product_id | FK products.id | |
| barcode | VARCHAR UNIQUE | |
| barcode_type | VARCHAR | EAN, UPC, internal |
| is_primary | BOOLEAN | |

## 4.10 product_supplier_map
Optional convenience table showing common supplier-product relationships.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| product_id | FK products.id | |
| supplier_id | FK suppliers.id | |
| supplier_product_name | VARCHAR | optional |
| preferred_flag | BOOLEAN | |
| notes | TEXT | |

---

## 4.11 purchase_orders
Recommended even in light form for grouping purchases.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| reference_no | VARCHAR UNIQUE | |
| supplier_id | FK suppliers.id | |
| purchase_date | DATE | |
| status | VARCHAR | draft, confirmed, received, cancelled |
| notes | TEXT | |
| created_by | FK users.id | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

## 4.12 purchase_order_items
Purchase line items.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| purchase_order_id | FK purchase_orders.id | |
| product_id | FK products.id | |
| quantity | NUMERIC(12,2) | |
| unit_cost_gbp | NUMERIC(12,4) | |
| total_cost_gbp | NUMERIC(12,2) | |
| fx_rate_purchase | NUMERIC(18,6) | GBP/GHS reference chosen by system |
| total_cost_ghs_equivalent | NUMERIC(12,2) | |
| expiry_date | DATE | optional |
| batch_reference | VARCHAR | optional |
| notes | TEXT | |

---

## 4.13 locations
Inventory and operating locations.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| name | VARCHAR | |
| location_type | VARCHAR | UK warehouse, shipment, Ghana warehouse, Ghana shop |
| country | VARCHAR | |
| city | VARCHAR | optional |
| address | TEXT | optional |
| is_active | BOOLEAN | |

## 4.14 inventory_batches
Optional but strongly recommended for traceability.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| product_id | FK products.id | |
| source_purchase_item_id | FK purchase_order_items.id | |
| batch_reference | VARCHAR | |
| expiry_date | DATE | optional |
| initial_quantity | NUMERIC(12,2) | |
| remaining_quantity | NUMERIC(12,2) | maintained or derived |
| current_location_id | FK locations.id | |
| status | VARCHAR | active, allocated, transit, sold_out, expired, damaged |
| created_at | TIMESTAMP | |

## 4.15 inventory_movements
Single source of truth for stock movement.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| product_id | FK products.id | |
| batch_id | FK inventory_batches.id | nullable if batch not used |
| movement_type | VARCHAR | purchase_in, adjust_in, adjust_out, allocate_shipment, dispatch, receive, sale_out, damage_out, loss_out, return_in |
| quantity | NUMERIC(12,2) | positive quantity with meaning given by movement_type |
| from_location_id | FK locations.id | nullable |
| to_location_id | FK locations.id | nullable |
| reference_type | VARCHAR | purchase_item, shipment_item, receiving_item, sale_item, adjustment |
| reference_id | UUID / BIGINT | polymorphic foreign key pattern |
| movement_date | TIMESTAMP | |
| notes | TEXT | |
| created_by | FK users.id | |

## 4.16 inventory_balances
Fast-read snapshot table for current stock.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| product_id | FK products.id | |
| location_id | FK locations.id | |
| quantity_on_hand | NUMERIC(12,2) | |
| quantity_allocated | NUMERIC(12,2) | |
| quantity_available | NUMERIC(12,2) | |
| updated_at | TIMESTAMP | |

---

## 4.17 shipments
Shipment master records.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| shipment_reference | VARCHAR UNIQUE | |
| shipment_name | VARCHAR | optional |
| origin_location_id | FK locations.id | |
| destination_location_id | FK locations.id | |
| carrier_name | VARCHAR | |
| tracking_number | VARCHAR | optional |
| packed_date | DATE | optional |
| dispatch_date | DATE | |
| expected_arrival_date | DATE | |
| actual_arrival_date | DATE | nullable until arrival |
| status | VARCHAR | draft, packed, dispatched, in_transit, delayed, arrived, received, closed, cancelled |
| notes | TEXT | |
| created_by | FK users.id | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

## 4.18 shipment_items
Products included in shipment.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| shipment_id | FK shipments.id | |
| product_id | FK products.id | |
| batch_id | FK inventory_batches.id | nullable but recommended |
| quantity | NUMERIC(12,2) | |
| source_purchase_item_id | FK purchase_order_items.id | optional |
| allocated_cost_gbp | NUMERIC(12,2) | optional rollup |
| allocated_shipping_cost_gbp | NUMERIC(12,2) | optional rollup |
| notes | TEXT | |

## 4.19 shipment_status_history
Audit trail for shipment lifecycle.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| shipment_id | FK shipments.id | |
| status | VARCHAR | |
| status_timestamp | TIMESTAMP | |
| notes | TEXT | |
| updated_by | FK users.id | |

## 4.20 shipment_costs
Granular shipment cost entries.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| shipment_id | FK shipments.id | |
| cost_type | VARCHAR | freight, customs, transport, insurance, packaging, handling, other |
| amount_gbp | NUMERIC(12,2) | |
| description | TEXT | optional |
| vendor_name | VARCHAR | optional |
| cost_date | DATE | |
| created_by | FK users.id | |

---

## 4.21 receiving_records
Receiving event header.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| shipment_id | FK shipments.id | |
| received_location_id | FK locations.id | |
| received_date | DATE | |
| notes | TEXT | |
| received_by | FK users.id | |
| created_at | TIMESTAMP | |

## 4.22 receiving_items
Line-by-line receiving detail.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| receiving_record_id | FK receiving_records.id | |
| shipment_item_id | FK shipment_items.id | |
| product_id | FK products.id | |
| expected_quantity | NUMERIC(12,2) | |
| received_quantity | NUMERIC(12,2) | |
| damaged_quantity | NUMERIC(12,2) | |
| lost_quantity | NUMERIC(12,2) | |
| notes | TEXT | |

---

## 4.23 customers
Customer records.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| customer_type | VARCHAR | retail, wholesale |
| full_name | VARCHAR | |
| phone | VARCHAR | optional |
| email | VARCHAR | optional |
| address | TEXT | optional |
| notes | TEXT | |
| is_active | BOOLEAN | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

## 4.24 sales
POS or order transaction header.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| sale_reference | VARCHAR UNIQUE | |
| sale_datetime | TIMESTAMP | |
| location_id | FK locations.id | Ghana shop |
| customer_id | FK customers.id | nullable for walk-in |
| sold_by | FK users.id | |
| currency_code | VARCHAR(3) | usually GHS |
| subtotal_ghs | NUMERIC(12,2) | |
| discount_total_ghs | NUMERIC(12,2) | |
| tax_total_ghs | NUMERIC(12,2) | |
| total_ghs | NUMERIC(12,2) | |
| notes | TEXT | |
| status | VARCHAR | completed, voided, refunded, partial_refund |
| created_at | TIMESTAMP | |

## 4.25 sale_items
Sale line items.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| sale_id | FK sales.id | |
| product_id | FK products.id | |
| batch_id | FK inventory_batches.id | nullable if not batch-managed at checkout |
| quantity | NUMERIC(12,2) | |
| unit_price_ghs | NUMERIC(12,2) | |
| discount_amount_ghs | NUMERIC(12,2) | |
| line_total_ghs | NUMERIC(12,2) | |
| estimated_cost_gbp | NUMERIC(12,2) | optional stored snapshot |
| estimated_landed_cost_gbp | NUMERIC(12,2) | optional stored snapshot |

## 4.26 sale_payments
Payment split support.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| sale_id | FK sales.id | |
| payment_method | VARCHAR | cash, card, mobile_money, transfer, split |
| amount_ghs | NUMERIC(12,2) | |
| payment_reference | VARCHAR | optional |
| paid_at | TIMESTAMP | |

---

## 4.27 invoices
Invoice records.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| invoice_number | VARCHAR UNIQUE | |
| customer_id | FK customers.id | |
| sale_id | FK sales.id | nullable for non-POS invoice |
| invoice_date | DATE | |
| due_date | DATE | |
| currency_code | VARCHAR(3) | GHS or GBP depending workflow |
| subtotal | NUMERIC(12,2) | |
| discount_total | NUMERIC(12,2) | |
| tax_total | NUMERIC(12,2) | |
| shipping_total | NUMERIC(12,2) | |
| total | NUMERIC(12,2) | |
| status | VARCHAR | draft, sent, paid, overdue, cancelled |
| pdf_url | TEXT | optional |
| notes | TEXT | |
| created_by | FK users.id | |
| created_at | TIMESTAMP | |

## 4.28 invoice_items
Invoice line items.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| invoice_id | FK invoices.id | |
| product_id | FK products.id | nullable for service line |
| description | TEXT | |
| quantity | NUMERIC(12,2) | |
| unit_price | NUMERIC(12,2) | |
| discount_amount | NUMERIC(12,2) | |
| line_total | NUMERIC(12,2) | |

## 4.29 receipts
Receipt records.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| receipt_number | VARCHAR UNIQUE | |
| sale_id | FK sales.id | |
| receipt_datetime | TIMESTAMP | |
| total_ghs | NUMERIC(12,2) | |
| pdf_url | TEXT | optional |
| created_by | FK users.id | |

---

## 4.30 fx_records
Tracks exchange rate events at 3 points.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| event_type | VARCHAR | purchase, sale, conversion |
| reference_type | VARCHAR | purchase_item, sale, cash_conversion |
| reference_id | UUID / BIGINT | polymorphic link |
| from_currency | VARCHAR(3) | |
| to_currency | VARCHAR(3) | |
| exchange_rate | NUMERIC(18,6) | define direction clearly |
| source_amount | NUMERIC(12,2) | |
| target_amount | NUMERIC(12,2) | |
| event_datetime | TIMESTAMP | |
| notes | TEXT | |

## 4.31 cash_conversions
Tracks conversion of Ghana sale proceeds back to GBP.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| conversion_reference | VARCHAR UNIQUE | |
| conversion_date | DATE | |
| source_currency | VARCHAR(3) | GHS |
| source_amount | NUMERIC(12,2) | |
| destination_currency | VARCHAR(3) | GBP |
| destination_amount | NUMERIC(12,2) | |
| exchange_rate | NUMERIC(18,6) | |
| fees_gbp | NUMERIC(12,2) | optional |
| notes | TEXT | |
| created_by | FK users.id | |
| created_at | TIMESTAMP | |

## 4.32 cash_conversion_sale_links
Optional mapping from a conversion event back to one or more sales or cash pools.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| cash_conversion_id | FK cash_conversions.id | |
| sale_id | FK sales.id | nullable if linked to a sales period pool instead |
| amount_ghs_allocated | NUMERIC(12,2) | |

---

## 4.33 alerts
System generated or manual alerts.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| alert_type | VARCHAR | low_stock, delay, fx_loss, cost_spike, expiry_risk |
| severity | VARCHAR | low, medium, high, critical |
| title | VARCHAR | |
| message | TEXT | |
| related_entity_type | VARCHAR | product, shipment, supplier, sale |
| related_entity_id | UUID / BIGINT | |
| status | VARCHAR | open, acknowledged, resolved, dismissed |
| created_at | TIMESTAMP | |
| acknowledged_by | FK users.id | nullable |
| acknowledged_at | TIMESTAMP | nullable |

## 4.34 risk_records
Structured risk objects for dashboard and AI.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| risk_type | VARCHAR | stockout, shipment_delay, margin_drop, supplier_concentration, fx_loss |
| related_entity_type | VARCHAR | |
| related_entity_id | UUID / BIGINT | |
| score | NUMERIC(5,2) | optional |
| summary | TEXT | |
| recommendation | TEXT | |
| detected_at | TIMESTAMP | |
| status | VARCHAR | open, monitoring, closed |

## 4.35 opportunity_records
Structured opportunity objects.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| opportunity_type | VARCHAR | repricing, restock, consolidate_shipment, supplier_switch |
| related_entity_type | VARCHAR | |
| related_entity_id | UUID / BIGINT | |
| score | NUMERIC(5,2) | optional |
| summary | TEXT | |
| recommendation | TEXT | |
| detected_at | TIMESTAMP | |
| status | VARCHAR | open, acted_on, dismissed |

## 4.36 ai_insight_logs
Stores AI responses or generated insights for history.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| user_id | FK users.id | |
| prompt_text | TEXT | |
| response_text | TEXT | |
| insight_type | VARCHAR | internal, external, risk, opportunity |
| created_at | TIMESTAMP | |

## 4.37 audit_logs
System audit trail.

| Field | Type | Notes |
|---|---|---|
| id | UUID / BIGINT PK | |
| user_id | FK users.id | |
| action_type | VARCHAR | create, update, delete, void, refund, adjust |
| entity_type | VARCHAR | |
| entity_id | UUID / BIGINT | |
| before_json | JSONB | optional |
| after_json | JSONB | optional |
| action_timestamp | TIMESTAMP | |
| notes | TEXT | |

---

## 5. Key Indexes

Recommended indexes:

- products.sku
- products.barcode
- product_barcodes.barcode
- suppliers.name
- purchase_orders.reference_no
- inventory_movements.product_id, movement_date
- inventory_balances.product_id, location_id
- shipments.shipment_reference
- shipments.status
- shipment_status_history.shipment_id, status_timestamp
- sales.sale_reference
- sales.sale_datetime
- sale_items.product_id
- invoices.invoice_number
- receipts.receipt_number
- fx_records.reference_type, reference_id
- cash_conversions.conversion_reference
- alerts.status, severity
- risk_records.status
- opportunity_records.status

---

## 6. Important Derived Views or Materialized Views

Recommended reporting views:

### 6.1 vw_product_stock_summary
Shows current stock by product and location.

### 6.2 vw_shipment_transit_summary
Shows dispatch date, arrival date, transit days, expected vs actual.

### 6.3 vw_supplier_spend_summary
Shows spend by supplier over time.

### 6.4 vw_product_profitability
Shows revenue, cost, landed cost, margin, units sold.

### 6.5 vw_fx_impact_summary
Shows purchase FX, sale FX, conversion FX, realised FX variance.

### 6.6 vw_risk_dashboard
Combines active risks and alerts.

---

## 7. Data Integrity Rules

The system should enforce these rules:

- barcode must be unique
- SKU must be unique
- shipment cannot be marked received before dispatch
- actual arrival date cannot be before dispatch date
- inventory cannot go negative unless override permission exists
- sale cannot complete if insufficient Ghana stock exists
- receiving quantities cannot exceed shipped quantities unless explicit override exists
- FX records must define rate direction consistently
- each cash conversion must store both source and destination amounts
- voided sales must not count as revenue
- refunded items must restore or separately adjust inventory depending return workflow

---

## 8. Notes for AI Builder

The builder may decide:
- whether to use UUIDs or integer IDs
- whether to model polymorphic reference_type/reference_id directly or split into explicit link tables
- whether to keep inventory batch tracking mandatory or optional in MVP
- whether to use materialized views for heavy dashboards
- whether to denormalize some summary values for performance

But the builder must preserve:
- traceable stock history
- traceable FX history
- traceable supplier sourcing
- traceable landed cost logic
