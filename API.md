# API Reference

All routes are prefixed with `/api`. Private endpoints require `Authorization: Bearer <JWT>`. Login responses return a one-day token. Roles are `student`, `staff`, and `admin`; requests that do not match a route's role receive `403`.

## Authentication and student

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/students/register` | Public | Create a student. Body: `roll_number`, `full_name`, `email`, `department`, `password`; optional `phone`, `semester`. Password minimum: 8 characters. |
| POST | `/students/login` | Public | Student login. Body: `email`, `password`. |
| GET | `/students/profile` | Student | Current student profile. |
| PUT | `/students/profile` | Student | Update `phone`, `department`, and `semester`. |
| GET | `/students/dashboard` | Student | Student metrics, recent orders, and active order. |

## Documents and student orders

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/documents/upload` | Student | Upload a PDF as multipart field `document` (10 MB maximum). |
| GET | `/documents` | Student | List the current student's documents. |
| GET | `/documents/:id/download` | Student owner, staff, admin | Open/download the PDF. Students cannot access another student's file. |
| POST | `/orders/calculate-cost` | Student | Calculate a quote. Body accepts `document_id` and print options directly or in a `settings` object. |
| POST | `/orders` | Student | Create an order. Body: `document_id`, print settings, optional `special_instructions`. |
| GET | `/orders` | Student | Own order history; optional `?status=Pending` etc. |
| GET | `/orders/:id` | Student owner | Read own order and settings. |
| PATCH | `/orders/:id/cancel` | Student owner | Cancel an order while it is `Pending`. |

Print-setting values: `color_mode` (`bw`, `color`), `sides` (`single`, `double`), `copies` (1–100), `paper_size` (`A4`, `A3`), `paper_type` (`standard`, `premium`, `glossy`), `orientation` (`portrait`, `landscape`), `page_range` (`all` or comma-separated page/range values), and `binding_type` (`none`, `staple`, `spiral`, `hardbound`).

## Queue and notifications

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/queue` | Student, staff, admin | Active campus queue, order details, positions, and wait estimates. |
| GET | `/queue/mine` | Student | Current student's active queue orders. |
| GET | `/notifications` | Authenticated role | Notifications addressed to the signed-in account. |
| PATCH | `/notifications/:id/read` | Notification owner | Mark a notification read. |

Queue entries are active while an order is `Pending`, `Accepted`, or `Printing`. Estimates use a 2-minute handling buffer plus 0.15 minutes per billed page for each active order up to the requested position. Positions and estimates are recomputed after order creation, cancellation, rejection, or completion.

## Staff

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/staff/login` | Public | Staff login. |
| GET | `/staff/profile` | Staff | Current staff profile. |
| GET | `/staff/dashboard` | Staff | Order counts and queue workload. |
| GET | `/staff/orders` | Staff | Orders and print settings; optional `?status=Pending`. |
| PATCH | `/staff/orders/:id/status` | Staff | Update status; body includes `status`, and requires `rejection_reason` for rejection. |

Allowed transitions: `Pending → Accepted` or `Rejected`; `Accepted → Printing` or `Rejected`; `Printing → Completed`. Terminal orders are removed from the queue. Each transition creates a student notification.

## Admin

| Method | Route | Purpose |
|---|---|---|
| POST | `/admin/login` | Admin login (public). |
| POST | `/admin/register-initial` | Create the first admin using `full_name`, `email`, `admin_access_id`, and `password`. Requires the backend-only access ID and is disabled once an admin exists. |
| GET | `/admin/profile` | Current admin profile. |
| GET | `/admin/dashboard` | User/order/revenue metrics, status breakdown, recent orders. |
| GET | `/admin/students` | Student directory and activity. |
| PATCH | `/admin/students/:id/toggle` | Activate/deactivate a student. |
| GET / POST | `/admin/staff` | List staff / create a staff account (password minimum 8). |
| PATCH | `/admin/staff/:id/activate` | Reactivate a deactivated staff account. |
| DELETE | `/admin/staff/:id` | Deactivate staff without deleting their history. |
| GET / PUT | `/admin/pricing` | List prices / update `{ "prices": [{ "category": "...", "unit_price": 1.25 }] }`. |
| GET | `/admin/orders` | All orders and print settings. |
| GET | `/admin/documents` | Campus document metadata and owners. |
| GET | `/admin/reports` | Department, color-mode, and paper-size reports. |

All admin routes other than `/admin/login` and the one-time `/admin/register-initial` endpoint require an admin token.

## Common errors

Responses have `{ "success": false, "message": "..." }`. Invalid values return `400`; invalid/expired tokens return `401`; role or ownership violations return `403` or a non-disclosing `404`; conflicting order transitions return `409`; oversized PDF uploads return `413`.
