# Property Management Frontend

Production Next.js frontend for the existing multi-tenant property/rent
management backend (Express + MongoDB, cookie-authenticated, `/api/v1`).
This README reflects the **actual current state of this repository** —
sections are explicitly labeled `Implemented`, `Backend blocker`, or
`Not yet implemented`. Nothing here is aspirational.

## Technology stack

Next.js 14 (App Router) · TypeScript (strict) · MUI (theme + `sx`) ·
TanStack Query · IndexedDB via `idb` · Lucide React (icons) · Motion
(animation) · Recharts (charts) · React Three Fiber / Three.js (landing hero only).

No Bootstrap, no Tailwind, no other icon/animation library. `@mui/icons-material`
was removed — confirmed unused anywhere in the repo (Lucide is the only icon system).

## Getting started

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL to your running backend
npm run dev
```

**Backend CORS requirement**: because the API client always sends
`credentials: 'include'`, the backend's CORS middleware must respond with
`Access-Control-Allow-Origin: <exact frontend origin>` (not `*`) and
`Access-Control-Allow-Credentials: true` for whatever origin this app runs
on (e.g. `http://localhost:3000`). If the backend's CORS allow-list doesn't
include the frontend's dev origin, every request will fail at the browser
level with a CORS error — this shows up as "Unable to connect to the
server" in the UI and is a backend configuration issue, not a frontend bug.

## Verification commands

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run build       # next build
```

All three were actually executed against this repository during
development — see the conversation history for the real pass/fail results
at each stage. Do not trust a status claim in a chat response over actually
re-running these yourself before deploying.

## Authentication

Cookie-based session auth, matching the backend exactly:

- Every request goes through `src/lib/api/client.ts` with `credentials: 'include'`.
- No session token is ever read, stored, or written by frontend JS — the
  session cookie is HttpOnly and the browser handles it entirely.
- CSRF: the client reads the (non-HttpOnly, by necessity) `csrf-token`
  cookie and attaches it as `X-CSRF-Token` on every mutating request
  (POST/PATCH/PUT/DELETE). This is centralized in `client.ts` — no page or
  feature module constructs a CSRF header itself.
- `GET /auth/me` (via `SessionProvider`) never throws into render — a
  failed session check (401, network error, CORS misconfiguration) is
  always treated as an ordinary "not authenticated / can't tell right now"
  state, never an application crash.
- Logout is wrapped in `try/finally`: local session state is cleared and
  the user is navigated to `/login` even if the server-side logout call
  itself fails.
- There is no public signup or forgot/reset-password UI. The backend has a
  `POST /auth/signup` route, but it creates a brand-new Client + Owner and
  is a platform-admin operation, not something this frontend exposes.

## Roles

`CLIENT_OWNER`, `CLIENT_ADMIN`, `STAFF`, `SUPER_ADMIN` — as defined by the
backend's `User` model. `src/lib/permissions/permissions.ts` is the single
place role → capability mapping lives; it is a **usability layer only**.
The backend's `authorize()` middleware remains the actual security boundary.

## Estate scoping — Backend blocker

**This is the most important open issue in the system.** A restricted
`STAFF` user (one with a non-empty `estateIds` array) can currently receive
data beyond their assigned estates from several endpoints, because the
relevant backend services scope by a server-derived `req.estateFilter`
that (per the code reviewed) doesn't correctly restrict an ambiguous /
unscoped request for a restricted user. **This cannot be fixed from the
frontend** — frontend filtering is explicitly not a security boundary. The
precise backend fix needed: `clientContext` (or equivalent middleware) must
resolve `req.estateFilter` to the user's own `estateIds` for a restricted
STAFF user on every relevant route, and reject or narrow — never
default to "all client estates" — when the request doesn't specify scope.

Until that's fixed, this frontend does the following honestly:
- Estates page shows an explicit on-screen notice when displaying a
  device-side-filtered list for a restricted user, stating plainly that
  the filter is not a security guarantee.
- `Houses`/`Tenants`/`Transactions`/`Banking` estate-filter dropdowns do
  **not** send an `estateId` query parameter to the backend at all — a
  second, previously-undiscovered defect was found where several of these
  endpoints don't even read that query parameter (confirmed against
  `house.service.js`, `tenant.service.js`, `transaction.service.js`,
  `bank.service.js` — all scope exclusively via `req.estateFilter`). Those
  dropdowns now apply an honest **client-side** narrowing of whatever page
  of data the server already returned, instead of silently doing nothing
  while implying server-side scoping.

## Offline architecture

- **Cache** (`src/lib/storage/cache.ts` + `src/hooks/use-cached-query.ts`):
  read-heavy, safe-to-cache queries (currently: Estates list, Houses list,
  Dashboard KPI summary) write a snapshot to IndexedDB on every successful
  fetch. If the live fetch fails, the UI falls back to the last snapshot —
  but always with a visible **Cached** / **Stale** badge
  (`src/components/data-display/freshness-badge.tsx`), never presented as
  current. The entire cache is wiped (`cacheInvalidateAll()`) whenever the
  authenticated identity behind `/auth/me` changes, including logout — so
  cached data can never leak across users.
- **Sync queue** (`src/lib/sync/sync-queue.ts`): supports exactly one
  offline-capable write today — profile update
  (`src/features/profile/use-update-profile.ts`) — proving the architecture
  end-to-end without fabricating a second one. Real retry/backoff: items
  auto-retry up to 5 attempts, then move to a genuine `permanently-failed`
  terminal state that stops auto-retrying; the "Retry now" control in the
  connection panel is the only way to reset that state and try again.
- **Financial mutations stay online-only, always**: transaction assignment
  and bank connect/sync explicitly check connectivity and refuse to run
  offline ("You're offline. This action requires a server connection.")
  rather than queueing. They only ever show success after the backend
  itself confirms it.
- **Connectivity state machine** (`src/lib/sync/connectivity.ts`): five
  real states — `online` / `offline` / `degraded` / `syncing` /
  `sync-error` — derived from both `navigator.onLine` **and** an actual
  periodic `GET /health` request, not `navigator.onLine` alone. Surfaced in
  the topbar via `ConnectionStatus`, with a synchronization detail panel.

## Feature pages

Landing (public, with a React Three Fiber architectural hero + static
reduced-motion fallback), Login, Dashboard, Estates, Houses (list, search,
create, edit, detail drawer), Tenants (list, filter, create, edit, detail
drawer), Payments (read-only), Transactions (list + filters), Unmatched
Transactions (assignment workflow), Banking (accounts, masked sensitive
fields, connect, sync, statement retrieval), SMS (send + history), Reports
(Recharts against real `/reports/*` endpoints), Staff (list, create, edit,
deactivate), Profile (edit + change password, offline-capable), Settings
(honest "nothing to configure yet" placeholder — the backend exposes no
settings capability).

## Known contract gaps (backend, documented not faked)

1. `bank.controller.js` returns unmasked `accountNumberEncrypted` /
   `accountNumberHash` on `GET /bank/accounts`. Never rendered by the
   frontend, but should be fixed server-side to not send them at all.
2. Estate scoping for restricted STAFF — see above, the primary blocker.
3. No notifications endpoint — built as a frontend-only subsystem per spec.
4. No public house reference field — house detail stays drawer-based, no ID in the URL.
5. `GET /bank/accounts/:id/statement` returns only `{ stored, reconciled }`
   counts, not a transaction list — the Statement UI is honest about this
   and points the user to Transactions to see the actual records.
6. Transaction `matchStatus` is genuinely only `MATCHED` / `UNMATCHED` in
   the current backend model — no `PARTIAL` or `MANUAL_REVIEW` state
   exists to support, despite earlier concept documents mentioning them.
7. Staff update (`PATCH /users/:id`) only accepts `name`/`phone`/`estateIds`
   — role is not editable via this endpoint, and the edit form reflects that exactly.
8. Several list endpoints (`houses`, `tenants`, `transactions`, `bank/accounts`)
   don't accept an `estateId` query parameter at all — see estate-scoping
   section above.

## Not yet implemented

- Forgot/reset password (no backend route exists)
- Full manual responsive/accessibility pass in a real browser at real
  viewport sizes (code-level patterns — `useMediaQuery` breakpoints, MUI's
  built-in dialog/drawer accessibility, labeled fields — have been
  reviewed, not click-tested)
- IndexedDB read caching is wired into Estates, Houses, and the Dashboard
  KPI summary as proof of the pattern — not yet extended to every
  read-heavy screen (Tenants, Payments, Reports, SMS history, Staff list)
