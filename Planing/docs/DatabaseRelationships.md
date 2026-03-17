# Database Relationships — Formel

## Tables Overview

| Table | Purpose |
|---|---|
| `students` | Core student profile |
| `contacts` | Parent/guardian contact info per student |
| `student_documents` | Uploaded dossier files per student |
| `classes` | Grade levels and their tuition fees |
| `school_years` | Academic year definitions |
| `quarters` | Subdivisions of a school year (quarter 1, quarter 2, etc.) |
| `enrollments` | Links a student to a class for a given school year |
| `payments` | Payment records tied to an enrollment |
| `payment_documents` | Proof of payment files per payment |
| `users` | Admin, staff, accountant, and teacher accounts |
| `scholarships` | Scholarship applied to a specific enrollment (tuition reduction) |
| `school_settings` | School-wide configuration (name, address, contact info) |
| `audit_logs` | Tracks all data changes made by users |

---

## Relationships

### students → contacts (1 to many)
One student can have multiple contacts (parents, guardians).
`contacts.student_id` → `students.id`

### students → student_documents (1 to many)
One student can have multiple uploaded documents (birth certificate, ID card, transcript, etc.).
`student_documents.student_id` → `students.id`

### students → enrollments (1 to many)
One student can be enrolled once per school year (enforced by unique index on `student_id + school_year_id`).
`enrollments.student_id` → `students.id`

### classes → enrollments (1 to many)
One class can have many students enrolled in it.
`enrollments.class_id` → `classes.id`

### school_years → quarters (1 to many)
One school year can have multiple quarters. Each quarter has a unique number within its school year.
`quarters.school_year_id` → `school_years.id`

### school_years → enrollments (1 to many)
One school year groups all enrollments that happen during that period.
`enrollments.school_year_id` → `school_years.id`

### enrollments → payments (1 to many)
One enrollment can have multiple payments (e.g. quarter installments).
`payments.enrollment_id` → `enrollments.id`

### quarters → payments (1 to many)
A payment can optionally be tied to a specific quarter. When null, the payment applies to the full year.
`payments.quarter_id` → `quarters.id`

### payments → payment_documents (1 to many)
One payment can have multiple proof documents (receipts, bank slips).
`payment_documents.payment_id` → `payments.id`

### enrollments → scholarships (1 to 1)
One enrollment can have at most one scholarship record (enforced by `UNIQUE` on `scholarships.enrollment_id`). Supports three types: `full`, `partial` (percentage-based), or `fixed_amount`.
`scholarships.enrollment_id` → `enrollments.id`

### users → audit_logs (1 to many)
Every audited action is tied to the user who performed it.
`audit_logs.user_id` → `users.id`

---

## Full Chain

```
students
  ├── contacts              (parent/guardian info)
  ├── student_documents     (dossier files stored in R2)
  └── enrollments
        ├── classes         (grade level + tuition fee)
        ├── school_years    (academic year)
        │     └── quarters (quarter periods within the year)
        ├── scholarships    (optional tuition reduction — full, partial, or fixed amount)
        └── payments             (optionally tied to a quarter)
              └── payment_documents   (proof of payment stored in R2)

users                       (standalone — admin, staff, accountant, teacher accounts)
  └── audit_logs            (record of all data changes)

school_settings             (standalone — school-wide configuration)
```

---

## Key Constraints

- A student can only be enrolled **once per school year** (`UNIQUE` on `enrollments.student_id + school_year_id`)
- Only **one school year** can be active at a time (`UNIQUE` partial index on `school_years.is_active WHERE is_active = true`)
- Students are **never deleted** — use `status` field: `active`, `inactive`, `expelled`, `graduated`
- Scholarship students (`scholarship_recipient = true` on `students`) are flagged at the student level; the `scholarships` table holds the per-enrollment details (type and amount)
- A scholarship is **1-to-1 per enrollment** (`UNIQUE` on `scholarships.enrollment_id`) — one scholarship record per enrollment at most
- Scholarship types: `full` (100% waiver), `partial` (percentage-based), `fixed_amount` (fixed reduction)
- Quarter numbers are **unique per school year** (`UNIQUE` on `quarters.school_year_id + number`)
- Payments can optionally reference a `quarter_id` — when set, the payment is tracked against that quarter's portion of the tuition
- **All financial math is computed server-side** — the frontend never calculates balances, totals, or revenue
