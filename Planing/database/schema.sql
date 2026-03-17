CREATE TABLE "students" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "NIE" varchar,
  "first_name" varchar NOT NULL,
  "last_name" varchar NOT NULL,
  "gender" varchar NOT NULL CHECK ("gender" IN ('male', 'female', 'other')),
  "birth_date" date NOT NULL,
  "address" text,
  "scholarship_recipient" boolean DEFAULT false,
  "status" varchar DEFAULT 'active' CHECK ("status" IN ('active', 'transfer', 'expelled', 'graduated')),
  "profile_photo_url" text,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE TABLE "contacts" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "student_id" uuid NOT NULL,
  "first_name" varchar NOT NULL,
  "last_name" varchar NOT NULL,
  "phone" varchar,
  "email" varchar NOT NULL,
  "relationship" varchar NOT NULL,
  "is_primary" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE TABLE "student_documents" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "student_id" uuid NOT NULL,
  "document_type" varchar NOT NULL CHECK ("document_type" IN ('birth_certificate', 'id_card', 'transcript', 'medical_record', 'other')),
  "document_url" text NOT NULL,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE TABLE "classes" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "name" varchar NOT NULL,
  "grade_level" int UNIQUE NOT NULL,
  "annual_tuition_fee" numeric NOT NULL,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE TABLE "payments" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "enrollment_id" uuid NOT NULL,
  "quarter_id" uuid,
  "amount" numeric NOT NULL,
  "payment_date" date NOT NULL,
  "payment_method" varchar,
  "status" varchar NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'completed', 'failed', 'refunded')),
  "notes" text,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE TABLE "payment_documents" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "payment_id" uuid NOT NULL,
  "document_url" text NOT NULL,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "name" varchar NOT NULL,
  "email" varchar UNIQUE NOT NULL,
  "password_hash" text NOT NULL,
  "role" varchar NOT NULL CHECK ("role" IN ('admin', 'staff', 'accountant', 'teacher')),
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE TABLE "school_years" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "year" varchar UNIQUE NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "is_active" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

-- Ensures only one school year can be active at a time
CREATE UNIQUE INDEX "one_active_school_year" ON "school_years" ("is_active") WHERE "is_active" = true;

CREATE TABLE "enrollments" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "student_id" uuid NOT NULL,
  "class_id" uuid NOT NULL,
  "school_year_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE INDEX ON "contacts" ("student_id");

CREATE INDEX ON "student_documents" ("student_id");

CREATE INDEX ON "payments" ("enrollment_id");

CREATE INDEX ON "enrollments" ("student_id");

CREATE INDEX ON "enrollments" ("class_id");

CREATE INDEX ON "enrollments" ("school_year_id");

CREATE UNIQUE INDEX ON "enrollments" ("student_id", "school_year_id");

ALTER TABLE "contacts" ADD FOREIGN KEY ("student_id") REFERENCES "students" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payments" ADD FOREIGN KEY ("enrollment_id") REFERENCES "enrollments" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payments" ADD FOREIGN KEY ("quarter_id") REFERENCES "quarters" ("id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX ON "payments" ("quarter_id");

ALTER TABLE "enrollments" ADD FOREIGN KEY ("student_id") REFERENCES "students" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "enrollments" ADD FOREIGN KEY ("school_year_id") REFERENCES "school_years" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "enrollments" ADD FOREIGN KEY ("class_id") REFERENCES "classes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payment_documents" ADD FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "student_documents" ADD FOREIGN KEY ("student_id") REFERENCES "students" ("id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE "scholarships" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "enrollment_id" uuid NOT NULL UNIQUE,
  "type" varchar NOT NULL CHECK ("type" IN ('full', 'partial', 'fixed_amount')),
  "percentage" numeric CHECK ("percentage" > 0 AND "percentage" <= 100),
  "fixed_amount" numeric CHECK ("fixed_amount" > 0),
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

ALTER TABLE "scholarships" ADD FOREIGN KEY ("enrollment_id") REFERENCES "enrollments" ("id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE "school_settings" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "school_name" varchar NOT NULL,
  "address" text,
  "phone" varchar,
  "email" varchar,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE TABLE "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "action" varchar NOT NULL,
  "table_name" varchar NOT NULL,
  "record_id" uuid,
  "old_data" jsonb,
  "new_data" jsonb,
  "created_at" timestamp DEFAULT (now())
);

ALTER TABLE "audit_logs" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE "quarters" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "school_year_id" uuid NOT NULL,
  "name" varchar NOT NULL,
  "number" int NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp
);

CREATE UNIQUE INDEX ON "quarters" ("school_year_id", "number");

CREATE INDEX ON "quarters" ("school_year_id");

ALTER TABLE "quarters" ADD FOREIGN KEY ("school_year_id") REFERENCES "school_years" ("id") DEFERRABLE INITIALLY IMMEDIATE;
