# Formel — School Management System

A comprehensive school administration platform designed to centralize student records, track tuition payments, manage enrollments, and provide financial insights for educational institutions. Formel serves as a digital student dossier, keeping all administrative and academic information in one secure, organized system.

## Features

### Student Management
- Register and manage student profiles with complete demographic information
- Upload and store student documents (birth certificates, IDs, transcripts, medical records)
- Attach student profile photos for easy identification
- Search and filter students by name, grade, enrollment status, and scholarship status
- Track student status: active, transferred, expelled, or graduated
- Automatic promotion to next grade at school year transitions

### Tuition & Payment Tracking
- Comprehensive payment history for each student
- Multiple payment methods support (cash, transfer, check, mobile, deposit)
- Payment proof document uploads (receipts, confirmations)
- Versement (installment) tracking with configurable due dates
- Real-time balance calculation considering scholarships and payments
- Payment status tracking: completed, pending

### Scholarship Management
- Assign multiple scholarship types to students:
  - Full scholarships (100% fee waiver)
  - Partial scholarships (percentage-based discount)
  - Fixed amount scholarships
  - Versement annulation (waive specific installments)
  - Book fee annulation
- Scholarship-aware overdue payment calculations
- Automatic student marking as scholarship recipients

### Academic Year & Enrollment Management
- Create and manage multiple school years
- Define class structure: prescolaire → lycée (16 grade levels)
- Configure class groups with associated tuition and versement amounts
- Automatic student enrollment and promotion
- Track enrollment status: enrolled, transferred, inactive, graduated
- Handle student graduation (auto-mark when no higher grade exists)

### Financial Dashboard
- Revenue overview broken down by class group
- Monthly payment trend analytics
- Payment method distribution charts
- Collection vs. remaining amount calculations
- Scholarship discount tracking and reporting
- Role-based financial visibility (secretary accounts have limited access)

### Role-Based Access Control
- **Admin** accounts: Full access to all features
  - Can assign scholarships during student creation
  - Can message student contacts
  - Can see all financial dashboards and reports
- **Secretary** accounts: Limited administrative access
  - Student management (add, edit, upload documents)
  - Payment recording and processing
  - Document management
  - Hidden from: financial analytics, revenue overview, messaging

### Audit & Compliance
- Complete audit logs of all administrative actions
- User activity tracking (create, update, delete operations)
- Secure authentication with JWT tokens
- Role-based authorization on all endpoints

## Technology Stack

### Frontend
- **React 19** with Vite — fast development experience
- **React Router** — client-side routing with auth guards
- **TanStack Query (React Query)** — API data fetching, caching, and synchronization
- **Tailwind CSS** — utility-first styling framework
- **shadcn/ui** — accessible, customizable component library
- **React Hook Form + Zod** — form handling and validation
- **Recharts** — interactive financial charts and analytics
- **TypeScript** — type-safe development

### Backend
- **Node.js** with Express — lightweight REST API server
- **PostgreSQL** — relational database for structured data
- **DrizzleORM** — type-safe database queries and migrations
- **JWT + Bcrypt** — secure authentication and password hashing
- **Multer** — file upload handling
- **Cloudflare R2** — cloud storage for documents, photos, and receipts
- **Zod** — request validation (shared with frontend patterns)

### Infrastructure
- **Railway** — hosting for backend, frontend, and PostgreSQL
- **Monorepo structure** — frontend and backend in single repository

## Project Structure

```
formel/
├── backend/                 # Express REST API
│   ├── src/
│   │   ├── index.js        # Server entry point
│   │   ├── config/         # Database, environment, R2 config
│   │   ├── db/
│   │   │   ├── schema/     # DrizzleORM table definitions
│   │   │   ├── seed.js     # Basic seeding script
│   │   │   ├── reset-seed.js  # Full demo dataset
│   │   │   └── delete-db.js   # Clear data + recreate users
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── modules/        # Feature modules:
│   │   │   ├── students/   # Student CRUD, balance tracking
│   │   │   ├── enrollments/# Enrollment management
│   │   │   ├── payments/   # Payment processing
│   │   │   ├── scholarships/ # Scholarship logic
│   │   │   ├── school-years/ # Academic year management
│   │   │   ├── financing/  # Financial calculations
│   │   │   ├── messaging/  # Contact messaging
│   │   │   └── audit-logs/ # Activity logging
│   │   └── lib/
│   │       ├── apiError.js # Error response formatting
│   │       ├── asyncHandler.js # Async/await wrapper
│   │       └── auditLogger.js # Audit trail logging
│   ├── tests/              # Jest test suites
│   ├── drizzle/            # Database migrations
│   └── package.json
│
├── frontend/               # React SPA
│   ├── src/
│   │   ├── main.tsx       # Entry point
│   │   ├── App.tsx        # Router configuration
│   │   ├── api/           # API client functions
│   │   ├── pages/         # Page components (routed)
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks (data fetching)
│   │   ├── context/       # React context (auth, theme)
│   │   ├── types/         # TypeScript type definitions
│   │   ├── lib/           # Utilities (validators, helpers)
│   │   └── styles/        # Global styles
│   ├── public/            # Static assets
│   └── package.json
│
└── Planing/               # Documentation & diagrams
    ├── docs/
    │   ├── Formel.md      # Feature specification
    │   ├── BackendTechStack.md
    │   ├── FrontendTechStack.md
    │   ├── APIEndpoints.md
    │   └── DatabaseRelationships.md
    └── diagrams/          # User flow diagrams
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (local or Railway)
- Cloudflare R2 credentials (for file uploads)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database URL, R2 credentials, and JWT secret

# Generate database migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Seed demo data (full school structure with students)
npm run db:reset/seed

# Or just clear and recreate users
npm run db:reset

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server (Vite)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database Scripts

| Script | Purpose |
|--------|---------|
| `npm run db:generate` | Generate new migrations after schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema to database (Drizzle) |
| `npm run db:seed` | Basic seeding |
| `npm run db:reset/seed` | **Clear all data** and seed full demo dataset |
| `npm run db:reset` | **Clear all data** and recreate admin/secretary users only |

**Warning:** Data reset scripts delete all records. Always backup before running.

## API Endpoints

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Authentication
- `POST /auth/login` — Login with email/password
- `POST /auth/refresh` — Refresh access token
- `POST /auth/logout` — Logout

### Students
- `GET /students` — List students with filters (name, status, scholarship, overdue)
- `GET /students/:id` — Get student detail with balance and enrollments
- `POST /students` — Create new student
- `PATCH /students/:id` — Update student info
- `POST /students/:id/photo` — Upload profile photo
- `POST /students/:id/promote` — Promote to next grade
- `POST /students/:id/downgrade` — Downgrade to previous grade
- `POST /students/:id/contacts` — Manage student contacts

### Payments
- `GET /payments` — List all payments (filterable)
- `POST /payments` — Record new payment
- `PATCH /payments/:id` — Update payment status
- `POST /payments/:id/documents` — Upload payment proof

### Enrollments
- `GET /enrollments` — List enrollments with search
- `POST /enrollments` — Create enrollment

### Finance
- `GET /finance/balance/:studentId` — Student's tuition balance
- `GET /finance/monthly-report` — Monthly payment analytics
- `GET /finance/by-group` — Revenue by class group
- `POST /finance/transfer-credit` — Transfer surplus credit

### School Years
- `GET /school-years` — List all school years
- `POST /school-years` — Create school year
- `PATCH /school-years/:id/activate` — Set as active year
- `POST /school-years/:id/promote` — Promote all students to next year

### Scholarships
- `GET /scholarships` — List scholarships
- `POST /scholarships` — Create scholarship
- `PATCH /scholarships/:id` — Update scholarship
- `DELETE /scholarships/:id` — Delete scholarship

See [APIEndpoints.md](Planing/docs/APIEndpoints.md) for complete endpoint documentation.

## Authentication & Authorization

Formel uses **JWT-based authentication**:

1. User logs in with email + password
2. Server returns:
   - `accessToken` (15-30 min expiry) — sent in `Authorization` header
   - `refreshToken` (7-30 days) — stored in httpOnly cookie
3. Client uses access token for all API calls
4. When token expires, client automatically refreshes using refresh token
5. Frontend middleware automatically attaches role-based guards to routes

**Roles:**
- `admin` — Full system access
- `secretary` — Limited (students, payments, documents)

## Database Schema

Key entities:

- **users** — Admin and secretary accounts
- **students** — Student profiles with demographic info
- **enrollments** — Student class enrollment per school year
- **schools_years** — Academic year definitions
- **classes** — Class definitions with grade levels
- **class_groups** — Class groupings (Prescolaire, Primaire, etc.)
- **payments** — Payment records with status tracking
- **versements** — Tuition installments with due dates
- **scholarships** — Scholarship assignments with types/amounts
- **contacts** — Student contact information (parents, guardians)
- **student_documents** — Uploaded documents (ID, certificate, etc.)
- **payment_documents** — Payment proof uploads
- **audit_logs** — Activity trail (who did what when)

[DatabaseRelationships.md](Planing/docs/DatabaseRelationships.md) contains ERD and detailed schema documentation.

## Development Workflow

### Running Both Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend runs on `http://localhost:3000` (or configured port)

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:5173`

### Test Accounts (After seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@formel.school | admin123 |
| Secretary | secretary@formel.school | password123 |

## Key Implementation Details

### Scholarship-Aware Overdue Calculation
When determining if a student has overdue payments, the system accounts for scholarships:
1. Calculate raw overdue versement total
2. Apply scholarship discount ratio (full, partial, fixed-amount scholarships)
3. Subtract versement annulations (waived installments)
4. Compare effective overdue vs. amount paid
5. Result determines "late payment" flag shown to secretary

### Auto-Graduation Logic
Students without a higher grade level are automatically marked as graduated when promoted, rather than skipped. This ensures proper status tracking.

### File Upload Flow
1. Client uploads file (document, photo, or proof)
2. Multer parses in memory
3. Backend uploads to Cloudflare R2 via S3 API
4. R2 returns public URL
5. URL stored in PostgreSQL and returned to client

### Cursor-Based Pagination
Large lists (payments, audit logs) use cursor-based pagination for efficiency:
- Maintains stable ordering even as records are added/deleted
- Uses composite key (timestamp, ID) to track position
- Encodes cursor as base64url string

## Performance Notes

- **Query Optimization:** Enrollments joined with active school year only
- **Caching:** TanStack Query handles client-side caching and stale-time management
- **Pagination:** Cursor-based for O(1) lookups vs offset-based O(n)
- **Batch Operations:** Bulk inserts for seeding (200-500 records per batch)
- **Database Indexing:** Drizzle auto-indexes primary keys; add manual indexes for frequently filtered fields

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes with proper commit messages
3. Test locally before pushing
4. Push to repository and open a pull request

## License

ISC

## Support

For issues or feature requests, please create an issue in the repository.

---

**Last Updated:** March 2026  
**Version:** 1.0.0
