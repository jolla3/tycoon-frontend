# Frontend Endpoint-to-Screen Matrix

> Audited: 2026-11-15  
> Frontend source baseline: `jolla3/tycoon-frontend` `main` @ `dc34279bc8f8fcf98ffc9ce5029a7ea38c4f059d`  
> Backend API baseline: `jolla3/tycoon-estates-backend` `feat/superadmin-subscription-entitlements` @ `cc98900ba338f5b1e19bdcfe923e4dc45bc87745`  
> Backend status: platform/entitlement changes are implemented in source; behavioural verification is pending.  
> API base prefix: `/api/v1`  
> This is a code-level mapping, not a claim that the live deployment was exercised.

## 1. Status legend

| Status | Meaning |
|---|---|
| **Wired** | A frontend wrapper and a corresponding screen/use site were found in the checked source. Runtime behavior is not implied. |
| **Partial** | A wrapper exists but the user-facing action is absent, incomplete, or only part of the backend lifecycle is represented. |
| **Missing UI** | Backend endpoint exists, but no frontend wrapper/screen was found. |
| **Contract mismatch** | Frontend code calls an existing endpoint with a path or payload that does not match the backend contract. |
| **Backend gap** | The required frontend capability has no corresponding HTTP endpoint in the audited backend baseline. |
| **Backend-only** | Provider callback or background operation; it is not a browser-facing feature endpoint. |

Role labels below summarize the route authorization observed in the backend. The backend remains the security boundary; frontend role checks are usability only.

## 2. Baseline route inventory

The current App Router has these main route groups:

- Public: landing `/`, login `/login`, privacy, terms. **No `/pay` route exists.**
- Client workspace: dashboard, estates, house types, houses, tenants, payments, transactions, unmatched transactions, banking, SMS, reports, staff, profile, settings.
- Platform routes currently present in frontend source: overview, clients, users, subscriptions, audit and health. V2 target adds entitlement inventory, integrations monitoring, client detail and diagnostics.

The checked package manifest has `dev`, `build`, `start`, `lint`, and `typecheck` scripts, but no `test` script. No frontend test files were found in the checked repository tree.

## 3. Authentication, profile, and platform

| Backend endpoint | Purpose | Frontend wrapper | Screen / use site | Role / access | Status |
|---|---|---|---|---|---|
| `POST /auth/login` | Establish session | `authApi.login` | `/login` | Public | Wired |
| `POST /auth/logout` | End session | `authApi.logout` | Topbar/session | Authenticated | Wired |
| `GET /auth/me` | Resolve current session/user | `authApi.me` | `SessionProvider` | Authenticated | Wired |
| `POST /auth/refresh` | Refresh session | `authApi.refresh` | Session/auth flow | Authenticated | Wired |
| Signup / password reset | Create ordinary user or reset password | None | None | No public signup/reset flow | Backend gap / deliberately not exposed |
| `GET /profile` | Read current profile | `profileApi.get` | `/profile` | Authenticated | Wired |
| `PATCH /profile` | Update name/phone | `profileApi.update` | `/profile` | Authenticated | Wired |
| `POST /profile/change-password` | Change current password | `profileApi.changePassword` | `/profile` | Authenticated | Wired |
| `GET /platform/overview` | Platform KPIs | `platformApi.overview` | `/platform` | SUPER_ADMIN | Wired |
| `GET /platform/health` | Dependency/provider/job health | `platformApi.health` | `/platform/health` | SUPER_ADMIN | Wired |
| `GET /platform/clients` | List client accounts | `platformApi.listClients` | `/platform/clients` | SUPER_ADMIN | Wired |
| `POST /platform/clients` | Provision a client and owner | `platformApi.provisionClient` | `/platform/clients` | SUPER_ADMIN | Wired |
| `GET /platform/clients/:clientId` | Read client detail | `platformApi.getClient` | Client admin views | SUPER_ADMIN | Wired |
| `PATCH /platform/clients/:clientId` | Update client name | `platformApi.updateClient` | `/platform/clients` | SUPER_ADMIN | Wired |
| `POST /platform/clients/:clientId/activate` | Activate client | `platformApi.activateClient` | `/platform/clients` | SUPER_ADMIN | Wired |
| `POST /platform/clients/:clientId/deactivate` | Deactivate client | `platformApi.deactivateClient` | `/platform/clients` | SUPER_ADMIN | Wired |
| `GET /platform/users` | List platform users | `platformApi.listUsers` | `/platform/users` | SUPER_ADMIN | Wired |
| `GET /platform/audit` | Audit history | `platformApi.listAudit` | `/platform/audit` | SUPER_ADMIN | Wired |
| `GET /platform/subscriptions` | Platform subscription list | `platformApi.listSubscriptions` | `/platform/subscriptions` | SUPER_ADMIN | Wired |

Signup is not mounted as an ordinary public route in the audited backend. Client provisioning is the platform-admin flow; do not add a public signup page based on old README wording.

## 4. Portfolio and tenancy

| Backend endpoint | Purpose | Frontend wrapper | Screen / use site | Role / access | Status |
|---|---|---|---|---|---|
| `GET /estates` | List client estates and metrics | `estatesApi.list` | `/estates` | Client session | Wired |
| `GET /estates/:id` | Read estate | `estatesApi.get` | Estate workspace | Client session | Wired |
| `GET /estates/:id/workspace` | Estate operational summary | `estatesApi.workspace` | `/estates/workspace` | Client session | Wired |
| `POST /estates` | Create estate | `estatesApi.create` | `/estates` | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `PATCH /estates/:id` | Update estate | `estatesApi.update` | `/estates` | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `GET /houses` | Paginated house list | `housesApi.list` | `/houses` and tenant/transaction helpers | Client session | Wired: selected `estateId` is sent to the backend; extra page filtering is redundant |
| `GET /houses/:id` | House detail | `housesApi.get` | House workspace | Client session | Wired |
| `POST /houses` | Create house | `housesApi.create` | `/houses` | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `PATCH /houses/:id` | Update house | `housesApi.update` | `/houses` | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `GET /houses/:id/billing-config` | Read house billing lines | `housesApi.listBillingConfig` / house account DTO | House workspace | Client session | Wired |
| `PUT /houses/:id/billing-config` | Create/update a billing line | `housesApi.upsertBillingConfig` | House/house workspace | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `POST /houses/:id/billing-config/:configId/deactivate` | Deactivate a billing line | `housesApi.deactivateBillingConfig` currently supplies `chargeType` | No confirmed active call site found | CLIENT_OWNER / CLIENT_ADMIN | **Contract mismatch** |
| `GET /house-types` | List house types | `houseTypesApi.list` | `/house-types` | Client session | Wired |
| `GET /house-types/:id` | Read house type | `houseTypesApi.get` | House-type workspace | Client session | Wired |
| `GET /house-types/:id/workspace` | Tenancy-aware house-type portfolio summary | `houseTypesApi.workspace` | `/house-types/workspace` | Client session | Response DTO mismatch: page expects obsolete flat fields; backend returns current/historical/unattributed/orphaned tenancy groupings |
| `POST /house-types` | Create estate-owned house type | `houseTypesApi.create` | `/house-types` | CLIENT_OWNER / CLIENT_ADMIN | Contract mismatch + backend schema defect: service requires estateId; route validation strips it and frontend does not send it |
| `PATCH /house-types/:id` | Update house type | `houseTypesApi.update` | `/house-types` | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `POST /house-types/:id/deactivate` | Deactivate house type | `houseTypesApi.deactivate` | `/house-types` | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `GET /tenants` | List tenants | `tenantsApi.list` | `/tenants` | Client session | Partial: wrapper omits selected `estateId`; UI filters the returned array locally. Restricted STAFF is still scoped by backend middleware |
| `GET /tenants/:id` | Tenant detail/workspace DTO | `tenantsApi.get` | Tenant workspace | Client session | Wired |
| `POST /tenants` | Create tenant | `tenantsApi.create` | `/tenants` | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `PATCH /tenants/:id` | Update tenant | `tenantsApi.update` | `/tenants` | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `POST /tenants/:id/move` | Move tenant to another house | `tenantsApi.move` | Tenant workspace/list action | CLIENT_OWNER / CLIENT_ADMIN | Wired |

### Billing configuration defect

Backend deactivation is keyed by a configuration ID: `/houses/:houseId/billing-config/:configId/deactivate`. The current wrapper builds the URL with a `ChargeType` value instead. Update the wrapper signature to accept `configId` and pass the selected config's `_id`. Do not change the backend route to accept a charge type merely to accommodate the incorrect frontend URL.

## 5. Billing, payments, and deposits

| Backend endpoint | Purpose | Frontend wrapper | Screen / use site | Role / access | Status |
|---|---|---|---|---|---|
| `POST /billing/generate` | Generate period RentCharges | `billingApi.generate` | Estate Workspace → Billing tab (EstateBillingGenerate) | CLIENT_OWNER / CLIENT_ADMIN | Wired; result type omits per-estate eligibleTenancies and partialPeriodExcluded |
| `GET /billing/houses/:houseId/account` | House account, charges, payments, totals | `billingApi.houseAccount` | House workspace | Client session | Wired |
| `GET /payments` | List posted Payment records | `paymentsApi.list` | `/payments`, tenant/house views | Client session | Wired |
| `POST /payments` | Record manual payment and allocation | `paymentsApi.create` | `/payments` | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `GET /deposits/:tenantId` | Read deposit account | `depositsApi.get` | Tenant workspace / Deposit tab | Client session | Wired |
| `POST /deposits/:tenantId/require` | Set deposit requirement | `depositsApi.require` | Tenant workspace / Deposit tab | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `POST /deposits/:tenantId/pay` | Record deposit payment | `depositsApi.pay` | Tenant workspace / Deposit tab | CLIENT_OWNER / CLIENT_ADMIN | Contract mismatch: backend requires Idempotency-Key; wrapper sends none |
| `POST /deposits/:tenantId/deduct` | Record deposit deduction | `depositsApi.deduct` | Tenant workspace / Deposit tab | CLIENT_OWNER / CLIENT_ADMIN | Contract mismatch: backend requires Idempotency-Key; wrapper sends none |
| `POST /deposits/:tenantId/settle` | Settle deposit | `depositsApi.settle` | Tenant workspace / Deposit tab | CLIENT_OWNER / CLIENT_ADMIN | Wired |

Correction: billing generation is already exposed in the Estate Workspace Billing tab. Keep that action, verify confirmation/permission behavior, and extend BillingGenerateResult to model eligibleTenancies and partialPeriodExcluded per estate. Do not build a duplicate generation surface.

## 6. Bank connections, accounts, and transactions

| Backend endpoint | Purpose | Frontend wrapper | Screen / use site | Role / access | Status |
|---|---|---|---|---|---|
| `GET /bank/connections` | List provider connections | None | None | Authenticated client; management for owner/admin | **Missing UI** |
| `POST /bank/connections` | Create/authorize provider connection | None | Current Banking dialog does not call it | CLIENT_OWNER / CLIENT_ADMIN | **Missing UI** |
| `GET /bank/connections/:id` | Read connection state | None | None | Authenticated client | **Missing UI** |
| `POST /bank/connections/:id/reauthorize` | Rotate/reauthorize connection credentials | None | None | CLIENT_OWNER / CLIENT_ADMIN | **Missing UI** |
| `POST /bank/connections/:id/disconnect` | Disconnect provider connection | None | None | CLIENT_OWNER / CLIENT_ADMIN | **Missing UI** |
| `GET /bank/accounts` | List bank accounts | `bankingApi.list` | `/banking` | Client session | Wired |
| `POST /bank/accounts` | Register account under a connection | `bankingApi.connect` currently sends no `connectionId` | `/banking` Connect Account dialog | CLIENT_OWNER / CLIENT_ADMIN | **Contract mismatch** |
| `POST /bank/accounts/:id/sync` | Synchronize account | `bankingApi.sync` | Banking account card | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `GET /bank/accounts/:id/statement` | Request statement range and reconcile/store | `bankingApi.statement` | Banking statement dialog | CLIENT_OWNER / CLIENT_ADMIN | Partial: response is counts, not transaction rows |
| `GET /transactions` | Paginated BankTransaction list | `transactionsApi.list` | `/transactions` | Client session | Partial: estate filter is local and only applied to fetched page |
| `GET /transactions/unmatched` | Unmatched bank transactions | `transactionsApi.unmatched` | `/transactions/unmatched` | Client session | Wired |
| `POST /transactions/:id/assign` | Assign bank transaction to house | `transactionsApi.assign` | Unmatched transaction workflow | CLIENT_OWNER / CLIENT_ADMIN | Wired |

### Banking contract defect and required design

The current `ConnectAccountDialog` calls `POST /bank/accounts` with estate, provider, account number, and account name. The audited backend requires a connection to be created first; account creation then requires `connectionId`. The frontend currently has no bank-connections module or connection-management UI.

Implement the actual lifecycle in this order:

1. List or create/authorize a provider connection.
2. Render connection status and supported reauthorization/disconnect actions.
3. Register a bank account against the selected connection ID.
4. List/sync accounts and request statement ranges.

Provider credential material must follow the backend schema. The current UI displays Co-operative Bank as the implemented provider; do not expose other provider choices until the backend reports them implemented and the payload is confirmed.

The statement endpoint returns `{ stored, reconciled }` counts. It does not return a statement list. Use `/transactions` to display imported bank records.

## 7. SMS, reports, subscriptions, and users

| Backend endpoint | Purpose | Frontend wrapper | Screen / use site | Role / access | Status |
|---|---|---|---|---|---|
| `POST /sms/send` | Queue one tenant SMS | `smsApi.send` | `/sms` | Owner/admin/staff | Wired |
| `POST /sms/broadcast` | Broadcast to eligible group | `smsApi.broadcast` | `/sms` | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `POST /sms/preview` | Preview message/template | `smsApi.preview` | `/sms` | Owner/admin/staff | Wired |
| `GET /sms/history` | View sent/queued messages | `smsApi.history` | `/sms` and tenant workspace | Client session | Wired |
| `GET /reports/dashboard` | Dashboard report | `reportsApi.dashboard` | Dashboard | Client session | Wired |
| `GET /reports/monthly` | Monthly report | `reportsApi.monthly` | Reports | Client session | Wired |
| `GET /reports/arrears` | Arrears report | `reportsApi.arrears` | Reports | Client session | Wired |
| `GET /reports/payments` | Payment report | `reportsApi.payments` | Reports | Client session | Wired |
| `GET /reports/bank-transactions` | Bank transaction report | `reportsApi.bankTransactions` | Reports | Client session | Wired |
| `GET /reports/sms` | SMS report | `reportsApi.sms` | Reports | Client session | Wired |
| `GET /reports/billed-vs-paid` | Billed vs paid report | `reportsApi.billedVsPaid` | Reports | Client session | Wired |
| `GET /reports/management` | Management report | `reportsApi.management` | Reports | Client session | Wired |
| `GET /subscription` | Read current plan | `subscriptionApi.get` | `/settings` | Authenticated client | Wired |
| `POST /subscription/upgrade` | Request supported plan upgrade | `subscriptionApi.upgrade` | `/settings` | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `GET /users` | List client users/staff | `staffApi.list` | `/staff` | Client session | Wired |
| `POST /users` | Create STAFF/CLIENT_ADMIN | `staffApi.create` | `/staff` | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `PATCH /users/:id` | Update name/phone/estateIds only | `staffApi.update` | `/staff` | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `POST /users/:id/deactivate` | Deactivate user | `staffApi.deactivate` | `/staff` | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `POST /users/:id/activate` | Activate user | `staffApi.activate` | `/staff` | CLIENT_OWNER / CLIENT_ADMIN | Wired |

The user update endpoint does not edit roles. The frontend form must not imply that role changes can be saved through `PATCH /users/:id`.

## 8. M-PESA collection: existing backend contract, missing frontend

The backend exposes link issuance and SMS-evidence processing routes, but M-PESA is not wired anywhere in the current frontend. Treat it as a new feature. Tenant-facing scope is exactly one public /pay page for pasting and submitting SMS text. Link management belongs in the authenticated tenant workspace; evidence review belongs under Payments/Collections. Do not create a tenant portal or multiple tenant-facing pages.

| Backend endpoint | Purpose | Required frontend surface | Role / access | Status |
|---|---|---|---|---|
| `GET /mpesa-collection/tenants/:tenantId/account` | Read tenant collection/account view | Tenant workspace integration if required | Authenticated client context | Missing UI |
| `GET /mpesa-collection/tenants/:tenantId/payments` | Read posted tenant payment history | Tenant workspace integration if required | Authenticated client context | Missing UI |
| `GET /mpesa-collection/tenants/:tenantId/link` | Inspect link state, not recover prior token | Tenant workspace “M-PESA link” action | CLIENT_OWNER / CLIENT_ADMIN / SUPER_ADMIN with explicit client context | Missing UI |
| `POST /mpesa-collection/tenants/:tenantId/link` | Issue/rotate link; returns token once | Tenant workspace: issue + copy/share URL | CLIENT_OWNER / CLIENT_ADMIN / SUPER_ADMIN with explicit client context | Missing UI |
| `POST /mpesa-collection/tenants/:tenantId/link/revoke` | Revoke active token/link | Tenant workspace: revoke action | CLIENT_OWNER / CLIENT_ADMIN / SUPER_ADMIN with explicit client context | Missing UI |
| `GET /mpesa-collection/submissions` | List reviewable SMS evidence submissions | Collections review queue | Authorized client owner/admin/superadmin via client context | Missing UI |
| `POST /mpesa-collection/submissions/:id/resolve` | REJECT or RETRY_MATCH with reason code | Submission detail/review action | Authorized client owner/admin/superadmin via client context | Missing UI |
| `POST /public/mpesa/submissions` | Accept tenant SMS text evidence | Public `/pay` page | Public guarded endpoint | Missing UI |

### Required public page contract

The backend creates a **page link**, not an API URL, in the form:

```text
{FRONTEND_URL}/pay#t={one-time-token}
```

Add `src/app/(public)/pay/page.tsx`, which resolves to browser path `/pay`.

The page must:

1. Work without a logged-in tenant session.
2. Read the `t` token from `window.location.hash` on the client.
3. Avoid persistent storage, telemetry, and logs for the one-time token.
4. Ask for the M-PESA confirmation SMS text.
5. Submit JSON `{ "token": "...", "text": "..." }` to `POST /api/v1/public/mpesa/submissions`.
6. Treat the 202 response as accepted evidence only, not a rent payment or successful ledger posting.
7. Show neutral feedback for unknown, revoked, malformed, expired/disabled, or unavailable links according to the backend response.

### Required operator flow

- Put link inspect/issue/rotate/revoke and copy/share on the tenant workspace; do not create a parallel tenant-management app.
- Issue returns { link, token } once; inspect returns metadata only. Hold token in ephemeral UI state and never cache, persist, log or track it.
- Backend may queue protected onboarding SMS when prerequisites exist, but response exposes no delivery result. Never claim SMS sent/delivered or duplicate backend SMS.
- If link.operational is false, do not present it as ready for evidence submissions.
- Put submission review into a collections/payment-operations area or a focused sub-route reached from that area.
- Support only the backend's two resolution actions: `REJECT` and `RETRY_MATCH`, each with a required reason and audit trail.
- Never create a “force approve” button; the backend does not expose that operation.
- Do not label a submission as a paid invoice solely because text was received.

## 9. M-PESA capabilities that require backend work

These are not frontend implementation tasks until the backend exposes a documented route and DTO:

| Desired capability | Current backend state | Required backend contract |
|---|---|---|
| Browse canonical M-PESA receipts | No HTTP list/read route for canonical `MpesaTransaction` records | Client/estate-scoped, paginated receipt list and detail DTO with stable filters/sort |
| Manage merchant profiles | No client-facing create/list/update/activate/revoke HTTP routes | Merchant profile CRUD/status endpoints with authorization and validation |
| Trigger/query Daraja Pull manually | Scheduled job and Pull-results callback exist; no manual query HTTP route | Explicit operator-authorized endpoint, request window limits, idempotency/concurrency semantics, result DTO |
| Inspect receipt reconciliation state | No canonical receipt read API | Receipt DTO and explicit status/state contract |

Do not infer a route name or response shape for any of the above. Get the backend endpoint documented and merged first.

## 10. Provider callbacks and operations: not frontend routes

| Backend endpoint / process | Purpose | Browser behavior |
|---|---|---|
| `POST /webhooks/daraja/c2b/confirm` | Safaricom C2B confirmation callback | Never call from browser |
| `POST /webhooks/daraja/c2b/validate` | Safaricom C2B validation callback | Never call from browser |
| `POST /webhooks/daraja/pull/results` | Pull result callback/ingestion | Never call from browser |
| `POST /webhooks/banks/coop/transactions` | Co-op bank webhook ingestion | Never call from browser |
| Scheduled M-PESA Pull reconciliation | Background backend job gated by server configuration and eligible merchant profile state | Show read-only health/job status where useful; no invented manual trigger |
| `GET /platform/health` | Platform health and background-job status | Existing SUPER_ADMIN health screen; informational only |

## 11. Operational endpoints and API documentation

| Endpoint | Purpose | Frontend use |
|---|---|---|
| `GET /health` | Root health probe | Infrastructure/load balancer |
| `GET /api/v1/health` | Versioned API health probe | Used by frontend connectivity checks |
| `GET /ready` | Readiness check (Mongo/Redis/transaction support) | Operational probe, not normal feature UI |
| `/api-docs` | Swagger UI | Backend developer/operator documentation; not an app feature |

## 12. Cross-cutting contract defects and audit notes

### 12.1 Banking lifecycle is incorrectly modeled

- Frontend current module: `src/lib/api/banking.ts`.
- Current call: `POST /bank/accounts` with estate/provider/account number/account name.
- Backend lifecycle: `POST /bank/connections` first; then `POST /bank/accounts` with the selected `connectionId`.
- Missing frontend surface: bank connection list, create/authorize, detail, reauthorize, disconnect.
- Impact: current “Connect Account” path does not match the backend contract.

### 12.2 House billing-config deactivate uses the wrong identifier

- Frontend current wrapper: `housesApi.deactivateBillingConfig(houseId, chargeType)`.
- Backend route: `POST /houses/:houseId/billing-config/:configId/deactivate`.
- Required fix: method parameter must be `configId`; URL must use the configuration record ID. The existing page may not currently call this wrapper, but the API contract is still wrong.

### 12.3 Estate filtering: verified backend behavior and frontend gaps

- Backend `clientContext` reads `estateId` from the route/query, rejects a requested estate outside the authenticated user’s allowed estate IDs, and derives `req.estateFilter`. When a restricted STAFF user omits `estateId`, the middleware uses that user’s assigned `estateIds`; this is the actual security boundary.
- Houses page passes the selected `estateId` through `housesApi.list`, and `houseService.list` applies the derived estate filter. The page also narrows the returned items locally, which is redundant; the source comment claiming `estateId` is deliberately not sent is stale.
- Tenants page calls `tenantsApi.list()` without passing its selected estate. The tenant list is currently returned as an array rather than a paginated page, and the UI filters that array locally. Add optional `estateId` to the wrapper and pass the current selection so the backend performs the requested narrowing too. Restricted STAFF remains scoped by middleware even before that change.
- Transactions page requests paginated transactions without `estateId`, then filters only the current page locally. Add `estateId` to `TransactionListQuery` and pass the selected estate so matching rows are selected before pagination. Restricted STAFF remains scoped by middleware even when the UI omits it.
- Unmatched-transaction assignment loads houses without a selected `estateId` and narrows the returned set to the transaction estate locally. `housesApi.list` already supports `estateId`; pass the transaction’s estate to the backend query rather than relying on a potentially incomplete loaded page.
- Keep client-side filtering as presentation only. It is never the authorization boundary; backend `clientContext` and service-level `estateFilterClause` enforce the permitted scope.

### 12.4 API wrapper barrel is incomplete

`src/lib/api/index.ts` does not re-export `billingApi`, `depositsApi`, `houseTypesApi`, or `subscriptionApi`, although individual modules are imported directly. Fixing the barrel is optional cleanup; it does not close any endpoint gap.

### 12.5 README has stale backend assertions

The current README describes estate-scoping and bank-account data exposure as backend blockers, while the backend source audit for the recorded baseline showed updated server-derived scoping and a public bank-account DTO. Reconcile the README against the checked backend commit before treating those statements as current facts. Do not carry those claims into new implementation work without source verification.

### 12.6 Verification is not implied

This audit reviewed repository source and package configuration. It did not run the frontend against the live backend. “Wired” means the wrapper/screen call exists in source; it is not proof that deployment configuration, CORS, session cookies, response DTOs, provider credentials, or live workflows all succeed.

## 13. Recommended implementation order

| Priority | Work item | Why it comes here | Depends on |
|---|---|---|---|
| P0 | Fix bank connection lifecycle in Banking | Existing account-create path does not follow backend contract | Confirm provider credential schema and connection DTO |
| P0 | Fix billing-config deactivation identifier | Direct URL/parameter mismatch | Use config `_id` in the UI |
| P1 | Complete estateId query plumbing in Tenants and Transactions; pass transaction estate to unmatched-assignment house lookup | Prevent incomplete filtered results and avoid filtering only after pagination | Backend `clientContext` already supports and validates `estateId`; add it to frontend wrapper types/calls |
| P1 | Add M-PESA tenant link API module and tenant workspace controls | Backend routes already exist | Confirm token-once response and exact response DTO |
| P1 | Add public `/pay` page and submission client | Backend public endpoint already exists | Match exact `{ token, text }` and response codes |
| P1 | Add M-PESA submission review queue | Backend list/resolve endpoints exist | Confirm filter/pagination response schema and reason-code enum |
| P1 | Complete billing generation response typing | Action already exists in Estate Workspace Billing tab | Model eligibleTenancies and partialPeriodExcluded returned per estate |
| P2 | Add canonical M-PESA receipt inbox | Important, but blocked by a missing backend read API | Backend endpoint + DTO |
| P2 | Add merchant-profile management and manual Pull controls | Blocked by missing backend HTTP endpoints | Backend API design and authorization |
| P2 | Add frontend test harness and real browser acceptance suite | Current manifest has no test script | Test framework decision and CI integration |
| P2 | Reconcile README and API export barrel | Reduces stale guidance and import drift | Complete after contract baseline is stable |

## 14. Navigation recommendation

Do not create one top-level page for every endpoint.

- **Tenant workspace:** add an M-PESA link panel/action beside existing overview, billing history, payments, SMS, activity, and deposit content.
- **Payments/collections area:** add the evidence-submission review queue. Add the canonical receipt inbox only after the backend read endpoint exists.
- **Banking:** manage connections and accounts in the same feature area, with connection setup preceding account registration.
- **Platform health:** keep job status read-only. Do not present it as a manual Pull console.
- **Settings:** keep subscription actions only until a real backend settings contract exists.

## 15. Pre-coding challenge checklist

- Are we mapping a real backend endpoint, or inventing one because a screen would look nice?
- Is this data an SMS submission, provider receipt, bank transaction, or posted Payment?
- Does the backend require a resource ID such as `connectionId` or `configId` that the wrapper currently omits?
- Does the endpoint return a full list, a paginated page, or an operation summary only?
- Are we applying a display filter to a single loaded page and pretending it is complete?
- Is the action role-authorized by the backend, not just hidden by the sidebar?
- Could the operation be retried or double-submitted? Is the backend idempotency behavior clear?
- Does the change leak a one-time link token into persistent state or telemetry?
- Have all three planning documents been updated to match the current backend commit?

**Implementation gate:** no feature implementation should begin until these questions have evidence-backed answers for that feature.


## 16. Field-level contract audit and redesign findings

This section supersedes earlier matrix statements that conflict with it. Source baseline remains frontend main dc34279 and backend main 5aa05a2.

### 16.1 Request and path mismatches

| Area | Actual backend contract | Frontend gap | Required correction |
|---|---|---|---|
| Bank connection create | POST /bank/connections: provider, optional displayName, required credentialMaterial object | No wrapper or UI | Add separate BankConnection lifecycle |
| Bank account create | POST /bank/accounts: estateId, connectionId, provider, accountNumber, accountName, optional currency/allowEstateReassignment | UI calls directly; input omits connectionId | Create/select active connection first |
| HouseType create | Service requires estateId; createSchema omits it and validation strips it | Form/type omit estateId too | Fix backend validator and frontend estate selection/payload |
| HouseType plan update | Service supports effectiveFromPeriod/changeReason; update schema omits both | No frontend field model | Align backend validator and versioned-plan editor |
| Billing config deactivate | Path requires configId | Wrapper uses chargeType | Pass selected config _id |
| Deposit pay/deduct | Mandatory Idempotency-Key header | Wrappers send no header; apiClient lacks typed header support | Add stable per-intent idempotency-key support |
| Tenant PATCH | name/phone/status/moveOutDate only; move uses dedicated route | Update type permits houseId | Remove houseId from PATCH |
| House PATCH | estateId cannot be changed | Update type permits estateId | Remove estateId from update type |

### 16.2 Response DTO drift

| Area | Backend DTO/model | Frontend mismatch |
|---|---|---|
| BankConnection | Safe DTO: id/provider/displayName/status/credentialVersion/safe authMeta/timestamps; no credentials returned | Missing frontend DTO/module |
| BankAccount | Includes connectionId, validationStatus, lastValidatedAt, entitlements | Interface omits fields |
| BankTransaction | matchStatus supports MATCHED/UNMATCHED/PARTIAL/MANUAL_REVIEW; separate processingState supports RECEIVED/CLAIMED/POSTED/FAILED_RETRYABLE/FAILED_TERMINAL/MANUAL_REVIEW | Type only allows MATCHED/UNMATCHED |
| BankTransaction response safety | list/unmatched return raw docs including processingClaimToken/rawPayload | Backend must project a safe DTO before browser use |
| Tenant financials | outstandingCents can be null; knownArrearsCents, historicalCoverage, verifiedFullObligation, balanceSource, overdueCents, oldestUnpaidPeriod | Type says number; page renders null as zero |
| House account | currentTenancyId, ledger, verification metadata, currentTenancyBalanceCents, currentTenancyBalanceVerified, historicalUnattributedCents, balanceSource | Type/page flatten house-wide historic balance as active occupant liability |
| HouseType workspace | currentTenancy/currentOccupancyConflict/historicalTenancyFinancials/unattributedLegacyFinancials/orphanedTenancyFinancials | Page expects obsolete flat fields and non-existent occupancyRatePercent |
| HouseBillingConfig | _id/effectiveFrom/effectiveTo/frequency | Type omits effectiveTo/frequency; deactivate by _id |
| Payment | origin BANK/MANUAL/MPESA/CREDIT; status CONFIRMED/REVERSED; tenancyId | Type/table omit origin/status; list can contain reversed rows |
| Deposit GET | { tenant, deposit, activeTenancyId, balance } | Frontend models only deposit |
| Billing result | Per-estate eligibleTenancies/partialPeriodExcluded | Result type omits those fields |

### 16.3 Filtering and cache defects

- Transactions omits selected estateId then filters after pagination. Send estateId and include it in query/cache keys.
- Unmatched assignment requests up to 200 houses and filters locally. Send transaction.estateId to housesApi.list and include it in the cache key.
- Tenants omits estateId although clientContext supports it. Add optional estateId; backend list is unpaginated.
- HouseType list supports estateId/includeInactive but wrapper exposes includeInactive only. Add estate query support.
- Houses already sends estateId; remove stale comments, preserve backend filter.
- Include every list filter (estate, match status, state, date range, pagination) in React Query and IndexedDB cache keys.

### 16.4 Deposit mutation failure detail

Deposit service requires Idempotency-Key for pay and deduct and throws validation error when it is missing. Route Zod schemas allow amountCents/reason/notes but strip an idempotencyKey body property. Current wrappers therefore fail until the shared API client can send the header. Generate one key per deliberate user action, keep it stable on retries, and generate a new key only for a new action.

### 16.5 M-PESA new-feature architecture

M-PESA is entirely absent from frontend source:
- Exactly one public tenant page: /pay, no auth, one text area and one submit action.
- Tenant link controls inside existing tenant workspace.
- Evidence review queue under authenticated Payments/Collections, e.g. /payments/mpesa-submissions.
- Separate authenticated mpesa-collection and public mpesa submission API modules.
- Public request omits session cookies and CSRF; token comes from fragment #t= and is never persisted, logged, tracked or cached.
- Issue returns link+token once. Inspect returns metadata only. Issue may rotate/invalidate prior token.
- Backend may queue protected onboarding SMS, but response does not report delivery. Do not claim SMS sent.
- Public POST accepts exactly { token, text }, body limit 4 KB. 202 means evidence received for processing, not payment posted.
- Review supports only REJECT and RETRY_MATCH with required reason codes. No approve/force-match.
- SMS evidence is not canonical MpesaTransaction and is not Payment.

### 16.6 Backend capabilities unavailable to frontend

No canonical MpesaTransaction read/list, merchant profile management or manual Pull query endpoint exists. Password reset, notifications and generic settings endpoints are absent. Provider webhooks and scheduled jobs remain backend-only.

### 16.7 Redesign order

P0: deposit Idempotency-Key; HouseType create schema + estate selection; BankConnection → BankAccount; safe BankTransaction DTO; unknown and tenancy-aware balance rendering.

P1: HouseType workspace rebuild; Tenant/House/Payment/BankAccount DTO corrections; estate filter/cache-key plumbing; billing config ID/effective dates; new M-PESA public page + operator link controls + evidence review queue.

P2: canonical receipt inbox, merchant management and manual Pull only after backend endpoints exist.


## 17. Superadmin platform V2 endpoint-to-screen contract

This section supersedes older platform rows in §3 and any earlier statement that those rows are fully wired. Backend source baseline: feat/superadmin-subscription-entitlements at cc98900ba338f5b1e19bdcfe923e4dc45bc87745. Implementation is in source; behavioural verification is pending.

All /api/v1/platform/* routes require authenticate and authorize('SUPER_ADMIN').

### 17.1 New platform endpoints

| Backend endpoint | Request/query contract | Response purpose | Required frontend screen | Current frontend state |
|---|---|---|---|---|
| PATCH /platform/clients/:clientId/subscription | Strict partial body: plan (trial/basic/pro), products[] (BANKING/MPESA), startDate, endDate (date or null to clear); non-empty; no status/unknown keys | Updated public subscription DTO with products and actor fields | Client detail → Products & Subscription | Missing wrapper and UI |
| GET /platform/entitlement-inventory | page, limit, product (BANKING/MPESA/BOTH/NONE), isActive | Paginated product assignment inventory including clients without subscriptions | /platform/entitlements | Missing wrapper and UI |
| GET /platform/clients/:clientId/diagnostics | clientId path; read-only | Operational access, entitlement reasons, recent audit records and job outcomes | Client detail → Diagnostics | Missing wrapper and UI |
| GET /platform/integrations/banking | page, limit, clientId, clientIsActive, provider, status, validationStatus, accountConnectionStatus | One row per BankConnection with safe client identity, auth evidence and BankAccount rollups | /platform/integrations/banking | Missing wrapper and UI |
| GET /platform/integrations/mpesa | page, limit, clientId, clientIsActive, operationalState, callbackCapability, pullCapability, c2bRegistrationState, pullRegistrationState | One row per merchant profile with callback/Pull, registration, ingestion evidence and blockers | /platform/integrations/mpesa | Missing wrapper and UI |

### 17.2 Expanded existing platform contracts

| Backend endpoint | Backend contract change | Frontend requirement | Current gap |
|---|---|---|---|
| GET /platform/clients | Filters: page, limit, search, product, plan, subscriptionStatus, hasSubscription, bankProvider, bankConnectionStatus, bankAccountConnectionStatus, bankValidationStatus, mpesaState, callbackCapability, pullCapability, c2bRegistrationState, pullRegistrationState, isActive. Rows add owner, counts, subscription presence/data/products and Banking/M-PESA summaries | Complete filter model, paginated table and product/integration summaries; include all filters in query keys | Current wrapper only exposes page/limit/isActive; row DTO is stale |
| POST /platform/clients | Adds optional products, startDate and endDate; products defaults to [] | Explicit Banking/M-PESA/both/neither assignment and supported dates | Current form/input omits products and dates |
| GET /platform/clients/:clientId | Adds safe owner, subscription presence/id/plan/status/dates/products/actor refs, counts, Banking summary and safe M-PESA profiles/evidence | Client workspace tabs: Overview, Products & Subscription, Integrations, Diagnostics, Activity | Wrapper type stale; no platform detail route |
| GET /platform/overview | Adds productAssignments, bankingIntegration and mpesaIntegration distributions | Separate assignment metrics from integration readiness | Existing overview renders legacy KPIs only |
| GET /platform/health | Returns generatedAt plus nested application, mongo, redis, scheduler, banking, mpesa and sms evidence | Rebuild DTO and health page for nested objects | Existing page expects flat strings and calls string methods on them; likely runtime failure |
| GET /subscription | Public DTO adds products, assignedByUserId and lastChangedByUserId | Show assigned products; read-only customer subscription view | Current type/UI needs update |
| POST /subscription/upgrade | Always returns 403 FORBIDDEN; no mutation | Remove client upgrade action | Existing wrapper/UI implies self-service upgrade |

### 17.3 New response models and display rules

**Entitlement inventory row:** clientId, name, isActive, hasSubscription, plan, status, products, assignedByUserId, lastChangedByUserId and updatedAt. Distinguish no subscription from an existing subscription with products: [].

**Diagnostics response:** client, operationalAccess (clientActive, ordinaryOperationsBlocked and per-product entitled/reason), recentAudit (up to 25 safe rows) and jobOutcomes. Diagnostics is read-only and supports inactive clients. It is not impersonation.

**Banking integration row:** connectionId; clientId/clientName/clientIsActive; provider/displayName/status/needsReauthorization; authEvidence (lastAuthAt, tokenExpiresAt, lastAuthError); accounts (accountCount, validationStatuses, accountConnectionStatuses, capabilities, lastSyncAttemptAt, lastSyncSuccessAt, lastSyncErrorCategory); timestamps.

**M-PESA integration row:** client identity; merchant profile identity/displayName/type/shortcode; operationalState; callbackCapability and pullCapability independently; C2B/Pull registration states; lastPullRegisteredAt; per-channel ingestionEvidence; backend-derived blockers.

Integration DTOs are read-only and must not expose secrets, credential references, encrypted account values, access tokens or raw provider payloads.

### 17.4 Product entitlement gates affecting existing client screens

| Customer endpoint family | Required entitlement | Frontend surfaces that must handle 403 |
|---|---|---|
| /bank/* and /bank/connections/* | BANKING | Banking and connection management |
| /transactions/* | BANKING | Transactions and unmatched bank-transaction reconciliation |
| /mpesa-collection/* | MPESA | M-PESA tenant-link and evidence-review features |

Denial is 403 PRODUCT_NOT_ENTITLED with product and one of: PRODUCT_UNKNOWN, CLIENT_NOT_FOUND, CLIENT_INACTIVE, SUBSCRIPTION_MISSING, PRODUCT_NOT_ASSIGNED. The gate checks Client existence, isActive === true and Subscription.products membership. It does not infer entitlement from plan, status, dates, payments, bank connections or merchant profiles.

Do not gate rent billing, manual payments, deposits, standard SMS, public/provider ingress or unrelated property operations because those are not covered by these product gates.

### 17.5 Platform navigation and screen map

| Navigation | Route | Primary endpoint(s) | Responsibility |
|---|---|---|---|
| Overview | /platform | GET /platform/overview | KPIs, product assignment and integration distributions |
| Clients | /platform/clients | GET/POST /platform/clients; PATCH /platform/clients/:id; activate/deactivate | Search/filter, provision and manage client state |
| Client workspace | /platform/clients/:clientId | GET client; PATCH client subscription | Selected-client overview and Manager product/subscription controls |
| Client diagnostics | /platform/clients/:clientId/diagnostics | GET client diagnostics | Read-only access, audit and job evidence |
| Entitlements | /platform/entitlements | GET /platform/entitlement-inventory | Product assignment inventory |
| Integrations — Banking | /platform/integrations/banking | GET /platform/integrations/banking | Cross-client bank connections/accounts |
| Integrations — M-PESA | /platform/integrations/mpesa | GET /platform/integrations/mpesa | Merchant profiles and ingestion |
| Users | /platform/users | GET /platform/users | Platform user directory |
| Subscriptions | /platform/subscriptions | GET /platform/subscriptions | Subscription records |
| Audit | /platform/audit | GET /platform/audit | Platform audit history |
| System Health | /platform/health | GET /platform/health | Nested dependency/provider/job evidence |

### 17.6 API module and cache organization

Recommended modules:
- src/lib/api/platform/overview.ts
- src/lib/api/platform/clients.ts
- src/lib/api/platform/entitlements.ts
- src/lib/api/platform/diagnostics.ts
- src/lib/api/platform/integrations.ts
- src/lib/api/platform/users.ts
- src/lib/api/platform/subscriptions.ts
- src/lib/api/platform/audit.ts
- src/lib/api/platform/health.ts

Recommended query keys:
- ['platform','overview']
- ['platform','clients',filters]
- ['platform','client',clientId]
- ['platform','diagnostics',clientId]
- ['platform','entitlements',filters]
- ['platform','integrations','banking',filters]
- ['platform','integrations','mpesa',filters]
- ['platform','users',filters]
- ['platform','subscriptions',filters]
- ['platform','audit',filters]
- ['platform','health']

After provisioning/subscription changes, invalidate client directory/detail, entitlement inventory, subscriptions and overview. After activation changes, invalidate directory/detail, diagnostics and overview. Do not present local filtering of one server page as a global result.

### 17.7 Explicit backend gaps and rollout warnings

- PATCH /platform/clients/:clientId/subscription updates an existing subscription only. It cannot create one for an existing client with no subscription; backend Manager creation/repair or migration is required.
- Existing subscriptions default to products: []. Existing clients are denied Banking/M-PESA until explicit product assignment. Plan a controlled rollout; do not silently grant products.
- Subscription status and dates do not automatically expire entitlements.
- No canonical MpesaTransaction list/detail, merchant-profile CRUD or manual Pull HTTP endpoint exists. Do not invent those screens/actions.
- Platform Banking/M-PESA integration endpoints are read-only. No mutation controls belong on those monitoring pages.
- Backend V2 implementation is present in source, but behavioural verification is pending. No frontend runtime verification is implied by this matrix.

## 18. Financial-correctness audit (dashboard, reports, payments, estate/house workspaces)

Rule: a missing, null or unverified financial value renders as "Not available" (`formatMaybeCents` / `formatMaybeNumber`). A backend zero renders as a real zero. No aggregate is substituted for another. Tenant arrears are shown only through `KnownArrearsCard` / `describeKnownArrears`.

| Screen | Status | Change / reason |
|---|---|---|
| `dashboard/page.tsx` | IMPLEMENTED | KPIs use maybe-formatters. Collection rate is the backend `collectionRatePercent` only; no client recomputation. Estate chart omits slices without numeric figures. Outstanding relabelled "Open charges (period)". |
| `dashboard/components/recent-payments-card.tsx` | IMPLEMENTED | Removed the fabricated `{0,0,0}` rent, status and houses objects. Missing sections render "Not available". |
| `reports/page.tsx` | IMPLEMENTED | Removed `Number(... ?? 0)` and `a \|\| b \|\| 0`. Billed, collected and open charges come only from `billedVsPaid.total` and are no longer replaced by `rent.*`. Unmatched bank uses the all-time field only. Pie slices omit unknown counts. Arrears table is labelled charge-level, not ledger arrears, and not netted for tenant credit. |
| `payments/page.tsx` | IMPLEMENTED | Origin and status chips; REVERSED rows struck through and not described as confirmed. Server-side estate filter in the cache key; house picker limited to the backend maximum of 100 with a truncation notice. |
| `houses/page.tsx`, `house-types/page.tsx` | IMPLEMENTED | Billing-line and override amounts no longer default to zero. |
| tenant, house, estate and house-type workspaces | IMPLEMENTED (previous commit) | Current, earlier-tenancy, unattributed legacy and credit shown separately. |

Retained on purpose (not financial values): `list?.length ?? 0` for empty-state checks, `unclassifiedHouses ?? 0 > 0` as a display condition, allocation-count message text, `portfolio.x ?? houses.x` (same metric from two sections, not a zero), `Number(rentKes || 0)` form input parsing.

Known limits: the dashboard and report DTO types still declare `rent`, `status` and `houses` as required, so the page handles absence defensively but the types are not narrowed to the backend. Report and dashboard figures are charge-based and are not ledger-authoritative. `/reports/payments` returns all payment statuses; no screen consumes it yet.

### 18.1 BLOCKED BY BACKEND: raw BankTransaction responses

Verified in `transaction.service.js`: `list` and `unmatched` call `BankTransaction.find(filter)` with no projection, and the model stores `processingClaimToken` and `rawPayload`. Both fields are therefore serialized to the browser. TypeScript interfaces cannot redact fields from an HTTP response. A safe BankTransaction DTO is an unresolved backend security prerequisite. Safe bank-transaction responses are NOT complete. The frontend wrapper declares only the fields it displays, which does not mitigate the exposure.

### 18.2 Verification commands

`npx tsc --noEmit`, `npx next lint` and `npm test` (vitest, `src/lib/formatting/financial-values.test.ts`: unknown, null, verified zero, unverified zero, positive). `next build` was not run in this milestone.

### 18.3 Still NOT IMPLEMENTED in this branch

Transactions screens (server-side estate filter, processingState chips, entitlement state), the public `/pay` page, operator M-PESA link panel and submission review queue.

## 19. Implementation reconciliation

Status values: IMPLEMENTED, BLOCKED BY BACKEND, NOT IMPLEMENTED. Verified with `npx tsc --noEmit`, `npx next lint`, `npm test` and `npx next build` (all run at the commit that added this section). No browser or end-to-end test was run against a live backend, so IMPLEMENTED means built and compiled, not exercised against the API.

| Area | Status | Files / notes |
|---|---|---|
| API client, idempotency keys, public request helper | IMPLEMENTED | `lib/api/client.ts` |
| Superadmin platform V2 (overview, clients, client detail, entitlements, banking and M-PESA monitors, health, users, subscriptions, audit) | IMPLEMENTED | `lib/api/platform/*`, `app/(platform)/platform/**`. Deviation: `/platform/clients/[clientId]` uses a Mongo ID in the URL (SUPER_ADMIN only). Client banking/M-PESA summaries, health sections and diagnostics are rendered through `EvidenceView` because their field names are not verified. |
| Estate-scoped house types, houses, tenants (server-side filters, pagination, cache keys) | IMPLEMENTED | `house-types`, `houses`, `tenants`, `estates/workspace` pages, `lib/query/keys.ts` |
| House type creation with `estateId` | BLOCKED BY BACKEND | Frontend sends `estateId`; the backend validation strips it. |
| "Unclassified houses" filter | BLOCKED BY BACKEND | Cannot be done server-side; removed rather than filtered client-side. |
| Tenancy-aware house-type, house, tenant workspaces | IMPLEMENTED | Current, earlier-tenancy, unattributed legacy, orphaned and credit shown separately. |
| Deposits with Idempotency-Key and double-submit guard | IMPLEMENTED | `features/deposits/deposit-panel.tsx` |
| Billing generation result (`eligibleTenancies`, `partialPeriodExcluded`) | IMPLEMENTED | `estates/workspace` Billing tab |
| Billing plan update with effective period and change reason | BLOCKED BY BACKEND | Update schema omits those fields. |
| Bank connection lifecycle (create, reauthorize, disconnect), account registration, sync, statement | IMPLEMENTED | `app/(dashboard)/banking/page.tsx`, `lib/api/bank-connections.ts`, `lib/api/banking.ts`. Credentials live only in dialog state and are wiped on every exit path. |
| Transactions list and unmatched (server-side estate filter, match and processing chips, entitlement state, cache keys, assignment scoped to estate) | IMPLEMENTED | `app/(dashboard)/transactions/**`, `lib/api/transactions.ts` |
| Safe bank transaction and bank account response DTOs | BLOCKED BY BACKEND | See 18.1. The wrapper copying only displayed fields is defense in depth, not a fix. Bank account response exposure of internal fields was not re-verified in this branch. |
| M-PESA public page | IMPLEMENTED | `app/(public)/pay/page.tsx`, `layout.tsx`. Token read from `#t=`, held in memory, fragment removed, no referrer, noindex. 202 is shown as "received, will be checked", never as paid. |
| M-PESA operator link panel (inspect, issue once with copy, rotate, revoke) | IMPLEMENTED | `features/mpesa/tenant-link-panel.tsx`, tenant workspace "M-PESA link" tab. Non-operational links are shown as not usable. |
| M-PESA submission review queue (REJECT, RETRY_MATCH with reason codes) | IMPLEMENTED | `app/(dashboard)/payments/mpesa-submissions/page.tsx` |
| M-PESA review queue for SUPER_ADMIN (explicit `clientId`) | NOT IMPLEMENTED | API wrapper supports `clientId`; no screen offers it. |
| M-PESA transaction list/detail, merchant profile management, manual Pull | BLOCKED BY BACKEND | No endpoints exist; no UI built. |
| Financial zero-fallback audit | IMPLEMENTED | Section 18. |
| Customer self-service plan upgrade | IMPLEMENTED (removed) | Settings shows subscription and products read-only. |
| Staff estate isolation on `GET /estates` | BLOCKED BY BACKEND | Frontend behaves for a restricted set but is not authorization. |
| Password reset, notifications, settings endpoints, automatic entitlement expiry | BLOCKED BY BACKEND | Not built. |
| Visual redesign pass beyond the screens above | NOT IMPLEMENTED | No dedicated styling pass was done. |
| Automated tests beyond formatting helpers | NOT IMPLEMENTED | Only `financial-values.test.ts` exists. No component or end-to-end tests. |
