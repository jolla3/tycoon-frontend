# Tycoon Estates frontend — short architecture handoff

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
