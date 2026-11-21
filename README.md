# Smart Printing and Queue Management

A campus printing application with a React/Vite frontend, Node.js/Express API, and MySQL database. The legacy Flask backend under `backend/` is retained as a backup and is not used by the current frontend.

## Requirements

- Node.js 18 or later
- MySQL with the existing `smart_printing_db` database
- The existing nine-table schema (see [DATABASE.md](./DATABASE.md))

## Setup on Windows

1. Do not run `database/schema.sql` against a database containing data. It contains `DROP TABLE` statements and is only an original bootstrap reference.
2. Copy the configuration template and set the local MySQL values:

   ```powershell
   if (-not (Test-Path node-backend\.env)) { Copy-Item .env.example node-backend\.env }
   ```

   Set `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_PASSWORD` for your MySQL installation. Replace `JWT_SECRET` with a random value of at least 32 characters and set `ADMIN_INITIAL_SETUP_SECRET` to a separate, long random value. Keep `.env` private; never add either secret to frontend configuration.
3. Start the API:

   ```powershell
   Set-Location node-backend
   npm install
   npm run dev
   ```

   The API listens on `http://localhost:5000` by default. `GET /api/health` checks the database connection.
4. In a separate terminal, start the frontend:

   ```powershell
   Set-Location frontend
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. Vite proxies `/api` requests to the Node API on port 5000. For a different API origin, define `VITE_API_URL` when building the frontend; never put database credentials or `JWT_SECRET` in a `VITE_` variable.

The first administrator can register at `/admin/register` with the backend-only Admin Access ID. This endpoint is disabled as soon as an admin exists; existing admin accounts and passwords are not changed. New student registration and administrator-created staff accounts use bcrypt. The API also recognizes Werkzeug-Scrypt-formatted hashes, so existing Flask-generated accounts do not require a schema or data migration.

## User workflows

- Students register or sign in, upload PDFs up to 10 MB, choose print settings, get a database-priced quote, submit/cancel pending orders, see queue estimates, review documents/history, and read notifications.
- Staff sign in, review pending work, accept/reject with a reason, start printing, complete orders, and access PDFs.
- Administrators sign in, view dashboard/reporting, manage student and staff account access, inspect orders/documents, and update printing prices.

## API and database documentation

- [API.md](./API.md) documents routes, payloads, access roles, and status transitions.
- [DATABASE.md](./DATABASE.md) documents the existing tables and relationships.

## Verification

From `node-backend`, syntax-check the backend files with `node --check` and run the frontend production build with `npm run build` from `frontend`. API checks require the configured MySQL database and valid account credentials. Do not use the destructive bootstrap SQL for testing.

For a demonstration, start both servers and show:

1. Student registration/login, document upload and settings/quote.
2. Order creation, queue position/wait estimate, and cancellation.
3. Staff login and the Accepted → Printing → Completed flow (also demonstrate rejection with a reason).
4. Student notification updates and order history.
5. Admin metrics, student/staff management, orders/documents, and changing a printing price.

Use temporary test accounts/documents when demonstrating, and remove only the test records you create.
