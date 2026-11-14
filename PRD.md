# Tycoon Estates Frontend — Product Requirements

> Status: planning baseline  
> Audited: 2026-11-15  
> Frontend baseline: `jolla3/tycoon-frontend` `main` @ `dc34279bc8f8fcf98ffc9ce5029a7ea38c4f059d`  
> Backend contract baseline: `jolla3/tycoon-estates-backend` `main` @ `5aa05a2e81cb1ddc97f5507341a54a6b4a47ecb4`  
> Scope: frontend product and integration planning only. This document does not claim that the current screens have passed runtime acceptance.

## 1. Product definition

Tycoon Estates is a multi-tenant property and rent operations product. The frontend is the operational workspace used by property owners and their staff to manage estates, house types, houses, tenants, recurring charges, payments, bank reconciliation, communications, and management reporting. A separate platform-admin surface provisions and oversees client accounts.

The frontend is **not** a full tenant portal. Tenants do not currently have authenticated accounts or a self-service dashboard. The planned public `/pay` page is a narrow, token-based page where a tenant can submit M-PESA SMS confirmation text as evidence against a link issued by the property manager.

The backend owns authorization, tenancy and ledger rules, reconciliation, payment posting, provider credentials, and the canonical financial records. The frontend presents and initiates those operations; it must not reproduce their business rules or pretend that evidence is a settled payment.

## 2. Users and roles

| User | Primary need | Frontend behavior |
|---|---|---|
| `CLIENT_OWNER` | Run the property portfolio and control operations | Full client workspace, including management actions allowed by the backend |
| `CLIENT_ADMIN` | Operate the client account day to day | Operational management surfaces allowed by the backend |
| `STAFF` | Perform assigned operational work | Narrower actions; no assumption that a hidden button is a security boundary |
| `SUPER_ADMIN` | Provision and oversee client accounts | Separate platform-admin workspace |
| Tenant / payer | Submit M-PESA confirmation evidence using a received link | Public, limited `/pay` page; no account or dashboard |

The current UI permission helper treats role-based checks as a usability layer. Backend authorization remains authoritative. The UI must never rely on client-side filtering or hidden navigation to enforce estate or client isolation.

## 3. Product goals

1. **Portfolio operations:** create and maintain estates, house types, houses, tenants, and tenant moves.
2. **Billing and balances:** configure recurring house charges, generate monthly billing, and inspect house and tenant balances.
3. **Collections:** inspect posted payments, record permitted manual payments, review imported bank transactions, and assign unmatched bank transactions to houses.
4. **M-PESA evidence flow:** issue tenant submission links, accept SMS evidence through the public page, and let authorized operators review or resolve submissions.
5. **Communications:** preview, send, and review tenant SMS messages.
6. **Reporting:** provide dashboard, arrears, monthly, payment, bank-transaction, billed-vs-paid, SMS, and management reports.
7. **Platform operations:** let `SUPER_ADMIN` provision clients and inspect platform health, users, audit events, and subscriptions.

## 4. Non-goals

- No tenant login, tenant account, tenant dashboard, rent self-service portal, or tenant-facing payment initiation flow.
- No card checkout or browser-side M-PESA/Daraja integration.
- No direct browser access to provider credentials or bank APIs.
- No frontend authority to match, approve, settle, or post an M-PESA receipt by itself.
- No treating a pasted SMS, a bank transaction, or a provider receipt as interchangeable records.
- No offline queue for financial mutations, bank connection changes, payment posting, or transaction assignment.
- No invented settings, notification, password-reset, merchant-management, or Pull-query API.
- No UI for bank providers that the backend has not implemented and verified.

## 5. Core user journeys

### 5.1 Client portfolio setup

1. A platform administrator provisions a client and owner.
2. The client owner/admin creates estates.
3. The operator defines reusable house types and their defaults.
4. The operator creates houses and associates them with estates and optional house types.
5. The operator creates tenants and assigns them to houses.
6. The operator can move an existing tenant to another house using the backend move operation.

### 5.2 Monthly billing and collections

1. The operator configures house billing lines (rent, water, electricity, or other charges).
2. An authorized operator generates charges for a selected period and, where supported, an estate.
3. The frontend displays the backend's rent charges, balances, payment allocations, and history.
4. A permitted operator may record a manual payment.
5. The frontend displays the resulting payment and allocations only after the backend confirms the mutation.

Billing generation is an operational action, not a local calculation. The current frontend has a `billingApi.generate` wrapper, but no clear dedicated billing-generation screen was found in the checked route tree. The action must be surfaced intentionally and permission-gated rather than hidden in an unrelated page.

### 5.3 Bank connection and reconciliation

The supported lifecycle is two-stage:

1. Create or authorize a **bank connection** through `/bank/connections`.
2. Create one or more **bank accounts** under that connection using its `connectionId`.
3. List accounts, request synchronization, and request a statement date range.
4. Inspect imported bank transactions and assign unmatched transactions to houses when authorized.

A connection and an account are separate backend resources. The current Banking screen skips the connection stage and posts an account without `connectionId`; that is a contract defect to fix before considering the workflow usable. Provider credential fields and reauthorization behavior must follow the backend schema. Do not invent a generic OAuth or credential form.

The current statement endpoint returns stored/reconciled counts, not a statement transaction list. The UI must label that response honestly and direct operators to the Transactions screen for imported records.

### 5.4 Tenant M-PESA submission

1. An authorized operator opens a tenant workspace and inspects or issues a submission link.
2. The backend returns a one-time token and constructs a page URL of the form `{FRONTEND_URL}/pay#t={token}`.
3. The tenant opens the public `/pay` page. The page reads the token from the URL fragment in the browser and asks the tenant to paste the relevant M-PESA confirmation SMS text.
4. The page submits `{ token, text }` to `POST /api/v1/public/mpesa/submissions`.
5. The UI reports that the evidence was received, not that rent was paid or the receipt was posted.
6. An authorized operator reviews submissions using the authenticated collection endpoints and can take only the backend-supported actions: reject or retry matching, with the required reason code and audit trail.

The token is returned once by the link-issue operation; the frontend must not expect to retrieve it again from a later inspection call. The page URL is a **frontend page URL**, not an API endpoint.

### 5.5 Financial record distinctions

The UI must preserve these domain distinctions:

| Record | Meaning | Frontend treatment |
|---|---|---|
| `MpesaSubmission` | Tenant-provided SMS text and its processing/review state | Evidence queue; not a payment |
| `MpesaTransaction` | Canonical provider receipt ingested from Daraja C2B or Pull | Provider transaction; requires a read/list API before an inbox can be built |
| `BankTransaction` | Imported bank statement/webhook transaction | Bank reconciliation screen |
| `Payment` | Payment posted to the Tycoon rent ledger | Payment history and balance calculations |

`GET /transactions` returns bank transactions, not M-PESA receipts. `GET /payments` returns posted Payment records, not the raw M-PESA provider receipt inbox. `GET /mpesa-collection/submissions` returns SMS evidence submissions, not canonical receipts.

## 6. Required product surfaces

| Surface | Required capability | Current code status |
|---|---|---|
| Public landing and login | Product entry and cookie-session login | Present |
| Dashboard | Portfolio and financial summary, current alerts and recent payments | Present |
| Estates | List, create/update, workspace metrics | Present |
| House types | List, create/update/deactivate, workspace | Present |
| Houses | List, create/update, detail/workspace, billing configuration | Present; billing-config deactivate wrapper has a path mismatch |
| Tenants | List, create/update/move, tenant workspace, deposits | Present; no M-PESA link controls |
| Billing | Generate period charges and inspect house account | API wrapper exists; dedicated generation UI not identified |
| Payments | List posted payments and record manual payments | Present |
| Banking | Create/manage bank connections, register accounts, sync, inspect statement result | Partial; current connect form uses the wrong lifecycle |
| Transactions | List bank transactions and review/assign unmatched records | Present; estate filtering can be limited to the currently fetched page |
| M-PESA public page | Read token from fragment and submit SMS evidence | Missing |
| M-PESA operator tools | Issue/revoke tenant links and review/resolve SMS submissions | Backend routes exist; frontend wrapper and screen are missing |
| M-PESA receipt inbox | Browse canonical provider receipts | Blocked: no canonical receipt-list endpoint is exposed |
| SMS | Preview, send, broadcast, inspect history | Present |
| Reports | Dashboard, monthly, arrears, payments, bank, SMS, billed-vs-paid, management | Present |
| Staff | List, create, update permitted fields, activate/deactivate | Present |
| Settings | Current subscription and supported upgrade action | Present; generic settings capability does not exist |
| Platform administration | Overview, clients, users, audit, subscriptions, health | Present |
| Notifications | Server-backed notification center | Not a backend-backed product capability; do not build as if an API exists |
| Password recovery | Forgot/reset flow | Blocked: no backend route is exposed |

## 7. Functional requirements

- **FR-01 Session:** use the backend cookie session. Support login, logout, session restoration, and refresh through the existing API client. Do not store session credentials in local storage or IndexedDB.
- **FR-02 Role-aware UX:** show relevant actions based on the current user's role, while relying on backend authorization for enforcement.
- **FR-03 Portfolio:** support estate, house-type, house, and tenant lifecycle actions exposed by the backend.
- **FR-04 Billing:** call backend billing operations and display backend ledger results; never calculate authoritative balances in the browser.
- **FR-05 Payments:** display posted Payment records and show server-confirmed manual-payment allocations.
- **FR-06 Bank connections:** implement the backend connection lifecycle before account registration. Never submit account creation without the required `connectionId`.
- **FR-07 Bank reconciliation:** display BankTransaction records and submit assignment only when online and authorized.
- **FR-08 Tenant M-PESA page:** implement the public `/pay` page, fragment-token handling, SMS-text submission, neutral invalid-link states, and duplicate/error feedback.
- **FR-09 M-PESA operator flow:** add tenant link inspect/issue/revoke controls and a submission review queue using only the routes and resolution actions the backend supports.
- **FR-10 Canonical M-PESA receipts:** do not build a receipt inbox until the backend exposes a paginated, client/estate-scoped canonical receipt read endpoint and a documented DTO.
- **FR-11 Communications:** use the existing SMS preview/send/broadcast/history routes; respect each route's recipient and role rules.
- **FR-12 Reporting:** use the reporting endpoints and their date/period contracts. Mark unavailable fields as unavailable rather than synthesizing them.
- **FR-13 Platform admin:** keep platform routes in the SUPER_ADMIN-only route group.
- **FR-14 Feedback:** every mutation needs pending, success, and failure states. Financial success must be shown only after the backend confirms it.

## 8. Non-functional requirements

- **Tenant isolation and estate filtering:** never rely on frontend filtering as an authorization control. At the audited backend baseline, `clientContext` derives `req.estateFilter` from a requested `estateId` after checking that the user may access it; for restricted STAFF users with no requested estate, it falls back to their assigned `estateIds`. Houses currently sends the selected `estateId`; Tenants and Transactions do not. The Transactions page filters only the fetched page, so its selected-estate result can be incomplete. Pass supported estate filters to the backend and keep local filtering presentation-only.
- **Financial integrity:** use integer cents for amounts. Display formatting must not change stored values or allocation logic.
- **Authentication security:** HttpOnly session cookie, `credentials: include`, CSRF handling for mutating authenticated requests, and exact-origin credentialed CORS.
- **Public-link security:** do not place the one-time token in analytics events, application logs, local storage, error reports, or query-cache persistence. Read it only in the client page from the URL fragment and clear the fragment after the page has safely captured it, without breaking the submission.
- **Offline safety:** read-only cached data must be visibly stale. Only explicitly approved non-financial operations may enter the sync queue. Financial operations must require a live server response.
- **Accessibility and responsive behavior:** keyboard-accessible controls, labels and error association, focus management for dialogs, reduced-motion support, and real viewport testing.
- **Operational clarity:** distinguish provider configured, implemented, and live-verified states. A green UI status must not imply a live provider integration unless the backend reports that state.

## 9. Backend dependencies and product gaps

These must be tracked separately from frontend defects:

1. **Canonical M-PESA receipt listing:** no HTTP endpoint currently lists canonical `MpesaTransaction` records for the client UI. Required before a receipt inbox can be built.
2. **Merchant profile management:** no client-facing HTTP endpoints currently create, inspect, update, activate, or revoke M-PESA merchant profiles. Required before the frontend can manage merchant onboarding/configuration.
3. **Manual Pull query:** no HTTP route currently triggers or queries Daraja Pull on demand. The existing scheduled job is server-side and is surfaced, at most, as job health. Do not add a browser button that calls an invented route.
4. **Password reset:** no forgot/reset-password endpoint is exposed.
5. **Notifications:** no backend notifications endpoint is exposed.
6. **Generic application settings:** no backend settings API is exposed.

The existing M-PESA link, public submission, submission review, Daraja callback, and Pull-results ingestion paths are not the same as the missing receipt-list, merchant-management, or manual-Pull capabilities.

## 10. Acceptance criteria

### Core application
- [ ] Each listed screen calls only an endpoint that exists in the backend baseline.
- [ ] Client/estate scope is server-enforced; client-side filtering is clearly a display filter only.
- [ ] All financial writes show success only after backend confirmation.
- [ ] No financial mutation is queued while offline.
- [ ] Cached results are identity-scoped and clearly marked stale when served from cache.
- [ ] Forms validate against backend schemas and display backend validation errors without losing entered values.

### Banking
- [ ] The user creates or authorizes a connection before registering an account.
- [ ] Account creation includes the selected valid `connectionId`.
- [ ] Reauthorization and disconnect use connection IDs and show resulting status.
- [ ] Only backend-implemented providers are selectable.
- [ ] Statement UI accurately describes the stored/reconciled counts response.

### M-PESA
- [ ] Tenant link issue returns and displays the one-time URL once; link inspection does not pretend to recover the original token.
- [ ] The public `/pay` page works without a user session and reads the token from `#t=`.
- [ ] The public page submits the exact `{ token, text }` contract.
- [ ] The page says “submission received” or equivalent, never “payment completed” based only on SMS evidence.
- [ ] Invalid, revoked, malformed, or disabled links receive a neutral user-facing error.
- [ ] Operators can inspect submissions and perform only supported reject/retry-match actions with reasons.
- [ ] No receipt inbox is shown until a canonical M-PESA receipt read API exists.

### Verification
- [ ] TypeScript typecheck passes.
- [ ] ESLint passes.
- [ ] Next.js production build passes.
- [ ] Automated tests cover API-client behavior, route/page behavior, critical form validation, and financial/M-PESA distinctions.
- [ ] Browser acceptance tests cover public and authenticated flows at mobile and desktop viewport sizes.
- [ ] Backend integration tests confirm each frontend contract against the same backend commit or a documented compatible commit.

## 11. Risks and assumptions

- The backend commit recorded above is the contract baseline for this planning pass. Any backend merge after that commit requires a contract re-check.
- The existing README contains backend blocker descriptions that conflict with the backend source audit. It is not authoritative for endpoint behavior until reconciled.
- Existing frontend wrappers and screens have not all been exercised against the live deployment as part of this documentation task.
- The public M-PESA page receives a token in a URL fragment. Fragments are not sent in the HTTP request to Next.js; client-side extraction is required.
- Provider credentials and bank-connection setup payloads must be taken from the backend schema, not reverse-engineered into assumptions.

## 12. Plan critique — what breaks, what is overkill, what is missing

### What breaks if we take the naive route
- Treating `/pay` as an API endpoint or sending users to a page that does not exist.
- Treating an SMS submission as a payment, or treating `BankTransaction` as an M-PESA receipt.
- Creating bank accounts before connections and then wondering why the backend rejects the request.
- Using a charge type in a route that requires a billing configuration ID.
- Filtering only the first fetched page and presenting it as a complete estate result.
- Putting one-time tokens into persistent client storage, query caches, or analytics.
- Adding a Pull “Sync now” button without an actual backend route.

### What is overkill
- A separate tenant portal, tenant authentication system, or general-purpose workflow engine for this submission task.
- A second frontend financial ledger or browser-side payment-matching engine.
- A broad offline write queue. Offline support is deliberately narrow; money movement and reconciliation stay online-only.
- A new top-level navigation item for every operation. Tenant links belong in the tenant workspace; bank connections belong in Banking; submission review belongs in collections/payment operations.

### What was missing from the earlier plan
- A hard distinction between SMS evidence, provider receipts, bank transactions, and posted ledger payments.
- The bank connection resource lifecycle before bank-account registration.
- The one-time nature of the tenant link token and the fragment-based `/pay` URL contract.
- A clear separation between frontend defects and backend routes that do not exist.
- A source-of-truth baseline and explicit acceptance criteria so future implementation agents do not use stale README claims.

**Implementation rule:** update this PRD, `architecture.md`, and the endpoint/screen matrix together whenever a confirmed backend contract or product workflow changes. Do not start feature coding from an unreviewed chat summary.
