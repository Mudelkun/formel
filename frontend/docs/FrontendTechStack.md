# Frontend Tech Stack — Formel

## Core

- **React** (with Vite) — fast build tooling, huge ecosystem, easy to find help/examples
- **React Router** — client-side routing for role-based dashboards (admin, secretary, teacher)

## State & Data Fetching

- **TanStack Query (React Query)** — handles API calls, caching, loading/error states, and token refresh seamlessly. Perfect for the REST API pattern used in the backend.

## UI Components

- **shadcn/ui** — copy-paste components built on Radix UI + Tailwind. Provides polished tables, forms, modals, dropdowns, date pickers out of the box — all customizable since you own the code.

## Styling

- **Tailwind CSS** — pairs with shadcn/ui, fast to iterate, keeps styles colocated with components

## Forms

- **React Hook Form + Zod** — Zod is already used on the backend for validation, so validation logic patterns stay consistent across the stack. React Hook Form is lightweight and performant for the many form-heavy pages (student registration, payments, enrollment).

## Charts (Finance Dashboard)

- **Recharts** — simple React charting library for the financial overview (revenue collected vs remaining per grade)

## File Uploads

- **Native fetch + drag-and-drop** — the backend already handles multipart via Multer, so no special client library needed. A simple dropzone component suffices.

---

## How This Stack Maps to Formel's Requirements

| Requirement | Solution |
|---|---|
| Role-based dashboards (admin/secretary/teacher) | React Router with auth guards |
| Heavy table/list views (students, payments, audit logs) | shadcn/ui DataTable (built on TanStack Table) |
| Many forms with validation | React Hook Form + Zod |
| JWT auth with refresh tokens | TanStack Query + axios interceptor for token refresh |
| Financial charts | Recharts |
| File upload (documents, photos, payment proofs) | Simple dropzone component |
| Static build served by Express | `vite build` → `dist/` → `express.static()` |
| Monorepo structure | `frontend/` folder alongside `backend/` |

---

## Build & Deployment

- **Vite** builds the frontend into a `dist/` folder of static assets
- **Express** serves these static files alongside the `/api/...` routes
- Deployed together on **Railway** as a single service (monorepo)
- No separate frontend hosting needed
