# Branch Correction Scope

> Status: reviewed branch-specific correction plan; documentation only  
> Audited: 2026-11-18  
> Frontend: jolla3/tycoon-frontend, docs/frontend-planning-baseline @ db4b1332f52996cee12a413b835d7b6d1143c07f  
> Backend source of truth: jolla3/tycoon-estates-backend, main @ db7af3d49e827ede7f2cb9a7dbd88574c69224d9

## 1. Purpose and boundaries

This pack guides correction work on the current frontend branch. It supplements, and does not replace, the permanent root PRD, architecture document or endpoint/screen matrix. Those files contain older baselines and some statements now contradicted by source.

The frontend branch already contains the M-PESA public page, tenant link controls, submission review queue and updated transaction filtering/entitlement handling. Preserve and regression-test those features; do not call them missing work.

The frontend is an operational client. The backend owns authorization, client/estate scope, tenancy selection, billing, allocations, ledger posting, provider credentials and canonical financial records.

## 2. Mandatory backend-first workflow

Before any frontend implementation, the agent MUST:

1. Fetch the latest backend target branch and record its exact SHA.
2. Inspect relevant route mounting, routes, validation schemas, middleware order, controllers, services, models, serializers, migrations/indexes and tests.
3. Trace the operation from HTTP route through validation/authorization, controller and service to database/provider behavior and response.
4. Record actual HTTP method/path, request fields, response DTO, authentication/session, roles, product gates, client/estate scope, pagination and error envelope.
5. Compare that contract with frontend API wrappers, TypeScript types, query keys, page/dialog state and mutation payload.
6. Classify each discrepancy as frontend defect, backend defect, shared contract defect, missing backend capability or unverified runtime report.
7. Update correction docs and affected permanent contract docs before coding. Never invent routes, fields, permissions, statuses or response shapes.
8. Add tests at the layer where the defect exists. A frontend workaround must not hide a backend security or financial-integrity defect.

Repeat the backend inspection when its target branch changes. Chat summaries, screenshots, previous generated types and stale docs are not API authority.

## 3. Baselines and branch boundaries

Frontend target: docs/frontend-planning-baseline at db4b1332f52996cee12a413b835d7b6d1143c07f. Frontend main was f3aaa0cfec15a2ea50ed635a53eb8ccd6f21fbd2. The branches were diverged: correction branch two commits ahead and one behind main. This documentation task must not merge, rebase or force-push either branch.

Backend main inspected: db7af3d49e827ede7f2cb9a7dbd88574c69224d9. The old feature/g5-construction ref at 0df6f23bbd9a79c94fdffa368622a683c3ba35a7 is an ancestor; backend main is 16 commits ahead. Do not use that older ref as the current API contract.

## 4. Correction goals

### Financial correctness and tenancy identity
- Preserve the distinction between House, Tenant, Tenancy, RentCharge, Payment and BankTransaction.
- Manual payment generation and attribution must use the tenancy covering the payment period.
- Resolve tenancy automatically only when the backend proves it is unique. Otherwise offer human-readable tenancy choices or fail closed.
- Never ask an operator to type a MongoDB ObjectId.
- Do not attribute historic or unattributed charges to the current tenant without backend evidence.
- Unknown or unverified balances must not be shown as zero.

### Estate ownership and scope
- Fix HouseType create validation so the backend accepts estateId already sent by the frontend form.
- Keep service validation that the selected Estate belongs to the authenticated Client.
- Keep estate authorization on the server; client-side filtering is not security.

### Safe bank transaction responses
- Replace raw BankTransaction model responses with a server-side allowlisted DTO.
- Exclude raw provider payloads, processing claim tokens, lease/fencing data, internal retry/error state and secrets.
- Test serialized API JSON, not merely visible table columns.

### Product access and subscriptions
- Subscription.products is the entitlement source. Bank connections and merchant profiles do not grant products.
- Display PRODUCT_NOT_ENTITLED as a clear access state, not a generic server error.
- Do not block posted-ledger Payments or ordinary SMS merely because Banking is absent; inspect the actual route gates.
- Do not assume subscription loss without read-only customer/database evidence.
- Never silently grant products or rewrite subscription dates/status.
- Do not invent automatic expiry: the inspected entitlement service ignores status and start/end dates.

### Superadmin and integrations
- Separate read-only platform monitoring from credential administration.
- Replace Superadmin-selected/shared owner passwords with backend-supported one-time owner invitation/setup.
- Define supported client-scoped Banking, SMS and M-PESA configuration workflows before exposing controls.
- Secrets must be write-only, encrypted server-side, client/provider scoped, redacted from logs/audit metadata, rotatable and revocable.
- Use a neutral Integrations navigation group while preserving distinct Banking, SMS and M-PESA types and gates.
- Diagnostics is not impersonation. Any support access needs a separately approved, time-limited and audited security design.

### Reported usability issues
- Reproduce Dashboard Overview/toolbar failure with deployed commit, browser console and network evidence before diagnosing it.
- Test Superadmin/client routes at real viewport widths. Responsive shell/table components do not prove all screens are responsive.
- Treat the Investor/bank-view conflict as unverified. No Investor model/API was identified in the inspected backend routes/models/search. Do not invent one.

## 5. Requirements and acceptance criteria

| ID | Requirement | Acceptance evidence |
|---|---|---|
| BC-01 | HouseType create accepts estateId end to end | Schema retains field; service checks Estate ownership; valid create succeeds; missing/foreign Estate fails |
| BC-02 | Manual payment identifies tenancy | Frontend type/dialog, route schema and service agree; tenancy is resolved or selected for the period |
| BC-03 | Payment attribution is consistent | Same validated tenancy used for charges, Payment.tenancyId, allocations and ledger |
| BC-04 | Bank transaction responses are safe | List/unmatched use documented DTO; JSON excludes rawPayload, processingClaimToken and internal fields |
| BC-05 | Entitlement UX is accurate | BANKING/MPESA 403 shows product/reason; Payments/standard SMS are not blocked by Banking-only entitlement |
| BC-06 | Subscription state is truthful | {present:false} differs from products: []; no silent backfill or invented expiry |
| BC-07 | Platform DTOs match | Correct subscription presence, nested M-PESA profiles, actor-shaped audit and nested job outcomes |
| BC-08 | Owner onboarding is safe | One-time, short-lived, revocable invite; no shared temporary password; actions audited |
| BC-09 | Integration settings are safe | Backend APIs first; secrets encrypted, write-only, redacted, scoped, rotated and revocable |
| BC-10 | Responsive acceptance passes | No unintended overflow/clipping at 320, 360, 390, 768, 1024 and 1440 CSS px |
| BC-11 | Dashboard issue is reproduced | Deployed commit, viewport, steps, console and failed request/response recorded |
| BC-12 | M-PESA evidence remains distinct | Fragment token is memory-only; 202 means received for processing, not paid |
| BC-13 | Investor behavior is not guessed | Repro and approved role/data-scope rules before implementation |

## 6. Existing functionality to preserve

On this branch:
- Public tenant submission page exists at /pay and reads a fragment token.
- Tenant workspace has M-PESA link inspect/issue/rotate/revoke controls.
- M-PESA submissions queue supports REJECT and RETRY_MATCH with reason codes, not payment approval.
- Transactions and unmatched screens pass estate scope to the server and handle entitlement denial.
- HouseType create form already includes estateId in its request payload.

Regression-test these while fixing underlying contracts. A M-PESA 202 response means evidence was received for processing; it is not a confirmed payment.

## 7. Non-goals

Do not replace root PRD/architecture, merge the frontend branch, touch unrelated application code in this docs-only task, invent a tenant portal/checkout/receipt inbox/manual Pull endpoint, add client-side ledger posting, silently migrate subscriptions or grant entitlements, or implement Investor permissions/impersonation without verified rules and backend support. Do not claim runtime tests passed from a source-only audit.

## 8. Implementation order

1. Refresh backend baseline and repeat contract inspection.
2. Fix HouseType create validation and tests.
3. Add manual-payment tenancy identity end to end with historic/ambiguous tests.
4. Add safe BankTransaction DTOs and serialization tests.
5. Align Superadmin DTOs and subscription presence behavior.
6. Design secure owner invite/setup and client-scoped integration configuration only after backend APIs exist.
7. Reproduce dashboard and responsive reports; fix demonstrated failures only.
8. Investigate Investor/bank access after reproducible evidence and approved policy.
9. Run backend, frontend and browser acceptance; record SHAs, commands and actual results.

---

## Addendum — verification pass 2026-11-18 (pre-implementation gate)

> Frontend inspected: `docs/frontend-planning-baseline` @ `692c8eb46e65b4678e50c14edb6620a6022fa0fd` (clean tree; ahead of the `db4b133` cited above only by the docs commit).  
> Backend inspected: `main` @ `db7af3d49e827ede7f2cb9a7dbd88574c69224d9` (clean; still the HEAD when re-verified).  
> Method: source reading of both repos. No MongoDB, deployed API or browser was available, so nothing below is runtime-proven; every item says what kind of evidence backs it.

### A1. Implementation slices (each ends with tests that prove it)

1. **Backend P0-A HouseType `estateId`** — add a validated `estateId` (24-hex ObjectId) to `createSchema` only (update remains non-movable). Proof: zod unit tests (retained, malformed rejected, update cannot move estate); service tests for foreign-client estate (DB, not runnable here).
2. **Backend P0-B Manual payment tenancy** — shared tenancy resolver (UNIQUE / AMBIGUOUS / NONE with human-readable options and `coversPeriod`), optional `tenancyId` + required/derived `period`, `recordManual` delegating to `postConfirmedPayment` in one transaction; options endpoint for the dialog. Proof: resolver unit tests with fakes; DB integration tests for the case matrix (written, not runnable here).
3. **Backend P0-C BankTransaction DTO** — allowlist serializer applied to list, unmatched and assign responses. Proof: unit test that JSON output contains no excluded key even when the source document has them.
4. **Frontend P0-B dialog** — period + tenancy choice using the options endpoint; never a Mongo ID; fails closed on ambiguity.
5. **Frontend P1 Superadmin alignment** — explicit interfaces and `present` discriminator, `mpesa.profiles`, `actor`, nested `lastOutcome`, `operationalAccess.entitlement`; tests for present/missing/empty-products.
6. **Frontend P1 entitlement UX** — keep separate BANKING/MPESA gates; Payments and standard SMS never gated on Banking.

Backend work goes on a dedicated branch from `main` (never committed to `main`); the exact SHA and files are published before the frontend is aligned. Documentation is committed before any code.

### A2. Plan challenge (answers to the review questions)

- House vs Tenant vs Tenancy: a house is not proof of who owed rent in a past period; only a validated Tenancy (client/estate/house/tenant/period) is. The plan never infers the tenant from `house.tenantId` for a period.
- Wrong-tenant attribution: prevented by using one validated tenancy for charges, `Payment.tenancyId`, allocations and ledger.
- Internal field leaks: fixed server-side with an allowlist; frontend `toSafe()` stays as defence in depth only.
- Evidence vs bank transaction vs payment: unchanged; a BankTransaction is a reconciliation source, SMS submissions are evidence, `Payment` is posted money.
- Assumed endpoints: the tenancy-options endpoint does not exist today; it is a proposed backend addition, not a frontend assumption. If it is not accepted, the frontend falls back to requiring the house's period resolution to be unique and shows the backend error.
- Over-engineering: no new ledger writer, no proration, no receipt inbox, no new credential store in this pass.
- Regressions to guard: pay page fragment-token handling, tenant link panel, submissions review (REJECT/RETRY_MATCH only), estate filtering and entitlement handling in transactions/unmatched.
- Risks: financial (mis-attribution; fail closed), security (secret/field leaks; browser never gets secrets), data integrity (G3.3 index dependency; transactions require a replica set).

### A3. Documented-only areas (not implemented in this pass)
Superadmin credential management (needs a backend design: client-scoped, encrypted, write-only, masked, audited, rotatable, revocable); secure owner invite instead of Superadmin-chosen password; impersonation (diagnostics is not impersonation); dashboard Overview/toolbar defect (needs reproduction with deployed commit, console and network evidence); responsive audit at 320/360/390/768/1024/1440 px; Investor/bank-view conflict (unverified; no Investor model exists).
