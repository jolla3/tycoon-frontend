# Branch Correction Audit

> Audited: 2026-11-18  
> Frontend: jolla3/tycoon-frontend docs/frontend-planning-baseline @ db4b1332f52996cee12a413b835d7b6d1143c07f  
> Backend: jolla3/tycoon-estates-backend main @ db7af3d49e827ede7f2cb9a7dbd88574c69224d9  
> Method: GitHub source inspection and branch comparison. No live browser, deployed API or production database was exercised.

## 1. Status definitions

- CONFIRMED: supported by inspected source at the stated SHA.
- PRESENT ON CORRECTION BRANCH: already implemented and must be preserved.
- REPORTED / NEEDS REPRODUCTION: user observed a fault, but source inspection does not prove its cause.
- BACKEND CAPABILITY GAP: UI must wait for an explicit backend contract.
- UNVERIFIED: evidence is insufficient to design safely.

## 2. Priority findings

### P0 — HouseType create validator drops estateId

**Status: CONFIRMED backend defect; earlier frontend diagnosis was wrong.**

Frontend src/app/(dashboard)/house-types/page.tsx requires an Estate and sends {estateId: formEstateId, ...fields}. Backend createSchema in src/routes/houseType.routes.js omits estateId. Backend service src/services/houseType.service.js requires it, checks Estate belongs to the authenticated client and persists it.

Conclusion: UI sends estateId; backend validation strips it before service receives it. This explains “estateId is required for an Estate-owned HouseType”.

Required fix:
1. Add required estateId to backend createSchema.
2. Keep service ownership validation.
3. Test validator retains estateId, valid client-owned Estate succeeds, missing/foreign Estate fails.
4. Preserve and regression-test the frontend payload.

### P0 — Manual payment cannot identify a historic tenancy

**Status: CONFIRMED cross-layer gap.**

Frontend payment dialog selects houseId and sends no tenancyId. ManualPaymentInput in src/lib/api/payments.ts has no tenancyId. Backend manualPaymentSchema in src/routes/payment.routes.js accepts houseId, amountCents, paymentDate, paymentReference, period and tenantId, but no tenancyId. payment.service.js calls rentService.ensureChargesForHouse without tenancyId.

rent.service.js finds exactly one eligible tenancy for the period or deliberately throws “No unique tenancy for house/period; supply tenancyId explicitly”. An explicit tenancy must belong to the selected house and cover the full period; partial-period billing remains blocked pending policy.

Required fix:
- Align frontend type/dialog, route schema and backend service.
- Auto-resolve only a unique tenancy for the requested period.
- Otherwise present tenant name and occupancy dates; never ask for Mongo ObjectId.
- Validate client, estate, house, tenant and period coverage.
- Use one validated tenancy for charge generation, Payment.tenancyId, allocations and ledger attribution.
- Fail closed when ambiguous/inconsistent. Do not default historic liability to the current tenant.

This is a financial correctness issue, not a cosmetic form issue.

### P0 — Transaction service returns raw Mongoose documents

**Status: CONFIRMED unsafe response-shape risk; exact serialized fields need HTTP-level assertion.**

transaction.service.js returns BankTransaction model documents from both paginated list and unmatched queries. BankTransaction schema includes processingClaimToken, processingClaimExpiresAt, processingAttempts, lastProcessingError and rawPayload. The inspected schema does not mark them select:false and the service has no allowlisted DTO.

Required fix:
1. Define a documented server-side DTO.
2. Use it for list and unmatched routes.
3. Exclude rawPayload, claim tokens, lease/fencing internals, retry/error fields and credentials.
4. Add HTTP serialization tests proving excluded keys are absent.
5. Check list, unmatched and assignment responses.

The source-level unsafe return is confirmed. Do not claim a production leak was captured: no live HTTP response was inspected.

### P1 — Superadmin client detail uses mismatched DTO fields

**Status: CONFIRMED.**

Backend platform.service.js returns:
- subscription {present:true,...} or {present:false};
- M-PESA profiles under mpesa.profiles;
- safe audit actor {id,name,email,role};
- diagnostics outcomes nested under lastOutcome with outcome, finishedAt and forThisClient.

Frontend client detail checks if (!sub), expects mpesaProfiles and renders audit via r.userId. Platform types model a non-discriminated subscription, mpesaProfiles and flattened/userId diagnostics.

Required fix: model backend response directly or deliberately change backend DTO with tests. Handle present:false explicitly; read nested profiles; render actor and nested lastOutcome; test both subscription presence cases.

A subscription with products: [] is not the same as no Subscription document.

### P1 — Superadmin provisioning asks for owner password

**Status: CONFIRMED current design; secure invitation missing.**

Frontend provisioning asks Superadmin for an owner password. Backend accepts it, hashes it and creates an active CLIENT_OWNER. The response omits password, but the administrator still chooses and shares it out of band.

Required backend-first redesign:
- One-time, high-entropy, short-lived and revocable owner setup invite.
- Owner sets their own password.
- Pending/unactivated account until setup completes.
- Audit invite creation, delivery outcome, redemption, expiry and revocation.
- Do not claim invite flow exists until API, persistence, delivery and tests exist.

### P1 — Platform integration monitoring is read-only

**Status: CONFIRMED capability boundary.**

Platform routes expose GET Banking/M-PESA monitors. Integration service is read-only and redacts credential references, tokens and raw payloads. Bank secrets manager uses AES-256-GCM bound to reference/client/provider/version, but inspected platform API has no Superadmin credential create/update/rotate workflow.

SMS provider factory currently supports Celcom; provider configuration comes from server environment variables. No per-client Superadmin SMS configuration lifecycle was identified.

Required correction:
- Keep monitors read-only and label as monitoring/evidence.
- Design separate client-scoped configuration APIs before adding write controls.
- Keep Bank, SMS and M-PESA distinct under neutral Integrations navigation.
- Secrets must be encrypted, write-only, masked, client/provider scoped, audited, rotatable and revocable. Never return plaintext, ciphertext, credential references or provider tokens to browser.

### P1 — Entitlement rule is confirmed; reported subscription loss is not

**Status: entitlement behavior CONFIRMED; customer-specific data loss UNVERIFIED.**

Backend grants BANKING or MPESA only when Client exists, is active and Subscription.products contains the product. It ignores plan, status, startDate/endDate and integration state; no automatic expiry is implemented. products: [] grants neither product; a missing Subscription is different.

Transactions and Banking routes use BANKING; M-PESA collection uses MPESA. /payments and standard /sms routes inspected do not use Banking gate.

Required correction:
1. Inventory live Client/Subscription records read-only before any write.
2. Distinguish missing subscription, products: [] and assigned products.
3. Obtain approved entitlement mapping before granting or migrating.
4. Never silently backfill or mutate customer subscriptions.
5. Display 403 PRODUCT_NOT_ENTITLED with product/reason.
6. Do not block posted Payments or ordinary SMS due to missing Banking entitlement.

### P1 — Responsive pages need viewport acceptance

**Status: REPORTED / NEEDS REPRODUCTION.**

Platform shell has responsive drawer and shared DataTable has mobile-card rendering. This does not prove all filters, forms, tabs, detail panels, dialogs and action menus fit mobile.

Test 320, 360, 390, 768, 1024 and 1440 CSS-pixel widths. Verify no unintended page overflow, clipped controls, inaccessible actions or broken drawer/focus behavior. Do not dismiss user report based on media queries alone.

### P1 — Dashboard Overview/toolbar failure needs reproduction

**Status: REPORTED / NEEDS REPRODUCTION.**

Dashboard uses period context and reports dashboard API. Source does not establish cause of reported toolbar/Overview failure.

Required evidence: deployed frontend SHA, URL, exact interaction, viewport, browser console trace, failed network request/status/response and affected user role. Do not rewrite dashboard or claim a root cause before capture.

### P2 — Investor/bank-view conflict is unresolved

**Status: UNVERIFIED.**

No Investor model or route was identified in the checked backend model/route tree or backend source search. The report could refer to another branch or deployment, but this audit cannot establish that.

Obtain a screen/data example and define whether Investor is a separate role, stakeholder relationship or another concept. Specify client/estate/bank scope, read-only versus mutation rights and audit requirements. Do not invent an Investor role or expose statements to an undefined audience.

## 3. Features already present on the correction branch

| Feature | Source | Regression requirement |
|---|---|---|
| Public M-PESA submission | src/app/(public)/pay/page.tsx | Fragment token only, memory-only, fragment cleared, no token in telemetry/storage |
| Tenant M-PESA controls | src/features/mpesa/tenant-link-panel.tsx and tenant workspace | Inspect/issue/rotate/revoke; raw token shown once |
| M-PESA submission queue | src/app/(dashboard)/payments/mpesa-submissions/page.tsx | REJECT/RETRY_MATCH with reason codes only; no approve/force-match |
| Transaction entitlement UX | src/app/(dashboard)/transactions/unmatched/page.tsx | Product denial distinct from generic error |
| Server-side estate filtering | transaction list/unmatched pages | Estate scope sent to API/cache key; backend remains security authority |
| HouseType estate payload | src/app/(dashboard)/house-types/page.tsx | Keep estateId in create request while backend schema is fixed |

M-PESA 202 means evidence received for processing, not confirmed receipt, matched payment, posted ledger entry or allocation.

## 4. Stale or contradictory root documentation

Root PRD and architecture describe older frontend/backend source SHAs. This audit uses the newer SHAs at the top.

Confirmed examples:
- Root PRD and endpoint matrix claim HouseType UI omits estateId. The form sends it; backend route schema omits it.
- Older M-PESA sections say the frontend feature is absent while this branch implements public submission, tenant link panel and review queue.
- Older architecture text says no M-PESA wrapper/page exists while later sections say it is implemented.
- Older manual-payment alignment text does not account for the tenancy identity required by rent service.

This pack supplements instead of silently overwriting permanent docs. During implementation, update root PRD, architecture and endpoint/screen matrix where verified contracts changed.

## 5. Repair sequence

| Order | Work | Reason |
|---|---|---|
| 1 | Refresh backend SHA; fix HouseType create validator and tests | Clear backend defect blocks current workflow |
| 2 | Add manual-payment tenancy identity end to end | Prevents historic misattribution |
| 3 | Add safe BankTransaction DTO and HTTP serialization tests | Protects internal provider/processing data |
| 4 | Align Superadmin response DTOs | Makes existing platform detail truthful |
| 5 | Implement secure owner invite/setup | Removes shared administrator-selected password |
| 6 | Design client-scoped Banking/SMS/M-PESA settings | Current monitors are read-only |
| 7 | Reproduce dashboard and responsive reports | Evidence before code |
| 8 | Resolve Investor/bank view with policy and repro | Avoid invented access rules |
| 9 | Run backend/frontend/browser acceptance | Verify integrated behavior |

## 6. Verification ledger

| Check | Status |
|---|---|
| Frontend branch/commit and divergence comparison | Inspected |
| Backend main/commit and relationship to G5 ancestor | Inspected |
| Relevant backend routes, validators, middleware, services and models | Source-inspected |
| Relevant frontend pages, API wrappers and DTO types | Source-inspected |
| Backend tests | Not run |
| Frontend lint/typecheck/tests/build | Not run |
| Live API contract tests | Not run |
| Browser/mobile viewport tests | Not run |
| Deployed Dashboard reproduction | Not run |
| Live subscription inventory | Not available; no DB query run |
| Exact production BankTransaction JSON | Not captured; source-level raw-model response needs serialization test |

No production database, credentials, live provider or deployed browser session was accessed. This audit does not claim application defects were fixed or runtime acceptance passed.

## 7. Source evidence

Frontend correction branch:
- HouseType form: https://github.com/jolla3/tycoon-frontend/blob/docs/frontend-planning-baseline/src/app/%28dashboard%29/house-types/page.tsx
- Manual payment: https://github.com/jolla3/tycoon-frontend/blob/docs/frontend-planning-baseline/src/app/%28dashboard%29/payments/page.tsx
- Payment API type: https://github.com/jolla3/tycoon-frontend/blob/docs/frontend-planning-baseline/src/lib/api/payments.ts
- Public M-PESA page: https://github.com/jolla3/tycoon-frontend/blob/docs/frontend-planning-baseline/src/app/%28public%29/pay/page.tsx
- Tenant link panel: https://github.com/jolla3/tycoon-frontend/blob/docs/frontend-planning-baseline/src/features/mpesa/tenant-link-panel.tsx
- M-PESA queue: https://github.com/jolla3/tycoon-frontend/blob/docs/frontend-planning-baseline/src/app/%28dashboard%29/payments/mpesa-submissions/page.tsx
- Unmatched transactions: https://github.com/jolla3/tycoon-frontend/blob/docs/frontend-planning-baseline/src/app/%28dashboard%29/transactions/unmatched/page.tsx
- Platform client detail: https://github.com/jolla3/tycoon-frontend/blob/docs/frontend-planning-baseline/src/app/%28platform%29/platform/clients/%5BclientId%5D/page.tsx
- Platform DTOs: https://github.com/jolla3/tycoon-frontend/blob/docs/frontend-planning-baseline/src/lib/api/platform/types.ts
- Dashboard: https://github.com/jolla3/tycoon-frontend/blob/docs/frontend-planning-baseline/src/app/%28dashboard%29/dashboard/page.tsx

Backend main:
- HouseType route/service: https://github.com/jolla3/tycoon-estates-backend/blob/main/src/routes/houseType.routes.js and https://github.com/jolla3/tycoon-estates-backend/blob/main/src/services/houseType.service.js
- Payment route/service: https://github.com/jolla3/tycoon-estates-backend/blob/main/src/routes/payment.routes.js and https://github.com/jolla3/tycoon-estates-backend/blob/main/src/services/payment.service.js
- Rent service: https://github.com/jolla3/tycoon-estates-backend/blob/main/src/services/rent.service.js
- Tenancy service: https://github.com/jolla3/tycoon-estates-backend/blob/main/src/services/tenancy.service.js
- Transaction route/service: https://github.com/jolla3/tycoon-estates-backend/blob/main/src/routes/transaction.routes.js and https://github.com/jolla3/tycoon-estates-backend/blob/main/src/services/transaction.service.js
- BankTransaction model: https://github.com/jolla3/tycoon-estates-backend/blob/main/src/models/BankTransaction.js
- Entitlement service: https://github.com/jolla3/tycoon-estates-backend/blob/main/src/services/entitlement.service.js
- Platform routes/service: https://github.com/jolla3/tycoon-estates-backend/blob/main/src/routes/platform.routes.js and https://github.com/jolla3/tycoon-estates-backend/blob/main/src/services/platform.service.js
- Platform integrations: https://github.com/jolla3/tycoon-estates-backend/blob/main/src/services/platformIntegrations.service.js
- Bank secrets manager: https://github.com/jolla3/tycoon-estates-backend/blob/main/src/services/banking/secretsManager.js
- SMS provider factory: https://github.com/jolla3/tycoon-estates-backend/blob/main/src/services/sms/sms.factory.js

---

## Addendum — verification pass 2026-11-18 (pre-implementation gate)

> Frontend inspected: `docs/frontend-planning-baseline` @ `692c8eb46e65b4678e50c14edb6620a6022fa0fd` (clean tree; ahead of the `db4b133` cited above only by the docs commit).  
> Backend inspected: `main` @ `db7af3d49e827ede7f2cb9a7dbd88574c69224d9` (clean; still the HEAD when re-verified).  
> Method: source reading of both repos. No MongoDB, deployed API or browser was available, so nothing below is runtime-proven; every item says what kind of evidence backs it.

### A1. Evidence table

| Finding | Frontend evidence | Backend evidence | Conclusion |
|---|---|---|---|
| HouseType create drops `estateId` | `house-types/page.tsx` builds `{estateId: formEstateId, ...}`; `CreateHouseTypeInput` has `estateId` | `houseType.routes.js` `createSchema` has no `estateId`; `validate()` replaces `req.body` with the parsed result, stripping unknown keys; `houseType.service.create` throws when `data.estateId` is missing | CONFIRMED backend defect (source). Frontend is correct. |
| Manual payment has no tenancy identity | `payments.ts` `ManualPaymentInput` and `RecordPaymentDialog` send `{houseId, amountCents, paymentReference}`; no period, no tenancy | `manualPaymentSchema` has no `tenancyId`; `payment.service.recordManual` is a legacy path (see A2) | CONFIRMED larger than previously documented. |
| BankTransaction raw docs | `transactions.ts` `toSafe()` copies a field subset (defence in depth only, not a control) | `transaction.service` `list`/`unmatched`/`assignToHouse` return Mongoose documents; model carries `processingClaimToken`, `rawPayload`, etc. | CONFIRMED at source; no live response captured. |
| Superadmin client detail DTO mismatch | `[clientId]/page.tsx`, `platform/types.ts` | `platform.service.getClient`, `platformIntegrations.service` | CONFIRMED (A3). |
| Subscription states conflated | `ProductChips` has the three states, but callers pass wrong flags (A3) | `getClient` returns `subscription: {present:false}` for none | CONFIRMED UI defect. |
| Entitlement rule | `isProductNotEntitled` + `ProductEntitlementBlocked` used in unmatched page | `requireProduct` + `entitlement.service`: Client active AND `Subscription.products` contains product; reasons `SUBSCRIPTION_MISSING` / `PRODUCT_NOT_ASSIGNED`; 403 `PRODUCT_NOT_ENTITLED` with `details:{product,reason}` | Rule confirmed; frontend handling exists and must be preserved. |

### A2. Manual payment: what the source actually does (supersedes the P0 description above where they differ)

`payment.service.recordManual` (backend main) is not the hardened posting path:

1. Tenant defaults to `house.tenantId` (the CURRENT tenant), regardless of period.
2. `ensureChargesForHouse` is called without `tenancyId`; when no unique tenancy covers the period it throws “No unique tenancy for house/period; supply tenancyId explicitly”. A mid-period move-in is a likely trigger (full-period eligibility requires `startAt <= periodStart` and `endAt` null or `>= nextPeriodStart`). Not reproduced at runtime.
3. Allocation and `Payment.tenancyId` use `getActiveForHouse` (the CURRENT tenancy), not the tenancy that owns the charges.
4. The ledger PAYMENT entry is posted without `tenancyId`; `ledger.service.postEntry` requires `tenancyId` for RENT PAYMENT/CHARGE. Per source reading this fails closed rather than posting.
5. Idempotency is a soft house+reference+amount check.

The canonical, hardened writer is `accountingPostingService.postConfirmedPayment` (tenancy lock, allocation revision CAS, idempotency; used by reconciliation `applyPayment` and `transaction.assignToHouse`). Correction = make `recordManual` resolve one validated tenancy and delegate to it, not duplicate its logic.
Deployment dependency: manual-reference idempotency relies on the G3.3 unique index `uniq_client_manual_payment_reference` (verifier: `utils/manualPaymentIndexReadiness.js`); without it posting returns 503. Index presence is not verified here.

Case matrix required for tests: unique current; unique historic; multiple eligible; none; tenancy on another house; tenancy on another client; tenant/tenancy mismatch; period not fully covered; duplicate reference.
Open owner-policy question: partial-period (mid-month move-in/out) billing remains blocked; the UI must explain this and must not invent proration.

### A3. Superadmin DTO mismatches (verified against source)

| UI/type assumption | Backend shape |
|---|---|
| `if (!sub)` means no subscription | `subscription` is `{present:false}` when none; truthy object either way |
| `mpesaProfiles`, `bankingSummary` top-level | nested `mpesa.profiles`, `banking` |
| audit row `userId` / `_id` | `actor` (safe subset) |
| flattened `lastOutcome` fields | nested `lastOutcome` |
| `operationalAccess` flat | `operationalAccess.entitlement` |

Distinguish three states: no Subscription (`present:false`, `SUBSCRIPTION_MISSING`); Subscription with `products: []` (`PRODUCT_NOT_ASSIGNED`); Subscription with BANKING and/or MPESA. Never auto-grant or create a subscription from the UI; the PATCH route updates an existing subscription only.

### A4. Verification constraints of this pass

- No MongoDB binary or container was obtainable (download hosts blocked; a conda bootstrap was refused by the environment's safety classifier and was not worked around). DB-backed backend integration tests (`describeWithMongo`) skip without `MONGODB_URI` + `TYCOON_ALLOW_DESTRUCTIVE_TEST_DB=1` + a `tycoon_test_*` replica-set database. They can be written but not executed here.
- Frontend has a single existing test file (`lib/formatting/financial-values.test.ts`); new vitest tests are needed for every UI correction.
- Push to both repos was authorized for this session after the repositories were attached; verified with `git push --dry-run` only.

### A5. Implementation status (2026-11-19)

| Item | Where | Status |
|---|---|---|
| HouseType create `estateId` | Backend `fix/frontend-contract-p0` `5e924d9` | Implemented; 5 zod unit tests pass. Service-level foreign-estate test not written (needs DB). Not merged/deployed. |
| Safe BankTransaction DTO | Backend `fc703d2` | Implemented for list, unmatched, assign; 4 unit tests pass (JSON of a Mongoose doc has no internal field). Route-level HTTP test not run. Not merged/deployed. |
| Manual payment tenancy | Backend `2c44caa`; frontend `75bd69a` | Implemented. 12 unit tests pass (resolver + schemas). 9 DB integration tests written, **not executed** (no MongoDB here). Not merged/deployed. |
| Superadmin DTO alignment | Frontend `d7e0abf` | Implemented; typecheck/lint/build pass; 5 unit tests on subscription states. No browser check. |
| Entitlement UX | Existing | `ProductEntitlementBlocked` handling in transactions/unmatched preserved; diagnostics now shows per-product reason. No change to BANKING/MPESA gates. |

New backend surface (not previously existing): `GET /payments/manual-options?houseId&period` (CLIENT_OWNER/CLIENT_ADMIN). Changed behaviour: `POST /payments` now requires a tenancy that fully covers the period; a duplicate `paymentReference` per client is idempotent only when all details match, otherwise 409; `tenantId`/`houseId` must be 24-hex ids; invalid `paymentDate` is rejected.

Known limits: historic-period charges are generated from the house's current billing plan (same as before); partial-period billing remains blocked; manual posting still needs the G3.3 unique index to exist in the target database (503 otherwise); the frontend dialog is unusable against a backend without `manual-options`.

Backend unit suite on the branch: 6 suites fail identically on the base commit because required environment variables (e.g. `COOKIE_SECRET`) are absent here; no new failures.
