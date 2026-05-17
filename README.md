# Logistics Dispatch API

NestJS backend for a logistics dispatch platform with authentication, user management, and driver management.

## Tech Stack

- **Framework:** NestJS 11
- **Database:** PostgreSQL via TypeORM (migrations-based)
- **Auth:** JWT access tokens + opaque refresh tokens (Redis), Google OAuth 2.0
- **Password Hashing:** Argon2id
- **Cache/Session:** Redis (ioredis)
- **Email:** Nodemailer (SMTP)
- **Docs:** Swagger/OpenAPI at `/docs`
- **Validation:** class-validator + class-transformer

## Prerequisites

- Node.js 20+
- PostgreSQL
- Redis (see `docker-compose.yml`)

## Setup

```bash
# Install dependencies
$ npm install

# Start Redis (Docker)
$ docker compose up -d

# Copy and configure environment
$ cp .env.example .env

# Run migrations
$ npm run migration:run

# Start development server
$ npm run start:dev
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run start:dev` | Development with hot-reload |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled production build |
| `npm run migration:run` | Apply pending database migrations |
| `npm run migration:generate -- src/database/migrations/<Name>` | Generate a new migration from entity changes |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests |
| `npm run test:e2e` | E2E tests |

## What's Implemented

### Authentication (`/auth`)
- Email/password registration with email verification
- Email/password login
- Google OAuth 2.0 login
- JWT access token (15m) + refresh token (7d, stored in Redis)
- Email verification flow
- Password reset (forgot-password email)
- Token refresh
- Global `JwtAuthGuard` (all endpoints secure by default; use `@Public()` to opt out)
- Role-based access control (`@Roles()` decorator + `RolesGuard`)
- Rate limiting groundwork via `@Throttle()` (NestJS)

### Users (`/users`)
- Get own profile
- Update own name

### Email (`MailService`)
- HTML email templates for verification and password reset
- SMTP via Gmail

### Redis (`RedisService`)
- Refresh token storage
- Generic key-value ops with TTL

### Infrastructure
- Global `ValidationPipe` (whitelist, forbid non-whitelisted, transform)
- Global `HttpExceptionFilter` (consistent error JSON)
- Global request logging interceptor
- Response time header interceptor
- Swagger docs at `/docs` with bearer auth
- 4 database migrations (users table + email verification + drivers table + password reset)
- `docker-compose.yml` for Redis

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Public | Health check |
| `POST` | `/auth/register` | Public | Register new user |
| `POST` | `/auth/login` | Public | Login with email/password |
| `POST` | `/auth/verify-email` | Public | Verify email (token in body) |
| `GET` | `/auth/verify-email` | Public | Verify email (token in query) |
| `POST` | `/auth/resend-verification-email` | Public | Resend verification email |
| `POST` | `/auth/forgot-password` | Public | Request password reset |
| `GET` | `/auth/google` | Public | Google OAuth login |
| `GET` | `/auth/google/callback` | Public | Google OAuth callback |
| `POST` | `/auth/refresh` | Refresh | Refresh tokens |
| `GET` | `/auth/me` | JWT | Get current user |
| `GET` | `/auth/admin/ping` | Admin | Admin health check |
| `GET` | `/users/profile` | JWT | Get user profile |
| `PATCH` | `/users/me/name` | JWT | Update own name |

## What's Not Yet Implemented

- **Drivers module** — entity + migration exist, but no controller/service/module (not wired into app)
- **Password reset completion** — forgot-password sends email, but no endpoint to submit the new password
- **Admin user management** — no user listing, role assignment, or user deletion
- **Driver CRUD** — no driver creation, updates, or queries
- **Driver location tracking** — lat/lng fields exist on entity but no endpoints
- **Dispatch/logistics logic** — no orders, shipments, or routing
- **Unit tests** — no `.spec.ts` files yet (only the default NestJS e2e stub)

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | JWT signing secret |
| `JWT_ACCESS_EXPIRY` | Access token TTL (e.g. `15m`) |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL (e.g. `7d`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `MAIL_USER` | Gmail address for sending emails |
| `MAIL_PASS` | Gmail app password |
| `APP_BASE_URL` | Frontend base URL for verification/reset links |
| `PORT` | Server port (default: 3000) |
| `SWAGGER_ENABLED` | Force Swagger on/off (default: on in non-production) |
