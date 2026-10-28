# Stock Management System — Frontend

> Production hardening and UI upgrade: see [docs/UPGRADE.md](docs/UPGRADE.md) for migration, session, access-control and deployment changes.

Next.js frontend for the multi-location stock and business management platform. It uses [shadcn/ui](https://ui.shadcn.com) and talks to the NestJS API documented in **[docs/BACKEND_API_CONTRACT.md](docs/BACKEND_API_CONTRACT.md)**.

## Features

- JWT authentication with refresh tokens
- Role-based navigation (permissions from `/auth/me`)
- **Dashboard**, **Inventory** (CRUD, Excel import, reorder points, **audited stock adjustments**, **itemType**), **BOMs**, **Production orders**, **Stock Transfers**
- **Inquiries** — staff CRM (`/inquiries`, create on `/inquiries/new`)
- **Notifications** — in-app bell + `/notifications` list (sales, purchases, transfers, inquiries, low-stock for `inventory.read`)
- **Purchases** and **Sales** — Frappe-style form pages (`/new`), detail (`/[id]`), edit (`/[id]/edit`), and void (DELETE)
- **Credits**, **Expenses** (with delete), **Bank**, **Profit & Loss**
- **Master data** — Locations, Suppliers, Customers with create and edit (PATCH)
- **Admin** — Branding (app name + hero image), Users and Roles (create, edit, delete; permission picker for roles)
- Quick-create dialogs for related records on transaction forms

## Prerequisites

1. Backend API running (default `http://localhost:3001/api`)
2. Database seeded (`DB_SEED=true` once) with admin user

See [docs/BACKEND_API_CONTRACT.md](docs/BACKEND_API_CONTRACT.md) for full endpoint reference, permissions, and backend setup.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) to sign in (seeded credentials e.g. `admin@stock.local` / `Admin@123`). `/` redirects to login.

Ensure backend `CORS_ORIGIN` includes `http://localhost:3000`.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api/v1` | Backend API base URL (include `/api/v1`) |

## Project structure

- `app/(app)/` — Authenticated routes with sidebar shell (document forms on `/new` pages)
- `app/login/` — Staff sign-in page
- `docs/BACKEND_API_CONTRACT.md` — API contract for frontend/backend integration
- `lib/api.ts` — API client with Bearer token and refresh
- `lib/auth.tsx` — Auth context
- `components/app-shell.tsx` — Sidebar layout wrapper
- `components/inquiries/` — Staff inquiry CRM
- `components/purchases/`, `components/sales/` — Transaction forms and detail views
- `components/inventory/stock-item-form.tsx` — Full-page inventory create/edit

## Scripts

- `npm run dev` — Development server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — ESLint
