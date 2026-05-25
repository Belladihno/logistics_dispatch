# Logistics Dispatch API

This repository contains a NestJS 11 backend for a logistics dispatch platform. It implements authentication, user management, driver support, and a lightweight dispatch workflow with background jobs and WebSocket event publishing.

This README documents the project's structure, runtime requirements, environment variables, common developer tasks, and the WebSocket event surface provided by the codebase.

## Tech stack

- Framework: NestJS 11
- Database: PostgreSQL via TypeORM (migrations)
- Background jobs: BullMQ (Redis-backed)
- Real-time: Socket.IO gateway (`@nestjs/websockets`, `@nestjs/platform-socket.io`)
- Cache/session: Redis (ioredis)
- Auth: JWT access tokens + opaque refresh tokens (Redis), Google OAuth
- Email: Nodemailer (SMTP/Gmail)
- Validation: `class-validator` + `class-transformer`

## High-level modules

- `src/auth` — authentication flows, JWT + refresh tokens, Google OAuth, guards, decorators.
- `src/users` — user profile endpoints and mappers.
- `src/drivers` — driver controllers/services/entities (driver profile, availability, accept/reject dispatch).
- `src/dispatch` — dispatch orchestration, assignment logic, BullMQ jobs, and timeout handling.
- `src/events` — WebSocket gateway and `EventPublisherService` abstraction that emits domain events (gateway implementation is internal; publisher is exported).
- `src/redis` — Redis helpers and TTL-backed storage (used for refresh tokens and dispatch timeout mapping).
- `src/mail` — mailer service and templates.
- `src/common` — pipes, filters, interceptors, and utilities.

## WebSocket events

The codebase provides a small event surface for real-time client updates.

- Event names:
	- `dispatch:assigned` — emitted when an order is assigned to a driver.
	- `order:status_changed` — emitted when an order's status changes (e.g., DRIVER_ARRIVING, EXPIRED).
- Room conventions:
	- Driver room: `driver:{driverId}`
	- Order room: `order:{orderId}`
- Usage:
	- Domain code calls `EventPublisherService.notifyDriverAssigned(orderId, driverId)` and `EventPublisherService.notifyCustomerStatusChanged(orderId, status)` to publish events.
	- The `EventsGateway` implements Socket.IO emission and is intentionally kept internal; other modules should use only the publisher.

Note: `src/events/events.gateway.ts` uses `process.env.ALLOWED_ORIGIN` for CORS. Configure that in production to mirror your HTTP CORS policy.

## Prerequisites

- Node.js 20+
- PostgreSQL
- Redis

Redis is used for refresh tokens and as the backing store for BullMQ. See `docker-compose.yml` for a convenient Redis service for local development.

## Quick start (development)

1. Install dependencies

```bash
npm install
```

2. Start Redis (local using Docker)

```bash
docker compose up -d
```

3. Create `.env` from the example and edit values

```bash
cp .env.example .env
# edit .env accordingly
```

4. Run database migrations

```bash
npm run migration:run
```

5. Start the app in development mode

```bash
npm run start:dev
```

API docs (Swagger) are available at `/docs` when `SWAGGER_ENABLED` is enabled (default: enabled in non-production).

## Useful scripts

- `npm run start:dev` — development with hot reload
- `npm run build` — compile to `dist/`
- `npm run start:prod` — run compiled build
- `npm run migration:run` — apply migrations
- `npm run migration:generate -- src/database/migrations/<Name>` — generate a new migration
- `npm run lint` — run ESLint
- `npm run test` — run unit tests (if present)
- `npm run test:e2e` — run e2e tests

## Environment variables

The following variables are used across the app (not exhaustive but the important ones):

- `DATABASE_URL` — Postgres connection string
- `REDIS_URL` — Redis connection string
- `PORT` — HTTP server port (default 3000)
- `TRUST_PROXY` — set `true` when behind a proxy to enable `trust proxy`
- `SWAGGER_ENABLED` — toggle Swagger UI
- `ALLOWED_ORIGIN` — origin allowed for WebSocket CORS and recommended to mirror HTTP CORS in production

# Authentication
- `JWT_ACCESS_SECRET` — access token secret
- `JWT_ACCESS_EXPIRY` — access token TTL (e.g. `15m`)
- `JWT_REFRESH_EXPIRY` — refresh token TTL (e.g. `7d`)

# Google OAuth
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

# Mailer
- `MAIL_USER` — SMTP username (Gmail address)
- `MAIL_PASS` — SMTP app password
- `APP_BASE_URL` — frontend base URL used to build verification/reset links

# Dispatch tuning
- `MAX_DISPATCH_ATTEMPTS` — maximum number of dispatch attempts before expiring an order (default in code)
- `DISPATCH_TIMEOUT_SECONDS` — seconds to wait for driver response before timeout

If you need a complete list of environment variables used in the repo, search for `configService.get(` in `src/`.

## Runtime notes & developer guidance

- The Socket.IO adapter is registered early in `src/main.ts` so gateways initialize with the correct adapter during bootstrap.
- Use the `EventPublisherService` (exported by `src/events/events.module.ts`) as the single entrypoint for emitting domain events. The `EventsGateway` is intentionally not exported to keep the implementation internal.
- Keep static routes (e.g., `GET 'me'`) declared before parameterized routes (e.g., `GET ':id'`) to avoid route collisions in controllers such as [src/drivers/drivers.controller.ts](src/drivers/drivers.controller.ts#L1-L120).
- The dispatch flow uses BullMQ to schedule an assignment and a delayed timeout job; the mapping between order and timeout job id is cached in Redis so the service can cancel timeouts when drivers accept.

## Testing & validation

- To validate WebSocket behavior locally, run the server and connect a `socket.io-client` instance to the server, join the appropriate room (`driver:{id}` or `order:{id}`) and trigger dispatch flows via the API or directly via `DispatchService`.
- Consider adding unit tests that mock `EventPublisherService` and assert it's called by `DispatchService` in the accept/reject/timeout paths.

## Contributing

- Follow existing coding patterns (small focused providers, transaction-based DB updates for dispatch flow).
- Run lint and tests before opening a PR.

---

