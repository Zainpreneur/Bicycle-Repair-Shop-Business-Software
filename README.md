# Spoke & Wrench — Bicycle & Repair Shop Business App

A full-stack business management app for a bicycle sales & repair shop: customers and
their bikes, repair work orders, a parts/inventory catalog, a services price list,
invoicing, and appointment scheduling — all behind a login-protected dashboard.

## Stack

- **Server:** Node.js, Express, TypeScript, SQLite (via `better-sqlite3`), JWT auth
- **Client:** React, TypeScript, Vite, React Router, Tailwind CSS
- **Data:** a single SQLite file on disk — no external database server needed

## Features

- 🔐 Login-protected staff dashboard (JWT-based auth)
- 📊 Dashboard: active repairs, monthly revenue, unpaid invoices, low-stock alerts, upcoming appointments
- 👤 Customers: contact info, notes, and every bike they own
- 🚲 Bikes: linked to a customer, with brand/model/type/serial number
- 🛠️ Repair orders: intake → diagnosing → in progress → awaiting parts → completed → picked up,
  with a line-item list of services performed and parts used
- 📦 Inventory: parts stock with cost/price/reorder level; using a part on a repair order
  automatically decrements stock (and blocks the line item if there isn't enough on hand)
- 🧾 Service catalog: standard labor items with price and estimated time
- 💵 Invoices: generate an invoice directly from a repair order's line items, with tax,
  then mark it paid/unpaid/void
- 📅 Appointments: schedule drop-offs or consultations and track their status

## Project layout

```
server/   Express + TypeScript API, SQLite database, JWT auth
client/   React + TypeScript + Vite single-page app
```

## Getting started

Requires Node.js 18+.

```bash
# 1. Install dependencies for both workspaces
npm install

# 2. Configure the server
cp server/.env.example server/.env
# (defaults work out of the box for local development)

# 3. Configure the client
cp client/.env.example client/.env

# 4. Seed the database with sample data (optional but recommended)
npm run seed

# 5. Run both apps in separate terminals
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173
```

Open http://localhost:5173 and sign in with the seeded admin account:

- **Username:** `admin`
- **Password:** `admin123`

(Change this password from the shop after your first login, or set `ADMIN_USERNAME` /
`ADMIN_PASSWORD` in `server/.env` before the database is first created.)

The SQLite file is created at `server/data/shop.db` on first run. Delete it (and the
`.db-wal`/`.db-shm` files next to it) to start over from a clean database — the app will
recreate the schema and bootstrap a fresh admin user automatically.

## Building for production

```bash
npm run build          # builds both server (dist/) and client (dist/)
npm start               # runs the compiled server from server/dist
```

Serve `client/dist` as static files from your web server or CDN of choice, pointed at
the API via `VITE_API_URL` at build time.

## API overview

All routes are under `/api` and (except `/api/auth/login` and `/api/health`) require an
`Authorization: Bearer <token>` header obtained from `/api/auth/login`.

| Resource | Endpoints |
| --- | --- |
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password` |
| Customers | `GET/POST /customers`, `GET/PUT/DELETE /customers/:id`, nested bikes under `/customers/:id/bikes` |
| Inventory | `GET/POST /inventory`, `GET/PUT/DELETE /inventory/:id` |
| Services | `GET/POST /services`, `PUT/DELETE /services/:id` |
| Repair Orders | `GET/POST /repair-orders`, `GET/PUT/DELETE /repair-orders/:id`, `PATCH /repair-orders/:id/status`, line items under `/repair-orders/:id/items` |
| Invoices | `GET/POST /invoices`, `GET/DELETE /invoices/:id`, `PATCH /invoices/:id/status` |
| Appointments | `GET/POST /appointments`, `PUT/DELETE /appointments/:id`, `PATCH /appointments/:id/status` |
| Dashboard | `GET /dashboard` |

## Notes

- Passwords are hashed with bcrypt; JWTs expire after 12 hours.
- SQLite runs in WAL mode with foreign keys enforced.
- Deleting a part or a repair-order line item that used stock restores the quantity taken.
