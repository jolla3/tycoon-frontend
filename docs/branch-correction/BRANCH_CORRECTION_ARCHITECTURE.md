# Branch Correction Architecture

> Audited: 2026-11-18  
> Frontend: docs/frontend-planning-baseline @ db4b1332f52996cee12a413b835d7b6d1143c07f  
> Backend source of truth: main @ db7af3d49e827ede7f2cb9a7dbd88574c69224d9

## 1. Architecture boundary

The frontend is an operational client, not a second financial domain service. The audited frontend stack is Next.js App Router, React, TypeScript, MUI and TanStack Query. It uses the backend cookie session through a shared API client; authenticated requests include credentials and follow backend CSRF requirements.

The backend is an Express API under /api/v1 using Mongoose/MongoDB. Backend middleware owns authenticated identity, client/estate scope, role authorization, product entitlements, validation and error responses. Domain services own tenancy, billing, allocations, reconciliation, payment posting and provider behavior.

Request flow:

Browser page/dialog → API wrapper → HTTP route → authentication/session middleware → clientContext → product/role gates → request validation → controller → domain service → database/provider boundary → response DTO.

Inspect the actual route to establish middleware order. Public M-PESA submission is a deliberate exception: it is unauthenticated, uses a short-lived body token and has separate public-route guards.

## 2. Audited source snapshots

| Component | Ref | SHA | Note |
|---|---|---|---|
| Frontend correction | docs/frontend-planning-baseline | db4b1332f52996cee12a413b835d7b6d1143c07f | Includes M-PESA page/link/review and updated transaction filtering |
| Frontend main | main | f3aaa0cfec15a2ea50ed635a53eb8ccd6f21fbd2 | Correction branch two ahead/one behind; diverged |
| Backend authority | main | db7af3d49e827ede7f2cb9a7dbd88574c69224d9 | Contract snapshot used |
| Older backend G5 ancestor | feature/g5-construction | 0df6f23bbd9a79c94fdffa368622a683c3ba35a7 | Backend main is 16 commits ahead |

Refresh these SHAs before implementation; they are audit evidence, not permanent pins.

## 3. Identity, scope and authorization

Backend clientContext derives Client identity from the authenticated session and removes clientId, userId and role from request bodies. It validates requested estateId against the user's allowed estates and derives a server-side estate filter consumed by services.

Frontend estate selectors and local filtering are presentation only. Every list, detail and mutation must remain scoped by backend client and estate authorization.

### Product entitlement

The canonical rule is: Client exists, Client.isActive is true, and Subscription.products contains the requested product. It is not inferred from plan, subscription status, start/end dates, payments, bank connections or merchant profiles. Automatic date/status expiry is not implemented.

The backend returns 403 PRODUCT_NOT_ENTITLED with product and reason.

| Route family | Inspected gate |
|---|---|
| /bank/* | BANKING |
| /transactions, /transactions/unmatched, /transactions/:id/assign | BANKING |
| /mpesa-collection/* | MPESA |
| /payments | No Banking product gate in inspected route |
| /sms/* | No Banking product gate in inspected route |
| /public/mpesa/submissions | Public token flow, not client-session entitlement middleware |

Do not block unrelated rent operations or posted-ledger Payments because Banking is not assigned.

## 4. Domain records and financial ownership

| Record | Meaning | Boundary |
|---|---|---|
| Estate | Client-owned property grouping | Must belong to authenticated Client |
| House | Physical rental unit | Current occupancy is not historic liability identity |
| Tenant | Person/payer identity | Not equivalent to a tenancy |
| Tenancy | Time-bounded tenant-house relationship | Identity for period-specific charge/payment attribution |
| RentCharge | Period and charge-type liability | Must reference correct tenancy |
| Payment | Posted/reversed rent ledger movement | Carries house/tenant/tenancy and allocation evidence |
| BankTransaction | Imported bank record | Reconciliation source, not a posted payment by itself |
| MpesaSubmission | Tenant-pasted SMS evidence/review state | Evidence, not canonical receipt/payment |
| MpesaTransaction | Canonical provider receipt | Distinct from SMS evidence and Payment |

Amounts are integer cents. The backend remains authoritative for allocation, balances and posting. Unknown balances must remain unknown, not display as zero. Keep current-tenancy liability separate from closed-tenancy history and unattributed legacy balances.

## 5. Verified backend contracts and required corrections

### 5.1 HouseType create

POST /api/v1/house-types is implemented. The frontend form already selects and sends estateId. However, src/routes/houseType.routes.js createSchema omits estateId. The service in src/services/houseType.service.js requires it, verifies Estate by identifier and clientId, and persists the ownership link. Route validation therefore strips the frontend field before the service receives it.

Correction: include a required valid estateId in createSchema, keep service ownership validation, and test valid plus cross-client Estate cases. Do not call this a missing frontend payload.

### 5.2 Manual payment and tenancy identity

POST /api/v1/payments currently accepts houseId, amountCents, paymentDate, paymentReference, period and tenantId. It does not accept tenancyId. The frontend manual-payment dialog selects a house but sends no tenancyId.

The payment service calls rentService.ensureChargesForHouse without tenancyId. The rent service resolves exactly one eligible tenancy for the requested period or throws “No unique tenancy for house/period; supply tenancyId explicitly”. An explicit tenancy must belong to the selected house and cover the full period; partial-period billing remains blocked pending policy.

Required end-to-end contract:
1. Auto-resolve only when exactly one eligible tenancy covers the period.
2. For historic/ambiguous cases, present human-readable tenant and occupancy dates, never raw database IDs.
3. Add tenancyId to frontend input, HTTP validator and backend service if explicit selection is supported.
4. Validate client, estate, house, tenant consistency and period coverage.
5. Use the same tenancy for charge generation, Payment.tenancyId, allocations and ledger attribution.
6. Fail closed when identity or period coverage is ambiguous.

A house selected today does not prove which tenant occupied it during an older payment period. Do not default historical payments to the current tenant.

### 5.3 Safe BankTransaction DTO

BankTransaction model contains processingClaimToken, processingClaimExpiresAt, processingAttempts, lastProcessingError and rawPayload. The transaction service returns Mongoose documents directly from list and unmatched queries. The inspected schema does not mark these fields select:false and the service has no safe DTO allowlist.

Correction: return a documented allowlisted DTO for both routes. It may include user-facing identity, dates, amount/currency, reference/narration, direction, match status, safe processing status and necessary assignment details. Exclude rawPayload, claim tokens, lease/fencing internals, retry/error details and credentials. Test actual serialized JSON; filtering React columns is not a security control.

### 5.4 M-PESA collection

Authenticated /api/v1/mpesa-collection routes use authentication, clientContext and requireProduct('MPESA'). They expose tenant account/payments, link inspect/issue/revoke and submission list/resolve.

Public POST /api/v1/public/mpesa/submissions accepts token and SMS text in the body and is mounted separately from authenticated routes.

The correction branch already implements:
- /pay public tenant page with token in URL fragment #t=...;
- tenant workspace link inspection, issue, rotate and revoke;
- submission queue with REJECT and RETRY_MATCH reason codes.

Capture the fragment client-side, keep token in memory and clear it from the address bar. Do not put token or SMS text in analytics, browser storage, logs, telemetry or persistent query cache. HTTP 202 means evidence received for processing, not payment confirmation, provider receipt, successful match, posting or allocation.

No canonical MpesaTransaction list/read endpoint was identified in the inspected route tree. Do not build a receipt inbox or invent an endpoint.

### 5.5 Superadmin platform

Platform routes require authenticate and SUPER_ADMIN. Current APIs cover overview, health, client list/provision/detail/update, existing subscription patch, entitlement inventory, activation/deactivation, client diagnostics, Banking/M-PESA monitors, users, audit and subscriptions.

Current backend response facts:
- Client detail returns subscription {present:true,...} or {present:false}, not null.
- Safe M-PESA profiles are nested at client.mpesa.profiles.
- Safe audit rows expose actor {id,name,email,role}, not userId.
- Diagnostics job outcomes nest outcome, finishedAt and forThisClient inside jobOutcomes[].lastOutcome.
- Subscription PATCH updates an existing Subscription; it cannot create a missing one.
- Inspected update schema does not expose status mutation.
- Provisioning accepts a Superadmin-supplied owner password, hashes it and creates an active CLIENT_OWNER. Secure owner invitation/setup is not already implemented.

Frontend platform detail/types do not fully model these response shapes. Model backend fields exactly or deliberately change the backend DTO with tests.

### 5.6 Integration credentials

The backend has a bank secrets manager using AES-256-GCM. Credential ciphertext is bound to reference, client owner, provider and version. This is a security primitive, not proof that Superadmin has a credential-management API.

Current platform Banking/M-PESA endpoints are read-only monitoring/evidence. They do not create or rotate client integration credentials.

The inspected SMS provider factory supports Celcom and reads provider configuration from server environment variables including CELCOM_BASE_URL, CELCOM_PARTNER_ID, CELCOM_API_KEY and CELCOM_SENDER_ID. It is not a per-client Superadmin configuration store.

Before configuration forms exist, backend work must define client-scoped create/update/validate/rotate/revoke APIs, provider schemas/versions, encryption/key rotation, safe masked metadata, audit and disable semantics. Browser responses must never contain plaintext secrets, ciphertext, credential references or provider tokens. Use write-only secret entry and show safe presence/validation state.

A neutral Integrations navigation grouping may contain distinct Banking, SMS and M-PESA connectors. Do not conflate their data records or entitlements.

## 6. Superadmin DTO mapping checklist

| Backend response | Existing frontend expectation | Required handling |
|---|---|---|
| subscription: {present:false} | falsy/null subscription | Branch on present === false |
| subscription: {present:true,...} | plain subscription fields | Model presence discriminator |
| mpesa.profiles[] | mpesaProfiles[] | Read nested path or deliberately change backend DTO |
| recentAudit[].actor | recentAudit[].userId | Render actor object |
| jobOutcomes[].lastOutcome | flattened outcome/finishedAt | Model nested result and forThisClient |

### Support access and Investor

Diagnostics reads selected-client records without acting as that client's user. It is not impersonation. Any future support-access feature requires approval, just-in-time short-lived scope, reason/ticket, visible support session, audit of every action and read-only defaults. Never share a customer password or silently replace the actor.

No Investor model or route was identified in the checked backend model/route tree or source search. Treat the reported Investor/bank-view conflict as unresolved until a reproducible screen/data example and approved access rules exist.

## 7. Frontend state and responsive behavior

Use the shared API client and domain wrappers. TanStack Query keys must include identity, estate scope, filters and pagination. Invalidate affected resources after successful mutations. Show freshness for cached financial reads and require live server confirmation for financial writes.

Types must model actual backend DTOs. Mark unknown shapes as unknown rather than guessing. Do not persist M-PESA tokens, credentials or submitted SMS evidence in browser storage or telemetry.

The platform shell has a responsive drawer and DataTable supports mobile cards. That does not establish whole-page responsiveness. Test routes at 320, 360, 390, 768, 1024 and 1440 CSS-pixel widths, including filters, tabs, dialogs, action menus, long values and error states.

Dashboard calls the reports dashboard endpoint using the selected period. The reported toolbar/Overview issue was not proven by source inspection. Require deployed commit, reproduction, console trace and failing network response before claiming a cause.

## 8. Verification architecture

Backend tests: validation retention, client/estate authorization, entitlement gates, tenancy eligibility, transaction atomicity and response serialization.

Frontend tests: request payloads, DTO fixtures, 403 handling, query invalidation, mobile interactions and token handling.

Browser acceptance: entitled/non-entitled BANKING and MPESA clients, posted Payments and standard SMS without Banking, HouseType creation, current/historic/ambiguous manual payments, safe transaction JSON, Superadmin missing/present subscriptions and public M-PESA lifecycle.

A source/documentation audit is not a successful runtime test. Record exact frontend/backend SHAs and actual commands/results.
