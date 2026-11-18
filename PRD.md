# Tycoon Estates Frontend — Product Requirements

> Status: planning baseline updated for Superadmin platform V2  
> Audited: 2026-11-15  
> Frontend code baseline: `jolla3/tycoon-frontend` `main` @ `dc34279bc8f8fcf98ffc9ce5029a7ea38c4f059d`  
> Documentation branch: `docs/frontend-planning-baseline`  
> Backend contract baseline: `jolla3/tycoon-estates-backend` `feat/superadmin-subscription-entitlements` @ `cc98900ba338f5b1e19bdcfe923e4dc45bc87745`  


> **Correction note (2026-11-18):** the backend contract baseline above was a feature branch. The authoritative backend is `main` @ `db7af3d49e827ede7f2cb9a7dbd88574c69224d9`. Where this document and `docs/branch-correction/*` differ (HouseType `estateId` direction, manual-payment tenancy identity, Superadmin response shapes, subscription presence), the branch-correction pack and backend source win. Historical text below is preserved.
> Backend status: platform and entitlement changes are implemented in source; behavioural verification is pending.  
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
7. **Platform operations:** give SUPER_ADMIN a distinct control plane to provision clients, explicitly assign Banking/M-PESA products, manage existing subscription plan/date/product fields, inspect entitlement inventory, diagnose individual clients, monitor platform-wide Banking and M-PESA integrations, and review users, audit events, subscriptions, and system health.

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

Billing generation is already wired in the current frontend: Estate Workspace → Billing tab calls billingApi.generate({ estateId }) and invalidates the estate workspace after success. Do not plan a duplicate generation page or describe the action as missing. The remaining gap is response typing: each estate result includes eligibleTenancies and partialPeriodExcluded, which the current BillingGenerateResult type omits. Generation is server-side, owner/admin-authorized, and online-only.

### 5.3 Bank connection and reconciliation

The supported lifecycle is two-stage:

1. Create or authorize a **bank connection** through `/bank/connections`.
2. Create one or more **bank accounts** under that connection using its `connectionId`.
3. List accounts, request synchronization, and request a statement date range.
4. Inspect imported bank transactions and assign unmatched transactions to houses when authorized.

A connection and an account are separate backend resources. The current Banking screen skips the connection stage and posts an account without `connectionId`; that is a contract defect to fix before considering the workflow usable. Provider credential fields and reauthorization behavior must follow the backend schema. Do not invent a generic OAuth or credential form.

The current statement endpoint returns stored/reconciled counts, not a statement transaction list. The UI must label that response honestly and direct operators to the Transactions screen for imported records.

### 5.4 M-PESA SMS submission feature (new frontend feature)

M-PESA is not wired into the current frontend. Treat this as a new feature with one narrow tenant-facing surface, not as a tenant portal.

**Tenant-facing experience: exactly one public page.** An authorized operator issues a tenant-specific submission link from the authenticated tenant workspace. The backend builds a page URL in the form FRONTEND_URL/pay#t=one-time-token. The tenant opens that single /pay page, pastes the M-PESA confirmation SMS text into one form, and submits it. The page has no tenant dashboard, tenant account, payment checkout, receipt history, rent balance, or general navigation.

The public page submits the exact JSON body { token, text } to POST /api/v1/public/mpesa/submissions. A 202 response means evidence was received for processing only. It must never be presented as a completed payment, confirmed receipt, rent allocation, or ledger posting.

**Authenticated operator experience:** inspect link state; issue or rotate; copy/share the one-time URL; or revoke. The issue response contains { link, token }; the raw token is returned once and cannot be recovered from inspection. Keep it only in transient component memory for copy/share. The backend may enqueue its protected onboarding SMS when prerequisites exist, but the issue response does not include a delivery result. Never claim SMS sent/delivered based only on link issuance. Operators review submissions in a focused collections queue and may only REJECT or RETRY_MATCH with a required reason code. No approve/force-match action exists.

The public URL is a frontend page URL, not an API endpoint. The token is in the URL fragment, which is not sent to Next.js. Read it client-side, do not persist/log/track it, and clear it from the visible URL after safe capture where possible.

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
| House types | Estate-owned list, create/update/deactivate, tenancy-aware workspace | Present but creation contract is broken: the UI sends estateId, but the backend create validator strips it (backend fix required); workspace DTO/UI are stale |
| Houses | List, create/update, detail/workspace, billing configuration | Present; billing-config deactivate wrapper has a path mismatch |
| Tenants | List, create/update/move, tenant workspace, deposits | Present; no M-PESA link controls |
| Billing | Generate period charges and inspect house account | Generation is already wired from Estate Workspace → Billing tab; response type is incomplete and house-account rendering/types are stale |
| Payments | List posted payments and record manual payments | Present |
| Banking | Create/manage bank connections, register accounts, sync, inspect statement result | Partial; current connect form uses the wrong lifecycle |
| Transactions | List bank transactions and review/assign unmatched records | Present; estate filtering can be limited to the currently fetched page |
| M-PESA public page | One public page for a tenant to paste and submit M-PESA SMS evidence using a one-time fragment token | New feature; no route, page, API wrapper, or form exists |
| M-PESA operator controls | Inspect/issue/rotate/revoke a tenant link from the authenticated tenant workspace | New feature; backend routes exist, frontend is entirely missing |
| M-PESA evidence review | Review SMS submissions and perform only supported reject/retry-match actions | New feature; backend routes exist, frontend is entirely missing |
| M-PESA receipt inbox | Browse canonical provider receipts | Blocked: no canonical receipt-list endpoint is exposed |
| SMS | Preview, send, broadcast, inspect history | Present |
| Reports | Dashboard, monthly, arrears, payments, bank, SMS, billed-vs-paid, management | Present |
| Staff | List, create, update permitted fields, activate/deactivate | Present |
| Settings | Read-only current subscription and assigned products | Existing subscription view may be retained; self-service upgrade now returns 403 and must be removed from the customer UI |
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
- **FR-08 Tenant M-PESA page:** build exactly one standalone public /pay page. It reads the one-time token from #t=, accepts pasted SMS text, and submits evidence only.
- **FR-09 M-PESA operator flow:** add authenticated link inspect/issue/rotate/revoke controls to the existing tenant workspace and a focused submission-evidence review queue. Do not create a tenant portal or additional tenant-facing pages.
- **FR-15 M-PESA delivery truthfulness:** never claim onboarding SMS delivery because link issuance exposes no delivery status; never claim an SMS submission is a posted payment.
- **FR-10 Canonical M-PESA receipts:** do not build a receipt inbox until the backend exposes a paginated, client/estate-scoped canonical receipt read endpoint and a documented DTO.
- **FR-11 Communications:** use the existing SMS preview/send/broadcast/history routes; respect each route's recipient and role rules.
- **FR-12 Reporting:** use the reporting endpoints and their date/period contracts. Mark unavailable fields as unavailable rather than synthesizing them.
- **FR-13 Platform admin:** keep platform routes in the SUPER_ADMIN-only route group. Provide platform-wide and explicitly selected-client views without impersonation; expose product assignment, entitlement inventory, client diagnostics and read-only integration monitoring only through documented backend contracts.
- **FR-16 Entitlement UX:** show 403 PRODUCT_NOT_ENTITLED with the backend product and reason; do not infer access from plan, subscription status/dates, bank connections or merchant profiles.
- **FR-17 Subscription authority:** the client subscription view is read-only. Remove the self-service upgrade action because POST /subscription/upgrade returns 403; platform administrators manage plan, products and dates.
- **FR-18 Platform health evidence:** distinguish configured, implemented, provider-verified and operational evidence. The health endpoint makes no live provider calls; do not use a green state to imply live readiness.
- **FR-14 Feedback:** every mutation needs pending, success, and failure states. Financial success must be shown only after the backend confirms it.

## 8. Non-functional requirements

- **Tenant isolation and estate filtering:** never rely on frontend filtering as an authorization control. At the audited backend baseline, `clientContext` derives `req.estateFilter` from a requested `estateId` after checking that the user may access it; for restricted STAFF users with no requested estate, it falls back to their assigned `estateIds`. Houses currently sends the selected `estateId`; Tenants and Transactions do not. The Transactions page filters only the fetched page, so its selected-estate result can be incomplete. Pass supported estate filters to the backend and keep local filtering presentation-only.
- **Financial integrity:** use integer cents for amounts. Display formatting must not change stored values or allocation logic. An unknown/unverified ledger balance is not zero: preserve null, historicalCoverage, verifiedFullObligation, and balanceSource; label it unavailable/unverified rather than displaying KSh 0.
- **Tenancy-aware balances:** distinguish active-tenancy liability from house-wide historical exposure, unattributed legacy balances, and closed-tenancy arrears. Never assign historical house debt to the current tenant in the UI.
- **Authentication security:** HttpOnly session cookie, `credentials: include`, CSRF handling for mutating authenticated requests, and exact-origin credentialed CORS.
- **Public-link security:** do not place the one-time token or pasted SMS text in analytics events, application logs, local storage, IndexedDB, error reports, or query-cache persistence. Read the token from the URL fragment and hold it in memory. Clear it from the visible URL after safe capture where possible. Clear pasted text after accepted submission. Public submission does not depend on a logged-in session or CSRF token.
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

## 13. Detailed frontend/backend contract audit (2026-11-15)

This section records field-level findings from the checked source revisions and supersedes any earlier conflicting statement.

### 13.1 Request and workflow mismatches

| Feature | Backend contract | Frontend gap and resolution |
|---|---|---|
| BankConnection create | POST /bank/connections requires provider and credentialMaterial object; displayName optional | No wrapper/UI. Add separate BankConnection API and lifecycle before account registration |
| BankAccount create | POST /bank/accounts requires estateId, connectionId, provider, accountNumber, accountName; currency and allowEstateReassignment optional | Current input omits connectionId; select a valid active connection first |
| HouseType create | Service requires estateId; route createSchema omits it and validation strips it | Add estateId to backend schema; the frontend already requires an estate selection and sends it |
| HouseType plan update | Service supports effectiveFromPeriod/changeReason; current update schema omits them | Align backend validation and frontend versioned-plan form |
| Billing config deactivate | URL requires configId | Wrapper uses chargeType; pass selected config _id |
| Deposit pay/deduct | Both require Idempotency-Key header; route validation strips body extras | Wrappers send no header and API client has no typed header option; add stable per-intent key support |
| Tenant PATCH | name/phone/status/moveOutDate only; move uses dedicated route | Frontend update type permits houseId; remove from PATCH type |
| House PATCH | estateId is excluded | Frontend update type permits estateId; remove from update type |

### 13.2 Response and field drift

| Feature | Backend truth | Frontend correction |
|---|---|---|
| BankConnection | Safe DTO: id/provider/displayName/status/credentialVersion/safe authMeta/timestamps; no credentials returned | Model safe fields only; never model secrets, tokens or credential material |
| BankAccount | Includes connectionId, validationStatus, lastValidatedAt, entitlements poll/statement/balance/webhookIngest | Add fields; distinguish connection auth from account validation and gate actions by entitlements |
| BankTransaction | matchStatus includes MATCHED/UNMATCHED/PARTIAL/MANUAL_REVIEW; processingState separately supports RECEIVED/CLAIMED/POSTED/FAILED_RETRYABLE/FAILED_TERMINAL/MANUAL_REVIEW | Frontend models only MATCHED/UNMATCHED. Backend list/unmatched return raw docs with processingClaimToken/rawPayload; backend must project a safe DTO |
| Tenant financials | outstandingCents may be null; knownArrearsCents, historicalCoverage, verifiedFullObligation, balanceSource, overdueCents and oldestUnpaidPeriod are returned | Frontend treats it as number and renders outstandingCents ?? 0, converting unknown to KSh 0 |
| House account | Includes currentTenancyId, ledger, verification metadata, currentTenancyBalanceCents, currentTenancyBalanceVerified, historicalUnattributedCents and balanceSource | Frontend omits them and flattens house-wide historic exposure into one current liability |
| HouseType workspace | Separates currentTenancy, historicalTenancyFinancials, unattributedLegacyFinancials, orphanedTenancyFinancials and occupancy conflict | Frontend expects obsolete flat tenant/monthlyRent/period-charge fields and occupancyRatePercent |
| HouseBillingConfig | Includes _id/effectiveFrom/effectiveTo/frequency | Frontend omits effectiveTo/frequency; deactivate by _id |
| Payment | Includes origin BANK/MANUAL/MPESA/CREDIT, status CONFIRMED/REVERSED and tenancyId | Frontend omits origin/status; list may contain reversed rows |
| Deposit GET | Returns tenant, deposit, activeTenancyId and balance | Frontend models only deposit |
| Billing generation | Per-estate results include eligibleTenancies and partialPeriodExcluded | UI already exists; result type omits these fields |

### 13.3 Filtering and cache defects

- Transactions omits selected estateId and filters after pagination. Send estateId and include it in React Query and identity-scoped cache keys.
- Unmatched assignment loads up to 200 houses and filters locally. Send transaction.estateId to housesApi.list and include it in the cache key.
- Tenants list omits estateId although clientContext supports it. Add optional estateId; backend list is currently an unpaginated array.
- HouseType list supports estateId/includeInactive but wrapper exposes includeInactive only. Add estate query support.
- Houses already sends estateId; remove stale comments, preserve backend filtering.
- Every list filter (estate, match status, submission state, date range, pagination) must be represented in query/cache keys.

### 13.4 Contracts already aligned or present

- Billing generation is wired from Estate Workspace → Billing tab; do not duplicate it.
- Manual payment create body aligns: houseId, amountCents, optional paymentDate, paymentReference, period and tenantId. Response contains payment, allocations and reused.
- SMS send, broadcast, preview and history broadly align. Queued means queued, not delivered.
- Subscription and platform wrappers match their route families. Staff PATCH supports name/phone/estateIds, not role changes.
- Tenant move is already a dedicated endpoint; keep it separate from tenant profile PATCH.

### 13.5 M-PESA: new frontend feature, one public tenant page

The backend contract exists for link issuance and SMS evidence processing, but no M-PESA frontend capability is implemented. Build a small feature area, not a tenant portal.

**Public route:** src/app/(public)/pay/page.tsx resolves to exactly one browser page, /pay. It contains a short explanation, one SMS text field, one submit action, and pending/success/error states. It has no tenant account, login, dashboard, balance, checkout, payment history, receipt inbox, or extra public routes.

**Operator surfaces:** add link controls to the existing tenant workspace and a submission review queue under authenticated Payments/Collections.

Suggested feature boundaries:
- src/lib/api/mpesa-collection.ts: authenticated link/account/payments/submission-review wrappers.
- src/lib/api/mpesa-public.ts: public SMS submission wrapper.
- src/features/mpesa/public-submission: the single public page form and state handling.
- src/features/mpesa/tenant-link: inspect/issue/rotate/revoke/copy behavior embedded in tenant workspace.
- src/features/mpesa/submissions: list/filter/review UI.

| Route | Request | Response/behavior |
|---|---|---|
| GET /mpesa-collection/tenants/:tenantId/account | No body; authenticated scope | Active/closed tenancy balances, combined outstanding, tenant credit, link status/version, pending submissions |
| GET /mpesa-collection/tenants/:tenantId/payments | Optional limit | { payments: [...] }; payment id, origin, tenancy, amount, date, status, receipt group ID and allocations |
| GET /mpesa-collection/tenants/:tenantId/link | No body | Safe link view or null; never returns prior token |
| POST /mpesa-collection/tenants/:tenantId/link | No body | { link, token }; raw token once; issuing may rotate/invalidate prior token |
| POST /mpesa-collection/tenants/:tenantId/link/revoke | No body | Revokes link and returns safe view |
| GET /mpesa-collection/submissions | Optional state and limit; default reviewable states | { submissions: [...] }; tenant/estate, state/reason, amount, receipt number, created time and linked provider transaction ID |
| POST /mpesa-collection/submissions/:id/resolve | { action, reasonCode }; REJECT or RETRY_MATCH; reason codes DUPLICATE, WRONG_TENANT, NOT_A_RENT_PAYMENT, UNREADABLE, OTHER_DOCUMENTED | Returns id/state and audits action; no approve/force-match |
| POST /public/mpesa/submissions | Exact { token, text }; JSON body limit 4 KB | 202 { received:true } accepted; neutral 404 invalid/unavailable link; 400/413 invalid/oversized; 503 unavailable |

The public endpoint is outside authenticated cookie/CSRF middleware. Add an explicit unauthenticated request method to the shared API boundary (omit session cookies and CSRF header); do not use page-level fetch.

**Token and notification rules:** raw token is returned only by issue/rotation; inspection returns metadata only. Build /pay#t=token using the configured app origin, which must match backend FRONTEND_URL. Keep token transient in memory; never store it in TanStack Query, IndexedDB, local storage, analytics, logs or error reports. The backend may queue protected onboarding SMS, but issue response exposes no delivery status: never claim SMS sent/delivered or build a duplicate sender. Do not persist pasted SMS text. A 202 means received for processing, never rent paid. If link.operational is false, explain prerequisites are not operational. SUPER_ADMIN requests need explicit clientId.

### 13.6 Backend gaps: do not invent UI

No canonical MpesaTransaction list/detail, merchant-profile management or manual Daraja Pull endpoint exists. Password reset, notifications and generic settings APIs are also absent. Provider webhooks and scheduled Pull remain backend-only.

### 13.7 Backend corrections needed

1. Add estateId to HouseType create validation; service already requires it. Add effectiveFromPeriod/changeReason to plan-update validation while keeping estate ownership immutable.
2. Add a safe BankTransaction response DTO for list/unmatched; never serialize claim tokens or raw provider payloads to browsers.
3. Preserve nullable and tenancy-aware tenant/house financial semantics in frontend DTOs.
4. Preserve client/estate/role middleware as the security boundary.

### 13.8 Implementation priorities

P0: deposit idempotency header; HouseType create schema and estate selection; BankConnection-to-BankAccount lifecycle; safe BankTransaction DTO; unknown and tenancy-aware balances.

P1: HouseType workspace rebuild; Tenant/House/Payment/BankAccount DTO corrections; estate filter/cache-key plumbing; billing-config ID/effective dates; new M-PESA public page, operator link controls and evidence review queue.

P2: canonical receipt inbox, merchant management and manual Pull only after backend endpoints exist.


## 14. Superadmin platform V2 requirements (backend branch 2026-11-15)

This section supplements the earlier platform requirements and supersedes older statements that the console only lists clients, users, subscriptions, audit and health.

### 14.1 Product boundary and navigation

Keep the Superadmin console inside the existing Next.js application and existing platform route group. It is a distinct SUPER_ADMIN control plane, not a second application and not the customer property workspace.

Required navigation: Overview; Clients; Entitlements; Integrations (Banking and M-PESA); Users; Subscriptions; Audit; System Health.

The client workspace is a Manager view of a selected client while retaining the real SUPER_ADMIN actor. It is not impersonation. Diagnostics must work for inactive clients through the dedicated platform endpoint; do not weaken clientContext or normal client authorization.

### 14.2 Client directory and provisioning

GET /api/v1/platform/clients supports page, limit, search, product (BANKING/MPESA/BOTH/NONE), plan, subscriptionStatus, hasSubscription, bankProvider, bankConnectionStatus, bankAccountConnectionStatus, bankValidationStatus, mpesaState, callbackCapability, pullCapability, c2bRegistrationState, pullRegistrationState and isActive.

Rows expose safe client/owner identity, estate/house counts, subscription presence and fields, assigned products, and Banking/M-PESA summaries. Product entitlement and integration readiness are separate dimensions.

POST /api/v1/platform/clients provisions Client, initial CLIENT_OWNER and Subscription atomically. Its strict body supports clientName, ownerName, email, optional phone, password, optional plan (trial/basic/pro), optional products (BANKING/MPESA), optional startDate and optional endDate. products defaults to []. The form must let the Manager choose Banking, M-PESA, both or neither. An empty products array means no entitlement to either product. Never return or redisplay the password.

GET /api/v1/platform/clients/:clientId returns safe owner fields, subscription presence/id/plan/status/dates/products/actor refs, portfolio counts, Banking summary and safe M-PESA profile/ingestion summary.

### 14.3 Subscription and product assignment

PATCH /api/v1/platform/clients/:clientId/subscription updates an existing subscription. Its strict partial body accepts plan (trial/basic/pro), products (BANKING/MPESA), startDate and endDate (date or null to clear). It rejects empty bodies, unknown fields and status changes. Duplicate products and endDate before startDate are rejected. The update and required audit are transactional.

This route does not create a missing subscription. Show a distinct missing-subscription state and do not offer an edit form that will fail. Backend Manager creation/repair support or a controlled migration is required.

Subscription status and start/end dates do not currently participate in the entitlement decision. Do not invent automatic expiry.

### 14.4 Entitlement inventory

GET /api/v1/platform/entitlement-inventory supports page, limit, product (BANKING/MPESA/BOTH/NONE) and isActive. It includes clients without subscriptions. Rows contain clientId, name, isActive, hasSubscription, plan, status, products, assignedByUserId, lastChangedByUserId and updatedAt.

Distinguish no subscription, an existing subscription with products: [], Banking only, M-PESA only, and both. NONE includes no-subscription clients and clients whose subscription has an empty products array. Use the response as source of truth.

### 14.5 Client diagnostics

GET /api/v1/platform/clients/:clientId/diagnostics is read-only and supports inactive clients. It returns client detail, operationalAccess (clientActive, ordinaryOperationsBlocked, and per-product entitled/reason), up to 25 safe audit records and job outcomes. Job outcomes include job name, last run, outcome, finish time and per-client counts where reported.

Diagnostics explain operational state. They are not impersonation, remote shell or mutation tools.

### 14.6 Platform-wide integration monitoring

GET /api/v1/platform/integrations/banking returns one row per BankConnection with safe client identity, provider/connection status, reauthorization indication, safe auth evidence and BankAccount rollups. Filters: page, limit, clientId, clientIsActive, provider, status, validationStatus and accountConnectionStatus. Rollups include account count, validation/connection distributions, poll/statement/balance/webhookIngest capability counts and latest sync evidence.

GET /api/v1/platform/integrations/mpesa returns merchant-profile rows with safe client identity, merchant type/shortcode, operational state, independent callback and Pull capabilities, C2B/Pull registration states, ingestion evidence and backend-derived blockers. Filters: page, limit, clientId, clientIsActive, operationalState, callbackCapability, pullCapability, c2bRegistrationState and pullRegistrationState.

Both endpoints are read-only. Never return credential references, encrypted credentials/account values, access tokens, secrets or raw provider payloads. Do not add reauthorize, disconnect, merchant CRUD or manual Pull actions to these monitoring pages.

### 14.7 Overview and health

GET /api/v1/platform/overview retains legacy KPIs and adds productAssignments, bankingIntegration and mpesaIntegration distributions. Product assignment comes from Subscription.products; integration summaries come from integration records. Do not merge these metrics.

GET /api/v1/platform/health returns generatedAt and nested application, mongo, redis, scheduler, banking, mpesa and sms objects. The endpoint makes no live provider calls. Configuration does not prove operational readiness. Co-op adapter/configuration is not provider verification; KCB/Equity/NCBA are not implemented; Daraja platform credential presence is not per-Till authorization; SMS provider acceptance is not handset delivery.

The old frontend PlatformHealth type/page expects flat strings for application/Mongo/Redis. The new response is nested objects; rebuild the DTO and health page before connecting it to this contract.

### 14.8 Entitlement behavior in the client workspace

The backend gate checks that Client exists, isActive is true and Subscription.products contains the requested product. It does not infer access from plan, subscription status/dates, payment history, bank connections or merchant profiles. Denial is 403 PRODUCT_NOT_ENTITLED with product and reason.

BANKING gates /bank/*, /bank/connections/* and /transactions/*. MPESA gates /mpesa-collection/*. Banking, Transactions and M-PESA operator screens must render a product-specific blocked state using the backend reason. Rent billing, manual payments, deposits, standard SMS and public/provider ingress are not gated by these product middleware rules.

POST /api/v1/subscription/upgrade stays mounted but always returns 403 FORBIDDEN. Remove the client-facing upgrade action; show current plan/products read-only. Subscription changes are managed by Superadmin.

### 14.9 Rollout risks and backend gaps

- Existing and newly created default subscriptions can have products: []. Existing clients remain blocked from Banking/M-PESA until the Manager explicitly assigns products. Rollout requires a reviewed assignment/migration plan.
- The subscription PATCH route cannot create a missing subscription.
- No automatic entitlement expiry from status or dates exists.
- Canonical MpesaTransaction list/detail, merchant-profile CRUD and manual Daraja Pull HTTP endpoints remain absent.
- Platform integration pages are monitoring-only; provider callbacks and scheduled jobs remain backend-only.
- Backend changes are implemented in source on feat/superadmin-subscription-entitlements at cc98900ba338f5b1e19bdcfe923e4dc45bc87745, but behavioural verification is pending.

### 14.10 Acceptance criteria

- [ ] Navigation exposes Overview, Clients, Entitlements, Integrations, Users, Subscriptions, Audit and System Health.
- [ ] Provisioning supports explicit products and subscription dates.
- [ ] Directory filters match the backend query contract and are part of query keys.
- [ ] Client detail distinguishes missing subscription from empty products.
- [ ] Entitlement inventory includes clients without subscriptions.
- [ ] Integrations screens are read-only and never expose secrets.
- [ ] Diagnostics works for inactive clients without impersonation.
- [ ] Overview separates product assignment from integration readiness.
- [ ] Health uses nested DTOs and never presents configuration as live verification.
- [ ] Client Banking, Transactions and M-PESA screens handle PRODUCT_NOT_ENTITLED.
- [ ] Customer self-service upgrade is removed.
- [ ] Verification is performed against the corresponding backend branch and recorded honestly.


## Financial-correctness audit addendum

Unknown, null and unverified financial values render as "Not available"; verified zeros render as zeros; no aggregate stands in for another. Dashboard, reports, payments, estate/house/tenant workspaces follow this rule (see docs/FRONTEND_ENDPOINT_SCREEN_MATRIX.md section 18). Status: IMPLEMENTED. Unresolved BLOCKED BY BACKEND item: `GET /transactions` and `GET /transactions/unmatched` return raw BankTransaction documents including `processingClaimToken` and `rawPayload` (verified: no projection in `transaction.service.js`); a safe DTO is required before bank transaction browsing can be called secure.

## Implementation status

The frontend now implements the M-PESA public `/pay` page, operator link panel and review queue, the bank connection lifecycle, estate-scoped server-side filtering and the Platform V2 screens. The authoritative per-item status (IMPLEMENTED / BLOCKED BY BACKEND / NOT IMPLEMENTED), files and blockers are in section 19 of `docs/FRONTEND_ENDPOINT_SCREEN_MATRIX.md`. Nothing was exercised against a live backend.
