# API Endpoints — Formel

> Base path: `/api`
> All protected routes require a valid JWT access token in the `Authorization: Bearer <token>` header.
> Role abbreviations: **A** = Admin · **S** = Staff/Secretary · **T** = Teacher · **AC** = Accountant

---

## Auth

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| POST | `/api/auth/login` | Login and receive access + refresh tokens | Public |
| POST | `/api/auth/refresh` | Issue new access token using refresh token | Public |
| POST | `/api/auth/logout` | Invalidate refresh token | All |

---

## Users

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/users` | List all user accounts | A |
| POST | `/api/users` | Create a new user account | A |
| GET | `/api/users/:id` | Get a single user | A |
| PATCH | `/api/users/:id` | Update user info or role | A |
| DELETE | `/api/users/:id` | Deactivate a user account | A |

---

## School Settings

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/settings` | Get school settings | A, S |
| PATCH | `/api/settings` | Update school name, address, contact | A |

---

## School Years

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/school-years` | List all school years | A, S |
| POST | `/api/school-years` | Create a new school year | A |
| GET | `/api/school-years/:id` | Get a single school year | A, S |
| PATCH | `/api/school-years/:id` | Update school year dates | A |
| PATCH | `/api/school-years/:id/activate` | Set as the active school year | A |

### Quarters

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/school-years/:id/quarters` | List all quarters for a school year | A, S |
| POST | `/api/school-years/:id/quarters` | Create a quarter (name, number, dates) | A |
| PATCH | `/api/quarters/:id` | Update quarter name or dates | A |
| DELETE | `/api/quarters/:id` | Remove a quarter | A |

---

## Classes

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/classes` | List all classes/grades | A, S, T |
| POST | `/api/classes` | Create a new class with tuition fee | A |
| GET | `/api/classes/:id` | Get a single class | A, S, T |
| PATCH | `/api/classes/:id` | Update class name or tuition fee | A |

---

## Students

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/students` | List students (filterable by name, grade, status) | A, S, T |
| POST | `/api/students` | Create a new student profile | A, S |
| GET | `/api/students/:id` | Get full student profile | A, S, T |
| PATCH | `/api/students/:id` | Update student info or status | A, S |

### Student Documents

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/students/:id/documents` | List all documents for a student | A, S |
| POST | `/api/students/:id/documents` | Upload a document (multipart/form-data) | A, S |
| DELETE | `/api/students/:id/documents/:docId` | Remove a document | A |

### Student Profile Photo

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| POST | `/api/students/:id/photo` | Upload or replace profile photo | A, S |

---

## Contacts

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/students/:id/contacts` | List contacts for a student | A, S |
| POST | `/api/students/:id/contacts` | Add a contact to a student | A, S |
| PATCH | `/api/students/:id/contacts/:contactId` | Update a contact | A, S |
| DELETE | `/api/students/:id/contacts/:contactId` | Remove a contact | A |

---

## Enrollments

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/enrollments` | List enrollments (filterable by school year, class) | A, S |
| POST | `/api/enrollments` | Enroll a student in a class for a school year | A, S |
| GET | `/api/enrollments/:id` | Get enrollment details | A, S |

---

## Scholarships

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/enrollments/:id/scholarship` | Get scholarship for an enrollment | A, S |
| POST | `/api/enrollments/:id/scholarship` | Assign a scholarship to an enrollment | A |
| PATCH | `/api/enrollments/:id/scholarship` | Update scholarship type or amount | A |
| DELETE | `/api/enrollments/:id/scholarship` | Remove a scholarship from an enrollment | A |

---

## Payments

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/enrollments/:id/payments` | List all payments for an enrollment | A, S |
| POST | `/api/enrollments/:id/payments` | Record a new payment (optionally with `quarter_id`) | A, S |
| GET | `/api/payments/:id` | Get a single payment | A, S |
| PATCH | `/api/payments/:id` | Update payment status or notes | A, S |

### Payment Documents

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/payments/:id/documents` | List proof documents for a payment | A, S |
| POST | `/api/payments/:id/documents` | Upload proof of payment (multipart/form-data) | A, S |
| DELETE | `/api/payments/:id/documents/:docId` | Remove a proof document | A |

---

## Financial Overview

> All financial calculations are performed server-side. The frontend displays computed values only.

### School-wide Revenue

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/finance/summary` | Revenue collected vs expected for active school year | A |
| GET | `/api/finance/summary?classId=:id` | Revenue breakdown for a specific class | A |
| GET | `/api/finance/summary?quarterId=:id` | Revenue breakdown for a specific quarter | A |

**Response includes:** `total_expected`, `total_collected`, `total_remaining`, `student_count`

### Student Balance

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/students/:id/balance` | Student's total paid + remaining for the active school year | A, S |
| GET | `/api/students/:id/balance?quarterId=:id` | Student's paid + remaining for a specific quarter | A, S |

**Response includes:** `tuition_amount`, `scholarship_discount`, `amount_due`, `amount_paid`, `remaining_balance`

### Quarter Financials

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/quarters/:id/finance` | Revenue collected vs expected for a specific quarter | A |

**Response includes:** `quarter_tuition` (annual fee / number of quarters), `total_collected`, `total_remaining`, `student_count`

---

## Audit Logs

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/audit-logs` | List audit logs (filterable by table, user, date) | A |

---

## Notes

- **Students are never deleted** — use `PATCH /api/students/:id` to set `status` to `transfer`, `expelled`, or `graduated`
- **File uploads** use `multipart/form-data` and are handled by Multer before being forwarded to Cloudflare R2
- **One active school year** at a time — enforced at DB level and via the `/activate` endpoint
- **One enrollment per student per school year** — enforced by unique index; the API returns a `409 Conflict` if violated
- **Quarter tuition** is computed as `annual_tuition_fee / number of quarters` — not stored, always derived
- **All financial math is server-side** — balances, totals, and revenue are never computed by the frontend
- **Payments** can optionally include a `quarter_id` to tie the payment to a specific quarter period
