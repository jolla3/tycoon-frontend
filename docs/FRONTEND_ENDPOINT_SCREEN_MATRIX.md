# Frontend Endpoint-to-Screen Matrix

> Audited: 2026-11-15  
> Frontend source baseline: `jolla3/tycoon-frontend` `main` @ `dc34279bc8f8fcf98ffc9ce5029a7ea38c4f059d`  
> Backend API baseline: `jolla3/tycoon-estates-backend` `main` @ `5aa05a2e81cb1ddc97f5507341a54a6b4a47ecb4`  
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
- Platform: overview, clients, users, subscriptions, audit, health.

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
| `GET /house-types/:id/workspace` | House-type portfolio summary | `houseTypesApi.workspace` | `/house-types/workspace` | Client session | Wired |
| `POST /house-types` | Create house type | `houseTypesApi.create` | `/house-types` | CLIENT_OWNER / CLIENT_ADMIN | Wired |
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
| `POST /billing/generate` | Generate period RentCharges | `billingApi.generate` | No dedicated generation surface found in checked route tree | CLIENT_OWNER / CLIENT_ADMIN | **Partial: wrapper without clear UI action** |
| `GET /billing/houses/:houseId/account` | House account, charges, payments, totals | `billingApi.houseAccount` | House workspace | Client session | Wired |
| `GET /payments` | List posted Payment records | `paymentsApi.list` | `/payments`, tenant/house views | Client session | Wired |
| `POST /payments` | Record manual payment and allocation | `paymentsApi.create` | `/payments` | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `GET /deposits/:tenantId` | Read deposit account | `depositsApi.get` | Tenant workspace / Deposit tab | Client session | Wired |
| `POST /deposits/:tenantId/require` | Set deposit requirement | `depositsApi.require` | Tenant workspace / Deposit tab | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `POST /deposits/:tenantId/pay` | Record deposit payment | `depositsApi.pay` | Tenant workspace / Deposit tab | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `POST /deposits/:tenantId/deduct` | Record deposit deduction | `depositsApi.deduct` | Tenant workspace / Deposit tab | CLIENT_OWNER / CLIENT_ADMIN | Wired |
| `POST /deposits/:tenantId/settle` | Settle deposit | `depositsApi.settle` | Tenant workspace / Deposit tab | CLIENT_OWNER / CLIENT_ADMIN | Wired |

The current Billing API wrapper also includes charge generation, but no dedicated Billing route appears in the current App Router and no clear `billingApi.generate` call was found in the inspected dashboard/payment/house screens. A billing-generation control is a product requirement; add it to a deliberate operational surface with confirmation and permission checks.

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

The backend already has a tenant link/submission/review flow. The frontend has no `mpesa-collection` API module, no tenant `/pay` page, and no operator link/review surface in the checked source.

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

- Put link inspect/issue/revoke on the tenant workspace; do not create a parallel tenant-management app.
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
| P1 | Add billing generation action | Backend route and wrapper exist, but no UI action was identified | Confirm allowed period/estate validation and permission handling |
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
