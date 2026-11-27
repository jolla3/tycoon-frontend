# Property Management frontend — short architecture handoff (product name undecided)

## Metadata and product identity — 2026-11-27

- **Company/publisher:** JOMUGIT CONSULTING LIMITED; public brand JOMUGIT.
- **Product category:** rental and property management software.
- **UI descriptor:** Property Management (temporary neutral descriptor only).
- **Final product name and product subdomain:** undecided. Never promote "Tycoon" / "Tycoon Estates" to final metadata, site name, schema identity, social artwork or canonical URL. Do not invent a replacement.
- Public landing, Privacy and Terms pages are indexable. Login, one-time-link `/pay`, authenticated dashboard routes and SUPER_ADMIN platform routes are `noindex, nofollow`. `/pay` also keeps `no-referrer`.
- Robots.txt allows crawling so search engines can read page-level noindex metadata; do not disallow login, pay, dashboard or platform routes. Authentication/authorization remains the security boundary.
- `NEXT_PUBLIC_SITE_URL` is the only canonical public origin. If missing, omit metadataBase/canonicals, omit the robots sitemap reference and emit an empty sitemap. Never use localhost, Vercel preview hosts or guessed subdomains as canonicals.
- Homepage social previews use category copy and JOMUGIT attribution; generic app icons do not claim to be the official company/product logo. Manifest values stay `Property Management` / `Property`; existing cyan palette `#00B4D8`.
- Organization JSON-LD may identify JOMUGIT CONSULTING LIMITED (alternateName JOMUGIT). No WebSite or SoftwareApplication schema with a guessed product name/domain until owner-approved.
- Do not add meta keywords, unsupported marketing claims, product rename, domain registration or redesign in this metadata branch.
- Detailed requirements, route indexability matrix and acceptance criteria are in the 2026-11-27 metadata section of `PRD.md` and `architecture.md`.


## Current M-PESA frontend contract — 23 November 2026

- C2B is the primary collection path; Pull is optional recovery. Pull UNKNOWN/NOT_ENABLED must never block C2B readiness.
- Display operational state, C2B registration/capability, Pull registration/capability and G3 posting readiness independently.
- Never use a generic "Capability verified" state based on callback OR Pull. Pull-only proof does not verify C2B.
- Only backend operationalState ACTIVE may be labelled Operational. The browser cannot mutate operational/capability fields.
- C2B registration accepted is not callback delivered, callback trusted, receipt verified or rent posted.
- Do not add activation controls until the backend provides audited lifecycle APIs. Keep Pull registration disabled unless backend pullRegistrationEligible=true.
- Owner-reported profiles: mamba Till 8965322 and Safaricom Sandbox Till 600995 show C2B registration accepted under daraja-sandbox config d3c06c1df7e7; callback/Pull remain UNKNOWN. These screen values do not prove callback delivery.
- Backend design and provider evidence are authoritative: backend docs/g5/PRD.md, docs/g5/architecture.md and docs/provider-contracts/G5_DARAJA_C2B_PULL_EVIDENCE.md.

---


**Frontend baseline:** `a27f20dd3244cdc7370cffa16b70c6cd32a45576`  
**Backend baseline:** `0dbf7ef75ed6c1a39e24775aec9a86e08f7d0617`  
**Updated:** 21 November 2026

## Product boundary

Next.js App Router client for landlord/house-centric property and rent operations, with authenticated client workspaces, a narrow public M-PESA submission page, and a separate Superadmin control plane. It is not a tenant portal. Domain API modules use the shared `src/lib/api/client.ts`; pages do not call `fetch()` directly.

## Stack and state

- Next.js 14 App Router, React 18, strict TypeScript.
- MUI 6, TanStack Query 5, IndexedDB (`idb`), Recharts, Lucide and Motion.
- Server state belongs in TanStack Query. IndexedDB is limited to approved offline snapshots; financial writes remain online-only.

## Authentication and integration boundary

- Authenticated requests use HttpOnly cookie sessions, `credentials: 'include'` and CSRF. Never store session tokens in browser storage.
- The public M-PESA submission route is a narrow unauthenticated boundary; it does not change authenticated API behavior.
- Co-op OAuth/resource calls belong to the backend. Frontend sends CK/SK DTO only and renders backend-authored safe state/capabilities.

## Critical domain contracts

- Tenant and Tenancy are different identities. Deposit operations must select exact Tenancy; manual payments must confirm exact Tenancy.
- Rent and security deposits are distinct. Provider receipts are not posted Payments.
- HouseType plans are versioned and prospective; existing Houses on `HOUSE_TYPE` billing can consume future versions.
- Transactions shows source history. Reports aggregates must distinguish M-PESA receipt evidence from posted G3 Payments.

## Current implementation gaps

1. Co-op form sends legacy credential fields; backend validator expects CK/SK and provider auth path also needs repair.
2. Deposit selection is Tenant-ID based; settlement UI promises refund/move-out the service does not perform.
3. Manual-payment AMBIGUOUS state exposes only the first 20 candidates.
4. CORS omits `Idempotency-Key` although the client sends it for deposit mutations.
5. HouseType workspace lacks an edit action and list copy understates prospective impact.
6. Reports lacks M-PESA aggregates and currently exposes Banking metrics without entitlement gating.
7. Partial-month billing remains deliberately unsupported pending owner policy.

## Delivery order

Backend G3/G4 API and policy contract first; then frontend DTO/form/screen alignment; then source tests, replica-set financial tests, browser network checks and responsive checks. Hold deposit lifecycle expansion until owner decisions are documented. Do not rebuild tenant-credit auto-apply, ledger, allocations, or M-PESA multi-estate mapping that already exist.

## Hard holds

- Keep full-month-only billing; do not add proration without the approved owner formula.
- Do not expose or imply a combined deposit deduction/refund/move-out workflow. After a deposit payment, a requirement change is a conflict; do not offer adjustment behavior. Do not invent payment-before-requirement or overpayment rules.
- A CK/SK form/API correction does not mean Co-op is operational. Render only backend-confirmed safe capabilities; keep unverified resources unavailable until resource-specific grant/scope, token lifecycle, production access and verification are established.
- The frontend branch must not run or trigger production migrations. Database index inventory and read-only preflight are separate backend operational checks.

 
## Owner decision — show submitted SMS in the M-PESA review queue (25 November 2026)

An authorized reviewer must be able to inspect the exact message the tenant or payer submitted, not just the parser result. Each submission row therefore offers an explicit **View submitted SMS** action.

- Fetch the original text on demand from the authenticated, client/estate-scoped evidence-detail endpoint. Do not place it in the normal list response.
- Render the exact message with whitespace and line breaks preserved, in a readable, wrapping text surface. Show a clear unavailable state when the original was not retained; never substitute a digest or reconstructed text.
- The evidence view is read-only. It does not add approve/force-match controls or change Reject / Retry Match rules. A submission remains evidence, not a posted Payment.
- Close the view and discard the in-memory response immediately. Do not save it to IndexedDB, persistent query storage, browser storage, logs, analytics or offline snapshots. Request the response with no-store semantics.
- The server authorizes client owners/admins within their scope and Superadmins only with an explicit selected client. Hiding the button is not an authorization boundary.

Acceptance: a reviewer can open an unsupported submission and see the actual submitted text; the general queue response still excludes it; unauthorized or cross-estate reads fail; missing retention is shown honestly; closing the view removes the plaintext from the active client cache.
