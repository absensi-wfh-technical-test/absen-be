# WFH Attendance Backend

NestJS backend for the WFH attendance assessment. This repository runs two processes:

| Process | Default address | Responsibility |
| --- | --- | --- |
| HTTP API | `http://localhost:3000` | Authentication, employee management, photo upload, and attendance HTTP endpoints |
| Attendance microservice | TCP `127.0.0.1:3001` | Attendance rules and attendance database operations |

Both processes use the same MySQL database through Prisma 6.19.0. The React frontend calls only the HTTP API. Start both processes for attendance features to work.

## Requirements

- Node.js 22.12 or newer and pnpm.
- A running MySQL server with databases provisioned by an administrator. The application account needs privileges on its databases, but **does not need global `CREATE DATABASE` or `DROP DATABASE` privileges**.
- The companion React frontend repository if you want to use the browser UI.

Run all commands from this backend repository's root directory. The frontend and backend repositories do not need to be siblings on disk.

## 1. Configure MySQL and environment variables

Provision the main database (for example, `absensi_wfh`) and a **separate** shadow database (for example, `absensi_wfh_shadow`) for Prisma migration development. The current Prisma configuration expects both URLs. Never point the shadow URL at the main database.

Copy `.env.example` to `.env` and replace its placeholders. `.env` is ignored by Git. URL-encode special characters in MySQL credentials when putting them in a connection URL.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | MySQL connection to the provisioned main database |
| `SHADOW_DATABASE_URL` | Connection to the separate Prisma shadow database |
| `JWT_SECRET` | Random secret of at least 32 bytes for JWT signing |
| `SEED_DEMO_PASSWORD` | Local demo password of at least 8 characters; required when seeding |
| `FRONTEND_ORIGIN` | Allowed browser origin; defaults to `http://localhost:5173` |
| `ATTENDANCE_TCP_HOST` | TCP host used by both processes; defaults to `127.0.0.1` |
| `ATTENDANCE_TCP_PORT` | TCP port used by both processes; defaults to `3001` |
| `PHOTO_STORAGE_DIR` | Private, writable photo directory; defaults to `.private-photos` relative to this repository |
| `PORT` | HTTP API port; defaults to `3000` |

Keep JWT secrets, database credentials, demo passwords, and private photos out of Git. Restrict the TCP port to the backend's internal network.

## 2. Install, migrate, and seed

```bash
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm exec tsx prisma/seed.ts
```

`migrate deploy` applies the migrations in `prisma/migrations` to the **already provisioned** main database; it does not create the database itself. The seed upserts roles, departments, positions, and two demo accounts, so it can be rerun. Use the seed in a development or demo environment unless these accounts are intended for your deployment. Rerunning the seed updates the demo accounts' password hashes to the current `SEED_DEMO_PASSWORD`.

On Windows, stop running backend processes before `prisma generate` or applying migrations. A running Node process can lock Prisma's query-engine DLL and make generation fail with `EPERM`.

| Demo role | Email | Password |
| --- | --- | --- |
| HRD (`ADMIN`) | `admin.hr@sample.com` | Your local `SEED_DEMO_PASSWORD` value |
| Employee (`EMPLOYEE`) | `developer@sample.com` | Your local `SEED_DEMO_PASSWORD` value |

No demo password is stored in this repository.

## 3. Run both backend processes

Open two terminals in this repository. Start the attendance microservice first:

```bash
pnpm start:attendance:dev
```

Then start the HTTP API in the second terminal:

```bash
pnpm start:dev
```

Visit `http://localhost:3000/health/database`. A working connection returns `{"status":"ok","database":"connected"}`. Attendance requests also require the TCP microservice. If it is unavailable, attendance endpoints return a structured `503`; authentication and employee management remain available.

For compiled execution, run `pnpm build`, then run `pnpm start:attendance:prod` and `pnpm start:prod` in separate terminals. Run the frontend from its own repository at `http://localhost:5173`.

## API and request proof

Business HTTP endpoints are under `/api`: `/api/auth`, `/api/employees`, `/api/departments`, `/api/positions`, and `/api/attendances`. Requests use JWT and a per-session P-256 signature. The frontend generates the key pair; no backend signing secret is shipped to the browser. JSON and bodyless requests use proof `v1`; photo uploads use multipart proof `v2`, which includes a SHA-256 digest of the photo bytes. Photos are stored outside public assets and served only through authorized HTTP endpoints.

## Verification

```bash
pnpm lint
pnpm test
pnpm build
pnpm exec prisma migrate status
pnpm test:e2e
```

Migration status and E2E checks require the configured MySQL server. With MySQL, the seed, and both backend processes running, `pnpm test:auth:smoke` tests both roles and request proof. `pnpm test:domain:smoke` tests master data, attendance CRUD, photos, and access rules. Set `API_BASE_URL` to the HTTP API URL for either smoke test; the auth smoke defaults to `http://localhost:3000`, while the domain smoke defaults to `http://localhost:3100`. The domain smoke creates and removes synthetic records, so run it only against a development or disposable database.

The auth smoke script reads `SEED_DEMO_PASSWORD` from its process environment, not automatically from `.env`. For the default local API, you can load it without printing the password and point the domain smoke to port 3000:

```powershell
node --env-file=.env test/auth-signature.smoke.mjs
$env:API_BASE_URL = 'http://localhost:3000'
pnpm test:domain:smoke
Remove-Item Env:API_BASE_URL
```

`pnpm photos:reconcile` reports old, unreferenced photos without deleting them. Review the report before using `pnpm photos:reconcile --delete`. If an attendance write times out, read its current status before retrying because the write may already have committed.

## Common issues

| Symptom | Check |
| --- | --- |
| Database health fails | MySQL is running, the main database exists, `DATABASE_URL` is correct, and the account has permissions on that database. |
| Prisma cannot start | Both database URLs are set, the shadow database is separate, and `pnpm exec prisma generate` has completed. |
| Attendance returns `503` | The TCP process is running and `ATTENDANCE_TCP_HOST`/`ATTENDANCE_TCP_PORT` match in both processes. |
| Browser requests fail | The frontend proxy points to this HTTP API and `FRONTEND_ORIGIN` matches the browser origin. |
| Photo upload fails | `PHOTO_STORAGE_DIR` is writable by the HTTP API process; the file is JPEG, PNG, or WebP and no larger than 5 MiB. |
