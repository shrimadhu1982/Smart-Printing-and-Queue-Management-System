# Database Relationships

The Node API uses the existing MySQL database `smart_printing_db`. Its live table definitions were inspected before implementation; no schema migration is required. Do not execute `database/schema.sql` on an existing database: it is a bootstrap script containing destructive table drops.

## Entity relationships

```text
students 1 ─── * documents
students 1 ─── * print_orders
documents 1 ─── * print_orders
print_settings 1 ─── * print_orders
staff 1 ─── * print_orders (processed_by_staff_id, nullable)
print_orders 1 ─── 0..1 queue
print_orders 1 ─── * notifications (notification order_id is nullable)
```

`admins` owns system administration access. `printing_prices` holds independently administered price categories and is read when a quote/order is calculated.

## Table purpose

| Table | Key data |
|---|---|
| `admins` | Administrator identity, email, password hash, role. |
| `staff` | Operator identity, counter, active state, password hash. |
| `students` | Roll number, profile, active state, password hash. |
| `documents` | Student-owned PDF metadata, stored filename/path, page count. |
| `print_settings` | Color, sides, copies, paper, orientation, page range, binding. |
| `print_orders` | Order ownership, calculated price breakdown, status, staff processor. |
| `queue` | Unique order entry, current position, estimated wait. |
| `printing_prices` | Unique price category, display information, unit price. |
| `notifications` | Recipient role/id, optional order, message, read state. |

The notification recipient uses a role plus numeric ID rather than a foreign key because it can refer to a student, staff member, or admin. Consequently, notification queries always filter by both `recipient_role` and `recipient_id`.

## Pricing and queue calculations

Prices are taken from `printing_prices` at order submission. The total is the selected per-page rate (including the A3 multiplier) times pages and copies, plus the selected paper surcharge per physical sheet, plus the binding fee per copy. Duplex physical sheets are rounded up per copy. The order stores the price components used at creation time.

Queue membership is retained for `Pending`, `Accepted`, and `Printing` orders. Cancelled, rejected, and completed orders have no active queue entry. Wait estimates are cumulative: each job contributes `ceil(2 + 0.15 × billed_pages)` minutes.
