# Tycoon Estates Frontend

The web application for the Tycoon Estates property-management platform. This repository contains the browser-facing product: the authenticated estate-management workspace, the platform Superadmin console, and a small set of public pages.

The frontend is designed for property owners, administrators and authorized staff who manage estates, houses, tenancies, billing and payment operations. It is **not a tenant self-service portal**. The public M-PESA page is a narrow submission page for a tenant or payer to send an M-PESA confirmation message using a personal link; it does not display rent balances or confirm that a payment has been posted.

The visible product name is centralized in `src/config/app.ts`. It currently displays **Property Management**; the repository and companion API are part of the Tycoon Estates project.

**Companion API:** [jolla3/tycoon-estates-backend](https://github.com/jolla3/tycoon-estates-backend)

---

## Product areas

### Public pages

| Area | Purpose |
|---|---|
| Landing page | Public product entry page |
| Login | Authenticated user sign-in |
| Payment-message submission (`/pay`) | Accepts an M-PESA confirmation message through a personal link; submission is evidence awaiting review, not payment confirmation |
| Privacy and Terms | Public policy pages |

The public payment-message page intentionally has no tenant login, tenant dashboard, balance display or payment-posting controls.

### Estate workspace

The authenticated workspace contains the following product areas:

| Area | Purpose |
|---|---|
| Dashboard | Portfolio and rent-management overview |
| Estates | Estate administration |
| House Types | House categories and configured billing plans |
| Houses | House inventory and occupancy |
| Tenants | Tenant records and tenancy-related workflows |
| Payments | Payment records and related actions exposed by the API |
| Transactions | Incoming transaction history and review workflows |
| Banking | Bank accounts, connections and statement/transaction views exposed by the backend |
| SMS | Tenant messaging, campaigns and message history |
| Reports | Operational reporting using the current reporting API |
| Staff | Client staff administration |
| Profile | Current user profile and password management |
| Settings | Current placeholder where no corresponding settings capability is exposed by the backend |

### Platform control plane

The separate `/platform` area provides Superadmin-facing screens for platform operations, including:

- Clients and client users
- Subscriptions and entitlements
- Integrations
- Audit history
- Platform health

The UI only presents actions supported by the backend API. Hiding a control in the browser is not an authorization boundary; backend middleware remains authoritative.

---

## Technology stack

- **Next.js 14.2 / App Router**
- **React 18**
- **TypeScript** with strict compiler settings
- **MUI 6** for components, theme and layout
- **TanStack Query 5** for server state and mutations
- **IndexedDB** through `idb` for approved offline snapshots
- **Recharts** for charts
- **Lucide React** for icons
- **Motion** for interface animation
- **Three.js / React Three Fiber** for the landing-page visual only
- **Vitest** for frontend unit tests

Use the existing MUI, Lucide and Motion conventions. Do not introduce a second component, icon, styling or animation system without an explicit architecture decision.

---

## Architecture and integration

### API boundary

All API requests go through the shared client in `src/lib/api/client.ts` and the domain modules under `src/lib/api/`.

- Pages and components should use the domain API modules, not call `fetch()` or Axios directly.
- The backend API is versioned under `/api/v1`.
- Authenticated requests include browser-managed cookies and use the centralized CSRF handling.
- The public M-PESA submission client is deliberately separate: it sends only to the public submission endpoint and omits session credentials and CSRF headers.
- Keep request/response types aligned with the backend contract. Do not invent frontend-only financial states or calculations.

### Authentication and security

- Authentication uses an **HttpOnly session cookie** managed by the browser.
- The frontend does not read, store or write session tokens in localStorage, sessionStorage or IndexedDB.
- Mutating authenticated requests attach the CSRF token through the shared API client.
- Requests include credentials so the browser can send the session cookie.
- Financial mutations remain online-only. A client-side success state must follow a successful backend response.

### Server state and offline behavior

- TanStack Query owns remote server state.
- IndexedDB is used only for explicitly approved cached snapshots. A cached result must be visibly identified as cached/stale and must not be presented as live data.
- The current offline write queue supports profile updates only.
- Payment, transaction, deposit and banking mutations must not be queued for later execution while offline.
- Cache invalidation must continue to respect authenticated identity changes.

### Financial boundaries

- A Tenant and a Tenancy are different identities. Workflows that settle a tenancy-specific amount must use the exact Tenancy context.
- A provider receipt is not automatically a posted G3 Payment.
- Payment allocation, tenant credit and a new cash receipt are different financial facts.
- The frontend displays backend-owned financial decisions; it must not independently authorize posting or derive a more authoritative balance than the API provides.
- M-PESA SMS evidence is untrusted evidence until the backend completes the applicable verification, attribution and posting gates.

---

## Local development

### Requirements

- Node.js compatible with the repository's Next.js 14 toolchain
- npm
- A running [Tycoon Estates backend](https://github.com/jolla3/tycoon-estates-backend), with MongoDB and Redis configured

### Install

```bash
npm ci
```

### Configure the API URL

This repository currently has no committed frontend `.env.example`. Create `.env.local` in the repository root.

For a direct local API connection:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

Then run:

```bash
npm run dev
```

The frontend is normally available at `http://localhost:3000`.

#### Optional same-origin API proxy

The Next.js configuration supports a same-origin rewrite. Use this when you want the browser to call the frontend origin and let the Next.js server proxy API requests:

```dotenv
NEXT_PUBLIC_API_BASE_URL=/api/v1
BACKEND_URL=http://localhost:4000
```

`BACKEND_URL` is server-side configuration for the rewrite and must be the backend origin without an `/api/v1` suffix. Do not expose backend secrets through `NEXT_PUBLIC_*` variables.

#### Direct cross-origin API

When the browser calls an absolute backend URL, configure the backend CORS allow-list with the exact frontend origin and credential support. Credentialed requests cannot use `Access-Control-Allow-Origin: *`.

---

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run the configured Next.js lint command |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm test` | Run Vitest |

Run the relevant checks before proposing a deployment. A command existing in `package.json` is not evidence that it has passed on a particular branch or commit.

---

## Reports V1 status

The current Reports screen is built on the existing reporting API. The owner-approved Reports V1 scope is documented but **has not yet been implemented as a complete experience**.

The approved sections are:

1. Overview
2. Revenue & Collections
3. Arrears
4. Occupancy
5. M-PESA Collections

The reporting implementation must distinguish gross receipts, charge allocations, tenant-credit applications and outstanding charges. M-PESA SMS submissions, canonical provider receipts and posted payments must remain separate. Expense management, profit and loss, forecasting, advanced analytics, PDF exports and standalone SMS analytics are deferred.

See the [Reports V1 product requirements](PRD.md), [frontend architecture](architecture.md) and [architecture handoff](architecture-summary.md), including their Reports V1 addenda.

---

## Repository map

```text
src/
  app/
    (public)/       Public landing, login, policy and payment-message pages
    (dashboard)/    Authenticated client workspace
    (platform)/     Superadmin control plane
  components/       Shared UI components
  config/           Centralized application configuration
  features/         Feature-specific UI and workflows
  hooks/             Shared React hooks
  lib/
    api/             Shared API client and domain API modules
    permissions/     Frontend capability/role presentation helpers
    storage/         IndexedDB cache
    sync/            Connectivity and offline profile-update queue
  types/             Shared frontend API and domain types
```

The exact implementation and directory names on the checked-out branch take precedence over this abbreviated map.

---

## Project documentation

| Document | What it covers |
|---|---|
| [PRD.md](PRD.md) | Frontend product requirements and cross-domain decisions |
| [architecture.md](architecture.md) | Detailed frontend architecture and API boundaries |
| [architecture-summary.md](architecture-summary.md) | Short engineering handoff and current implementation constraints |
| [Reports V1 backend PRD](https://github.com/jolla3/tycoon-estates-backend/blob/docs/reports-v1-20261126/docs/REPORTS_V1_PRD.md) | Paired backend reporting requirements |
| [Reports V1 backend architecture](https://github.com/jolla3/tycoon-estates-backend/blob/docs/reports-v1-20261126/docs/REPORTS_V1_ARCHITECTURE.md) | Reporting aggregation, data-source and API contracts |

---

## Implementation and release discipline

- Treat source code as evidence of what is implemented; a PRD or architecture document may describe approved target behavior that is not implemented yet.
- Provider registration, technical capability, operational readiness and permission to post financial transactions are separate states.
- Do not label a bank or M-PESA integration operational merely because its screen or adapter exists.
- Preserve cookie-session and CSRF behavior. Do not add browser token storage.
- Keep financial mutations online-only and keep public payment-message submission isolated from authenticated APIs.
- Verify the matching backend branch and API contract before implementing a frontend feature.
