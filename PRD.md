# Tycoon Estates Frontend — Product Requirements

## Authoritative M-PESA product correction — 2026-11-19

This section supersedes the earlier review-branch assumption that one M-PESA Till/shortcode maps to exactly one estate. That restriction is present in the current implementation, but it is not the intended product rule. The current Superadmin profile-create UI/API is a narrow first slice and must not be treated as the final merchant model or as production-ready M-PESA onboarding.

### Merchant ownership and estate relationships

- A `Client` owns one or more merchant profiles. A merchant profile represents one actual Safaricom collection identity: either a `PAYBILL` shortcode or a `BUY_GOODS_TILL` shortcode.
- A merchant shortcode belongs to one Tycoon Client within the configured Daraja provider environment. The same shortcode must not resolve to different clients. Callback resolution and the database uniqueness rule must enforce the same identity boundary.
- One merchant profile may serve multiple estates belonging to its owning Client. An estate may have multiple collection profiles where the business has more than one legitimate channel. Model this as an explicit many-to-many merchant-estate mapping, not by duplicating merchant profiles or storing one authoritative `estateId` on the merchant.
- Superadmin onboarding must let the Manager select the merchant type and map one shortcode to multiple estates in the same client. Every mapping must be audited and server-validated against the selected Client.
- A merchant-estate mapping proves that the merchant may collect for that estate. It does not prove that every receipt from that merchant belongs to every mapped estate.

### PayBill versus Buy Goods allocation

- **PayBill:** preserve the provider's `BillRefNumber` as receipt data. Tycoon should issue or manage a stable collection reference for the intended tenant + estate under a merchant profile. The reference mapping must resolve to exactly one client, estate and tenant. A missing, unknown, retired, or ambiguous reference remains unallocated for review; the system must never guess an estate.
- Safaricom's C2B contract makes `BillRefNumber` optional in the callback schema. Therefore a callback can be a valid provider event yet still be insufficient for automatic rent allocation. PayBill auto-allocation requires a configured and successfully resolved Tycoon reference; otherwise preserve the canonical receipt without posting it.
- **Buy Goods Till:** do not assume it provides the same tenant account-reference semantics as PayBill. Keep the existing tenant-specific SMS evidence/link workflow for identifying the intended tenant and estate. Posting must verify that the selected merchant profile is actively mapped to the link's estate.
- A receipt is merchant-scoped when ingested. It becomes estate/tenant-attributed only after the relevant reference or evidence is resolved and all existing G5 checks pass. Do not set an estate from the fact that the merchant serves several estates.
- Preserve the existing distinction among provider receipt (`MpesaTransaction`), tenant-submitted SMS evidence (`MpesaSmsSubmission`), and posted G3 Payment/Ledger records. This product correction does not authorize bypassing G5 verification, claim fencing, idempotency, audit, or posting gates.

### Callback registration and Pull configuration

- Daraja Consumer Key/Secret and the API environment belong to Tycoon's platform configuration, not to individual clients. Do not ask clients to provide or store Tycoon's app credentials.
- Tycoon owns shared, platform-hosted webhook endpoints. The same configured C2B confirmation URL, optional validation URL, and Pull-results callback URL can be registered against each client merchant shortcode. Callback URLs are not client-hosted URLs and need not be unique per client.
- Each merchant profile must retain safe registration evidence: the platform callback-configuration version/reference and the URL snapshot used for C2B/Pull registration, registration state, attempt/result timestamps, and safe provider response identifiers/codes. The profile records which shared callback configuration was registered; it does not own a client-specific callback server.
- Pull registration also requires a nominated Safaricom MSISDN associated with the merchant shortcode's KYC. Store it in protected/encrypted form, expose only a masked value, and never put it in logs or ordinary DTOs. It is merchant-specific configuration, unlike the shared callback URL.
- C2B external validation is optional and requires Safaricom activation for the shortcode. Do not assume it is active. The present source handler that unconditionally accepts validation is not sufficient for production; validation must check supported business references and fail safely.
- Callback authenticity/abuse controls remain a release gate: the reviewed provider evidence has not established a cryptographic callback signature or equivalent authentication contract. Do not enable public callback processing or trust a shortcode field as authentication until that gate is resolved.
- Registration acceptance is not the same as proven callback/Pull capability. Keep registration state, callback capability, Pull capability and operational state separate. A timeout/uncertain result must not be blindly retried as though no registration occurred.

### Receipt visibility and estate isolation

- A shared merchant can receive receipts for several estates. Estate-scoped transaction history must not return all receipts merely because the merchant profile is mapped to that estate.
- For an estate-restricted user, return only receipts whose estate has been resolved through an exact PayBill collection reference or a completed, verified G5 attribution (`attributedEstateId`). Unknown/unallocated receipts must remain in a client-wide owner/admin review scope, not leak across mapped estates.
- Client-wide owners/admins may have a separately authorized unallocated-receipt review view. Platform Superadmin monitoring remains a separate, explicit client scope.
- Continue to render canonical M-PESA receipts inside the existing Transactions experience. Include the BillRefNumber and allocation state where safe; do not create a second ledger or confuse unallocated receipts with posted rent.

### Banking provider expansion

Banking remains adapter-based. Co-operative Bank is the first implemented provider path; future banks should be added by completing their existing adapter contracts, provider-specific credential requirements, capability declarations and verification gates. The current registry's reserved adapter identifiers must not be represented as fully implemented or operational merely because a class/shell exists. This is a delivery/readiness distinction, not a product architecture restricted permanently to Co-op.

### Required acceptance scenarios

1. One Client has three estates and one PayBill. One merchant profile maps to all three estates; it is not duplicated three times.
2. Each estate's tenant receives a distinct, stable PayBill account reference. A callback with a reference resolves to exactly that tenant and estate.
3. Empty, malformed, unknown, reused or ambiguous BillRefNumber values never cause automatic estate assignment or G3 posting.
4. A Till mapped to several estates still uses the existing tenant-evidence route; a receipt cannot be exposed to or posted for another estate just because the Till is shared.
5. Cross-client duplicate shortcode creation is rejected, and callback resolution returns exactly one merchant profile in the configured environment.
6. Estate-restricted receipt history does not expose receipts allocated to another estate or unallocated receipts.
7. Existing G5 idempotency, amount/time evidence, receipt claim fencing, tenant-credit settlement, durable audit and posting gates remain intact.

### Delivery status

These are target product and architecture requirements, not claims that the current branch implements them. The current `BUY_GOODS_TILL` + single-`estateId` code must be redesigned and migrated before shared PayBill/multi-estate support can be marked implemented. Existing review PRs remain review-only; no deployment or provider readiness is implied.


## Implementation update from frontend review — 2026-11-19 (review branch, not merged)

Review branches: frontend and backend `docs/superadmin-onboarding-and-history`. These changes are not on `main` yet; use the branch/PR head as the source of truth.

- **New Tenant:** the modal owns estate selection and separates loading, request error, true-empty and available-house states. The backend `GET /houses?estateId=...&status=vacant` now excludes inactive houses, non-null tenant links and houses with ACTIVE Tenancy records; `tenancyService.open` repeats the vacancy checks inside the Mongo transaction.
- **Banking onboarding:** the existing Co-operative Bank connection/account UI is extracted into `BankingSetupPanel` and embedded in Superadmin client Integrations. API calls supply one explicit clientId in query scope; bank mutation routes permit SUPER_ADMIN only after `clientContext` and `requireProduct('BANKING')`. Existing encrypted `BankCredential` is reused. Client login credentials remain created by client provisioning, not by this integration panel.
- **M-PESA merchant profile (current review-branch slice):** Superadmin can create a client-scoped DRAFT Buy Goods Till profile, but the current API requires one estate mapping. This is only the initial implementation shape; the authoritative product target now supports PayBill + Buy Goods and many-to-many merchant-estate mappings (see the correction section above).
- **M-PESA transaction history:** the existing `/transactions` page now switches between Banking transactions and canonical M-PESA receipt history when the corresponding entitlements are assigned. M-PESA reads use `GET /mpesa-transactions`, a safe paginated DTO, selected client scope and enforced estate scope. SMS submissions remain in the separate review queue; ledger Payments remain distinct.
- **Responsive Superadmin:** main content is shrinkable beside the navigation, evidence values wrap, and System Health cards move to two columns only at larger widths.

### Deliberately incomplete / verification limits

- Till profile creation leaves the profile in DRAFT. It does not trigger C2B or Pull registration: those provider calls require platform callback/validation URLs and a Pull nominated number that are not part of this client Till identity form. No provider registration success is implied.
- The current review-branch schema still supports only one estate mapping and Buy Goods Till. This is a known implementation gap against the corrected product target, not a permanent product limitation. Do not duplicate shortcode profiles to work around it.
- The Banking provider implemented by the existing form is Co-operative Bank. This change does not add other banks.
- The backend requires the M-PESA merchant unique index for profile creation and canonical query indexes for history. If migrations/index readiness are missing, the endpoints fail closed with 503.
- The New Tenant and M-PESA/banking flows have not been exercised in a browser against a live API. No frontend build or test result is claimed yet. The new backend unit tests have been added but not executed.
- The manual-payment selection cap is fixed in code on the review branches: the backend resolves with a two-row decision bound and separately paginates/searches the complete eligible set in MongoDB; the dialog lets the operator choose any eligible tenancy, explicitly, in the AMBIGUOUS case. Historical non-covering tenancies are information only. DB-backed verification has not been run.

## Design review hardening — 2026-11-19

Before implementation, the plan was challenged for hidden assumptions and unsafe shortcuts:

1. **The implementation's one-estate shape is not the product rule.** The target is one merchant profile to many same-client estates through an explicit mapping relation. The current `estateId` field and G5 equality check are legacy implementation constraints to remove through a migration and posting-rule change. Duplicate profiles are not a workaround.
2. **Create-profile is not provider registration.** C2B and Pull registration use Tycoon-owned shared callback endpoints registered against a merchant shortcode. The merchant profile must record the shared callback configuration version/snapshot and registration evidence. Pull additionally requires the shortcode's nominated MSISDN in protected storage. Profile creation must not invent URLs/numbers or promote a profile to ACTIVE/VERIFIED.
3. **Merchant identity must agree across indexes and callbacks.** Current callback lookup searches by shortcode across clients, while the current unique index is only `(clientId,businessShortCode)`. The target must enforce one owner per provider shortcode within the configured environment, with a migration-controlled global identity index and fail-closed lookup.
4. **Transaction history must not combine record types.** M-PESA history reads canonical MpesaTransaction receipts, not SMS submissions and not ledger Payment rows. The DTO must be safe and scope by client plus the selected estate's merchant profiles/attribution.
5. **Banking access stays entitlement-gated.** Superadmin must use one explicit active clientId through clientContext. The existing BANKING entitlement check remains active. Do not add a global/bypass route or store new credentials. Existing Co-op credentials remain encrypted in BankCredential.
6. **Tenant availability must be authoritative.** Filter active houses and exclude active tenancies, but also recheck inside the same Mongo transaction that opens the tenancy. A dropdown is not a concurrency or authorization boundary.
7. **No broad UI redesign.** Fix the platform content shrink/wrap and breakpoint issues at the shell/evidence components. Do not replace the whole Superadmin UI or introduce a new design system.

## Current implementation and review amendment — 2026-11-19 (authoritative)

Current main commits: frontend e525b046b73254c6a49dc163319efa3a087169a3; backend 25d9969eb4f1c734f360337f0a3d64b83d465a6a. Original product goals and history below are preserved. This amendment supersedes older implementation-status statements where they conflict.

### New Tenant house selection

The New Tenant dialog currently depends on the estate filter above the Tenants page. It does not query houses until that global filter has an estate selected. It also treats an undefined result or failed request as an empty list because loading and error states are not rendered. The current empty message is therefore not proof that the client has no vacant houses. The dialog must own its estate selection and distinguish loading, request failure, true empty and available results. Creation must revalidate availability server-side.

### Superadmin Banking onboarding

Client provisioning already creates the CLIENT_OWNER login credentials. Bank connection credentials are a separate integration setup. Existing /bank/connections and /bank/accounts routes implement connection creation, reauthorization, disconnection and account registration using encrypted BankCredential storage. The Superadmin client Integrations tab is currently read-only. clientContext already supports SUPER_ADMIN with an explicit clientId, but current connection/account write routes authorize only CLIENT_OWNER and CLIENT_ADMIN. The console should reuse the existing workflow with selected-client scoping; the backend should narrowly allow SUPER_ADMIN only after clientContext validation and the existing BANKING entitlement gate. Do not add another credential store or expose secrets in DTOs, caches, logs or audit metadata.

### Superadmin M-PESA merchant onboarding

The current review branch adds a DRAFT Buy Goods Till profile-create route and form, but it requires a single estateId and does not register callbacks. The target Superadmin workflow is one merchant profile per shortcode, merchant type PAYBILL or BUY_GOODS_TILL, plus multi-estate mappings and safe registration evidence. Tycoon owns Daraja app credentials and shared webhook endpoints. Do not ask for client-hosted callback URLs or platform app secrets. The profile remains DRAFT until provider-specific registration and operational evidence are separately verified.

### Existing transaction history: Banking and M-PESA sources

M-PESA history belongs in the existing Transactions experience, not a separate new product page. The existing /transactions screen and GET /transactions endpoint currently display BankTransaction rows only. MpesaTransaction records exist, but there is no client-scoped paginated read endpoint or frontend data source. Extend the existing Transactions screen to display the selected entitled source: Banking transactions and canonical M-PESA provider receipts. Preserve the differences between MpesaTransaction provider receipts, MpesaSmsSubmission evidence and posted Payment ledger entries. An unverified receipt must never be presented as a posted rent payment.

### Superadmin responsive layout

The platform shell main content must be allowed to shrink beside the fixed navigation. The generic evidence renderer must wrap long values and avoid min-content overflow. System Health and diagnostics cards must stack at constrained widths; menus and drawers must not obscure active content or create horizontal page overflow. Acceptance must cover mobile, tablet, laptop and desktop widths.

### Merged P0 status and open verification

- HouseType creation now validates and persists estateId, and attempted ownership changes are rejected.
- BankTransaction list, unmatched and assignment responses now use an allowlisted backend DTO.
- Manual payments resolve and post against one validated tenancy for the requested period.
- Resolved in code (unit + faked-API browser verified; DB-backed tests NOT EXECUTED): manual-options returns an eligible-only, server-paginated, server-searched `eligibleSelection` with an exact `eligibleTotal`, so every eligible tenancy is selectable and the dialog agrees with the payment resolver.
- Nineteen DB-backed integration tests were added but not executed because no MongoDB replica set was available. No live API or browser acceptance is claimed.

> Status: planning baseline updated for Superadmin platform V2  
> Audited: 2026-11-15  
> Frontend code baseline: `jolla3/tycoon-frontend` `main` @ `e525b046b73254c6a49dc163319efa3a087169a3`  
> Documentation branch: `docs/frontend-planning-baseline`  
> Backend contract baseline: `jolla3/tycoon-estates-backend` `feat/superadmin-subscription-entitlements` @ `cc98900ba338f5b1e19bdcfe923e4dc45bc87745`  


> **Correction note (2026-11-18):** the backend contract baseline above was a feature branch. The authoritative backend is `main` @ `25d9969eb4f1c734f360337f0a3d64b83d465a6a`. Where this document and `docs/branch-correction/*` differ (HouseType `estateId` direction, manual-payment tenancy identity, Superadmin response shapes, subscription presence), the branch-correction pack and backend source win. Historical text below is preserved.
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
## Co-op Connect 2.0.0 implementation gate — 2026-11-20

This section defines the frontend target against the backend implementation baseline. It is a correction specification, not evidence that the open implementation PR already satisfies it.

### Normal connection credentials
- The ordinary Co-op connection form collects only Consumer Key (CK) and Consumer Secret (SK), represented in the Tycoon API as `consumerKey` and `consumerSecret`.
- Do not collect customer username, password, PIN, OTP or a free-form OAuth scope. Co-op documents more than one grant; the selected grant and resource scope are provider configuration supported by resource evidence, not a landlord form field.
- Do not confuse Co-op CK/SK with the selected Tycoon Client ID used for Superadmin request scoping or with `BankConnection.clientId` on the backend.
- Secrets remain transient component state, never enter React Query or browser storage, and are cleared on close/cancel/success. When an API error retains them for a retry, expose an explicit discard/clear action and keep the UI copy accurate.

### Connection and account state
- A BankAccount's local validation/link state is not its parent BankConnection authentication state. The account card must derive effective state from the account's `connectionId` and the live connection list, or consume an explicit safe effective-state field returned by the backend.
- Missing parent connection, mismatched client/provider, or any parent state other than active means every operation is unavailable. Do not use stale child `connectionStatus` or entitlement flags as authority.
- A create response with HTTP 201 and `status: failed` means the resource was created but provider authorization failed. Render the failed state and safe error; do not show it as an active connection.
- Failed reauthorization must leave the previous credential version active. Display the returned safe error category and do not imply that new credentials were promoted.

### Operation labels and capabilities
- Unknown/omitted capabilities fail closed: use explicit `=== true`, not `!== false`.
- The existing Co-op sync endpoint currently selects a FullStatement date-window strategy. Its button must describe a recent statement-window sync and require `statement === true`; it must not claim to run AccountTransactions polling.
- AccountTransactions polling remains unavailable until its transaction identity/list contract is verified. Balance and webhook controls remain unavailable until their resource and readiness gates are met.
- Manual statement import requires the same effective parent state and readiness policy as the backend. The UI is not an authorization boundary; backend checks remain mandatory.
- Label the entered account name as an internal Tycoon display label. Account Validation does not provide a verified account-holder name.

### Superadmin scoping and cache
- Every Superadmin bank request retains one explicit selected `clientId` query scope. Never move this value into request-body identity or a global/bypass route.
- Mutations invalidate the selected client's banking connection/account queries and `platformKeys.client(clientId)`, so the platform summary cannot remain stale after connection or account changes.
- Existing BANKING product entitlement and server-side `clientContext` enforcement remain mandatory.

### Required frontend acceptance
Test CK/SK-only validation and request bodies; failed-create response state; failed-reauthorization state; explicit secret discard after failure; parent active/failed/reauth-required/disconnected/missing cases; undefined capability denial; statement-vs-poll labels and gates; internal account-name copy; selected-client scoping; and client-summary cache invalidation. The implementation baseline has no dedicated banking panel/API suite proving these cases yet.


---

## Current merged-source reconciliation — 21 November 2026

**Frontend `main`:** `a27f20dd3244cdc7370cffa16b70c6cd32a45576`  
**Backend `main`:** `0dbf7ef75ed6c1a39e24775aec9a86e08f7d0617`

This amendment supersedes historical implementation-status rows that refer to pre-merge branches or older source snapshots. It does not relax the existing provider, financial or production-readiness gates.

### Verified current gaps and required frontend behavior

- **Co-op onboarding:** the current form sends legacy `clientId`, `clientSecret`, `username`, `password` and optional `scope`; backend strict validation accepts `consumerKey` and `consumerSecret`. The provider factory/auth path is also internally inconsistent, so a form-only rename is insufficient. Align the form and API DTO to CK/SK only, with no customer password, PIN, OTP or free-form scope. Provider readiness remains disabled until backend auth/resource evidence is satisfied.
- **Deposits:** the deposit panel currently describes settlement as a refund and move-out, but the backend settlement service only stamps settlement state. Remove the refund/move-out promise. Deposit operations must identify the exact Tenancy; where one Tenant has multiple active Tenancies, show an explicit tenancy choice rather than choosing the first.
- **Deposit conflicts:** if the backend rejects a requirement change after a payment, render the conflict and preserve the prior value. Never display a successful save when the server did not change the requirement.
- **Manual payments:** the backend resolver evaluates the eligible set, but the ambiguous picker consumes only the capped first 20 options. Use the existing paged/search candidate response in the AMBIGUOUS state as well as the NONE state. The selected exact `tenancyId` must be visible before confirmation.
- **Partial-month billing:** current full-month-only behavior and its warning remain. Do not remove the warning or invent proration until the G3 PRD's owner-approved policy exists.
- **HouseTypes:** list-level editing exists; the workspace has no edit affordance. Add workspace editing using the versioned plan contract, display the effective period and reason, and clarify that future versions affect existing Houses with `billingSource === 'HOUSE_TYPE'`, not only newly created Houses.
- **Transactions versus Reports:** Transactions already includes M-PESA receipt history. Reports lacks M-PESA aggregates. Do not describe the history list as an aggregate report or count the receipt and its resulting G3 Payment twice.
- **Banking report visibility:** do not show Banking-only KPIs or tabs to a client without the BANKING entitlement.
- **CORS request contract:** authenticated requests keep cookie credentials and CSRF. The client may send `Idempotency-Key`; the backend must allow it in CORS preflight. Do not change the authentication model to work around the missing header.
- **Responsive filters:** platform M-PESA filters have a narrow-width overflow risk from fixed minimum widths. Treat this as a browser-verified layout task; source inspection alone is not proof of overflow or its fix.

### Decisions that remain blocked

Do not invent deposit deduction/refund/move-out atomicity, deposit payment-before-requirement or overpayment semantics, paid requirement adjustments, HouseType deposit defaults, metered utility billing or a partial-month formula. Those rules are owned by the backend G3 PRD. Until approved, frontend copy and controls must not promise unsupported behavior.

### Cross-repository acceptance

Test request payloads and backend validators together; exercise one Tenant with multiple active Tenancies and cross-Estate isolation; prove ambiguous manual options beyond 20 are selectable; verify cookie + CSRF + idempotency preflight; test HouseType future-version messaging; verify entitlement-gated reports; and run narrow-mobile/tablet browser checks. A frontend build alone is not browser or provider acceptance.
