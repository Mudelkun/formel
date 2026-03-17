# Backend Tech Stack — Formel

## Authentication
- **JWT (JSON Web Tokens)** — stateless authentication
  - Login returns a short-lived **access token** (15–30 min) + a **refresh token** (7–30 days) stored in an `httpOnly` cookie
  - Token payload carries the user's role (`admin`, `staff`, `accountant`, `teacher`) for route-level authorization
  - Auth middleware verifies the token and attaches user/role to `req.user` on every protected request
- **Libraries:** `jsonwebtoken` (sign/verify tokens), `bcrypt` (password hashing — maps to `users.password_hash`)

## Runtime & Framework
- **Node.js** — JavaScript runtime
- **Express** — REST API server and routing

## Database
- **PostgreSQL** hosted on **Railway**

## ORM
- **DrizzleORM** — connects the backend to PostgreSQL

## Input Validation
- **Zod** — validates and types incoming request bodies
  - Schemas are shared between API validation and DrizzleORM, minimizing duplicate definitions

## File Uploads
- **Multer** — Express middleware for handling `multipart/form-data` file uploads before forwarding to R2

## File Storage
- **Cloudflare R2**
  - Stores student documents, payment proofs, and other files
  - Returns a public URL per file, stored in the database

### R2 Upload Flow
1. Client sends file to Express via `multipart/form-data`
2. Multer parses the file in memory
3. Backend forwards the file to R2 via S3-compatible API
4. R2 returns a public URL (e.g. `https://pub-xxx.r2.dev/formel-docs/receipt.pdf`)
5. URL is stored in PostgreSQL via DrizzleORM

## Environment Variables
- **`.env`** — stores secrets and config (DB connection string, R2 credentials, JWT secret)
- Never committed to version control

## Deployment
- **Railway** — hosts the full application and PostgreSQL database
- **Monorepo structure** — frontend and backend live in the same repository, separated by folder:
  ```
  formel/
    ├── frontend/
    ├── backend/
    ├── database/
    └── docs/
  ```
- Single deployment — Express serves the API under `/api/...` and the frontend as static files
- No API versioning
