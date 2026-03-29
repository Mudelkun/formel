# Formel — School Management System

A school administration platform for managing student records, tuition payments, enrollments, and financial reporting. Built for Haitian educational institutions with HTG currency support and a French-language interface.

## Features

- **Student Management** — profiles, documents, photos, status tracking (active, transferred, expelled, graduated)
- **Tuition & Payments** — versement (installment) tracking, multiple payment methods, proof document uploads
- **Scholarship System** — full, partial, fixed-amount, and installment/fee waivers with balance-aware overdue calculations
- **Academic Years & Enrollment** — 16 grade levels (préscolaire → lycée), class groups, auto-promotion and graduation
- **Financial Dashboard** — revenue by class group, monthly trends, payment method breakdown (admin only)
- **Role-Based Access** — Admin (full access) and Secretary (students, payments, documents; no financial data)
- **Audit Logs** — complete activity trail for all administrative actions
- **File Storage** — student documents, photos, and payment receipts via Cloudflare R2

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Recharts |
| Backend | Node.js, Express, DrizzleORM, PostgreSQL |
| Auth | JWT (access token) + httpOnly cookie (refresh token) |
| Storage | Cloudflare R2 (S3-compatible) |
| Email | Resend |
| Hosting | Railway (backend + frontend + database) |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Cloudflare R2 bucket

### Local Development

```bash
# Install all dependencies
npm install

# Configure backend environment
cp backend/.env.example backend/.env
# Fill in DATABASE_URL, JWT_SECRET, R2_* credentials, RESEND_API_KEY

# Run migrations and seed demo data
cd backend && npm run db:push && npm run db:seed

# Start backend + frontend concurrently
npm run dev
```

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

### Test Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@formel.school | admin123 |
| Secretary | secretary@formel.school | password123 |

### Database Scripts

| Script | Description |
|---|---|
| `npm run db:push` | Sync schema to database |
| `npm run db:seed` | Seed basic data |
| `npm run db:reset/seed` | **Destructive** — clear all data and seed full demo dataset |
| `npm run db:reset` | **Destructive** — clear all data, recreate users only |
| `npm run db:generate` | Generate migrations after schema changes |
| `npm run db:migrate` | Apply pending migrations |

## Deployment

The app deploys to Railway as a single service. The backend serves the built frontend as static files.

```bash
npm run build   # installs deps + builds frontend
npm start       # db:push, db:seed, start server
```

Set the following environment variables on Railway:

```
DATABASE_URL
JWT_SECRET
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
RESEND_API_KEY
```

## Project Structure

```
formel/
├── backend/          # Express REST API + static file serving
│   ├── src/
│   │   ├── modules/  # students, payments, scholarships, finance, ...
│   │   ├── db/       # DrizzleORM schema, migrations, seed scripts
│   │   └── middleware/
│   └── tests/
├── frontend/         # React SPA (built output served by backend)
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       └── api/
└── Planing/docs/     # Feature specs, API docs, DB relationships
```

## License

ISC
