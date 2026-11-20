# Co-op Connect 2.0.0 Frontend Contract Alignment

> Audit date: 2026-11-20  
> Scope: frontend contract, credential collection, connection/account lifecycle, capability presentation, Superadmin client scoping and acceptance coverage.  
> Documentation branch base: frontend main at e525b046b73254c6a49dc163319efa3a087169a3.  
> Implementation evidence reviewed: open frontend PR #4, branch docs/superadmin-onboarding-and-history, head bd78e8867f2642d77333d1dfc1f408235e179bbf.  
> Status: documentation-only audit. No application code changed and no frontend tests/build were run in this documentation branch.

## 1. Repository state and source-of-truth rules

The frontend repository is jolla3/tycoon-frontend.

At the audited main head, the new reusable BankingSetupPanel and bank-connections API module are not merged. They are part of open PR #4, “feat: Superadmin Banking and M-PESA client onboarding”:

- PR: https://github.com/jolla3/tycoon-frontend/pull/4
- Reviewed branch: docs/superadmin-onboarding-and-history
- Reviewed head: bd78e8867f2642d77333d1dfc1f408235e179bbf
- Base: main at e525b046b73254c6a49dc163319efa3a087169a3

The audit inspected the actual PR source, not only its description. The relevant reviewed files include:

| File | Reviewed state |
|---|---|
| src/features/banking/banking-setup-panel.tsx | Added in PR #4; credential dialogs, connection cards, account registration, sync and statement actions |
| src/lib/api/bank-connections.ts | Added/changed in PR #4; typed connection lifecycle API |
| src/lib/api/banking.ts | PR #4 version; account list/register/sync/statement wrappers |
| src/app/(platform)/platform/clients/[clientId]/page.tsx | PR #4 version; selected-client Integrations tab embeds BankingSetupPanel |
| src/lib/query/keys.ts | PR #4 version; connection and account query keys accept clientId |
| src/types/api.ts | BankAccount DTO shape reviewed from main; operation flags are optional |

There is a documentation contradiction on main: the older PRD implementation-status paragraph and endpoint-screen matrix reconciliation describe the bank connection lifecycle as implemented, while the main source baseline does not contain the new bank-connections API module or reusable panel. PR #4 adds those files and is still open. For release planning, use merged source code and verified tests as the implementation truth. A PR branch is not a deployed or merged feature.

This document is the detailed frontend audit. The companion backend contract audit is:
https://github.com/jolla3/tycoon-estates-backend/blob/docs/coop-connect-v2-contract-alignment/docs/provider-contracts/COOP_CONNECT_2_0_0_ALIGNMENT.md

The provider facts below come from the Co-op Connect 2.0.0 material supplied for this integration and the corresponding backend audit. The frontend must not invent provider paths, grants, scopes, account identity fields or operational capability.

## 2. Product and responsibility boundary

The frontend collects customer-supplied Co-operative Bank credentials and account registration details, then calls Tycoon’s authenticated API. It must not call Co-op Connect directly.

The backend owns:

- OAuth grant selection, token acquisition, refresh and expiry.
- Consumer Key/Secret encryption, credential versioning and connection ownership.
- Co-op token and resource hosts, resource-specific paths and scopes.
- Account validation and classification of provider errors.
- Capability readiness for polling, statements, balance and webhook ingestion.
- Provider payload normalization, transaction identity and financial reconciliation.

The frontend owns:

- Clear and accurate labels for the credentials actually requested.
- Request-only credential entry and cleanup.
- Explicit selection of the Tycoon client when operating as SUPER_ADMIN.
- Rendering connection state separately from account validation and operation capability.
- Enabling only actions the backend explicitly reports as supported.
- Safe, useful error messages without leaking provider payloads or secrets.

The browser must never hold provider access tokens, refresh tokens, callback secrets, ciphertext, decrypted stored credentials or provider API URLs.

## 3. Identity: Tycoon client ID is not Co-op Consumer Key

There are two unrelated identifiers that must not share an ambiguous UI meaning.

**Tycoon client identity**

- The Superadmin route parameter and API query parameter called clientId identify the Tycoon Client document.
- In the client detail page, client._id is passed to BankingSetupPanel.
- The selected Tycoon client ID is sent as request scope for Superadmin connection/account operations.
- It is an authorization target, not a Co-op credential.

**Co-op OAuth application credentials**

- Co-op Consumer Key (CK) is used as OAuth client_id at the provider boundary.
- Co-op Consumer Secret (SK) is used as OAuth client_secret at the provider boundary.
- In the current frontend type, CoopCredentialMaterial.clientId means the Co-op Consumer Key, not the Tycoon Client ObjectId.
- CoopCredentialMaterial.clientSecret means the Co-op Consumer Secret.

The current type and form use the generic labels Client ID and Client secret. This is dangerously ambiguous because the same feature also has a clientId prop for the selected Tycoon client. Rename the frontend credential fields to consumerKey and consumerSecret. Rename local target-scope variables to targetClientId or selectedClientId where practical. Keep the backend’s Tycoon client ownership field unchanged. The server adapter may map consumerKey/consumerSecret to OAuth client_id/client_secret internally.

Do not rename or overwrite BankConnection.clientId or BankCredential.clientId in the backend if those fields represent Tycoon ownership. Do not place the selected Tycoon client ID inside credentialMaterial.

## 4. Credential form: current behavior and required correction

### 4.1 Current PR #4 behavior

The shared CredentialDialog in src/features/banking/banking-setup-panel.tsx currently renders:

- Client ID — required.
- Client secret — required.
- Username — required.
- Password — required.
- Scope — displayed as optional.

The API type CoopCredentialMaterial requires clientId, clientSecret, username and password, with optional scope. The submit handler converts a blank scope to undefined. The backend version audited for the companion integration still requires scope. Therefore the frontend advertises scope as optional while the backend rejects the request when it is absent. This is a direct UI/API contract mismatch.

The form also makes username and password mandatory even though the intended customer workflow is key-only.

### 4.2 Correct normal customer workflow

The normal form should collect only:

1. Co-op Consumer Key (CK).
2. Co-op Consumer Secret (SK).

The Co-op 2.0.0 guide includes a client_credentials grant example using the CK/SK pair. It also documents password grant as a supported option. Therefore do not write that password grant is categorically unsupported. The correct product decision is narrower: username and password are not mandatory for the ordinary CK/SK connection workflow. A password-grant path may be introduced only when a specific Co-op resource contract and the bank’s authorization instructions require it. It must be an explicit, reviewed flow, not an unconditional pair of fields on every connection.

DCR administrator credentials are for registering an application through Dynamic Client Registration. They are not the normal customer’s Co-op account login and must not be collected in the Tycoon banking setup form. The frontend should not ask a customer for a DCR administrator username or password.

### 4.3 Scope ownership

The current form exposes a generic optional Scope field, but the backend currently requires a scope value. Neither behavior is acceptable as a user-facing contract.

Scopes are tied to the specific Co-op resource and its OAuth2 security configuration. A generic example scope is not proof that it authorizes Account Validation, Account Transactions, Mini Statement, Full Statement or another operation.

Required behavior:

- Remove the generic Scope input from the customer form.
- Configure each verified resource scope in backend integration configuration.
- Do not silently insert guessed values such as generic subscription scopes.
- Do not make the customer responsible for understanding Co-op resource scopes.
- If Co-op later confirms that a customer-specific scope value must be supplied, document the resource and authorization source before introducing a narrowly named field.

### 4.4 Request shape

Current create flow sends provider COOP and a credentialMaterial object. Reauthorization sends credentialMaterial to the connection-scoped endpoint. The intended semantic shape should be:

- provider: COOP
- credentialMaterial.consumerKey
- credentialMaterial.consumerSecret
- optional displayName, which is a Tycoon label only

The companion backend must accept these semantic field names and map them internally to the OAuth names. Do not change only the frontend type and ship it against a backend that still expects the old payload. Frontend and backend request schemas must be changed and tested together.

Secrets belong only in the authenticated POST JSON body. Never place CK or SK in query parameters, route segments, browser history, page URLs, analytics, React Query keys, logs, telemetry or persisted browser state.

## 5. Credential state, privacy and user feedback

### 5.1 Existing good behavior to preserve

PR #4 already keeps the credential form state inside the dialog and does not put credential material in React Query. The API client uses the existing authenticated session cookie and CSRF header flow. Preserve that boundary.

Do not introduce localStorage, sessionStorage, IndexedDB, browser caches, client-side token storage, or a custom Authorization header for Co-op credentials. The backend remains the only place where stored credential material is encrypted and used to obtain provider tokens.

The connection and account query DTOs must remain secret-free. The existing platform DTO comment correctly excludes credentials, credential references, ciphertext, access tokens and raw provider payloads.

### 5.2 Cleanup behavior must match the code

The panel comment says credentials are cleared on success, error-dismiss and close. In the inspected implementation, close and success call wipe(), while onError retains the typed values and the error Alert has no explicit dismiss/clear action. The comment therefore promises behavior the code does not implement.

Choose and document the intended failure behavior. At minimum:

- Cancel, close, route change and successful submission clear the local credential state.
- Provide an explicit clear action for a user who wants to discard credentials after a failed attempt.
- Do not preserve credentials beyond the dialog lifetime.
- A transient network failure may allow a user to retry without retyping, but this must remain ephemeral and must not be represented as an error-dismiss cleanup path.
- Never echo the submitted values into an error message or diagnostic record.

### 5.3 Provider errors are not safe UI text by default

The API client converts backend error messages into ApiError and the panel displays those messages. ConnectionCard also renders authMeta.lastAuthError. These are safe only if the backend has already redacted provider response bodies and credentials.

The backend must return stable, sanitized error codes and short user-safe messages. The frontend should map those codes to actionable guidance. Never display raw Co-op response bodies, OAuth error payloads, Authorization headers, CK, SK, access tokens or refresh tokens.

## 6. Connection state, account validation and capability are separate

The UI must not treat a successful OAuth exchange as proof that every account and every provider operation is ready.

Display these concepts independently:

1. **Connection authorization:** whether the stored CK/SK can obtain an acceptable token for the configured grant.
2. **Account validation:** whether the supplied account number was accepted by Co-op’s Account Validation resource.
3. **Operation capability:** whether this particular account and connection are enabled for polling, statement import, balance enquiry or webhook ingestion.
4. **Tycoon product entitlement:** whether this client is subscribed/assigned to the BANKING product.

A connection marked Active does not prove account authorization, resource scope, subscription readiness or all operation capabilities. Product entitlement and provider readiness are separate checks; the Integrations tab’s existing explanatory text should remain.

The current connection card shows connection status, last authorization time, token expiry and last authorization error. Keep only safe metadata. Do not imply that the provider’s access token is available to or inspectable by the browser.

## 7. Operation capability gating: fail closed

The BankAccount public DTO models poll, statement, balance and webhookIngest as optional booleans. In the current BankingSetupPanel, the code is:

- canSync = account.entitlements?.poll !== false
- canStatement = account.entitlements?.statement !== false

Those checks enable the buttons when the value is undefined. An omitted or unknown capability is not affirmative permission. This is fail-open behavior.

Required behavior:

- Enable Sync only when poll is explicitly true.
- Enable statement import only when statement is explicitly true.
- Treat false, undefined, null or unrecognized capability data as unavailable/not verified.
- Render an explicit disabled reason for unknown or unsupported capabilities.
- Do not infer support from provider name, an Active connection, product entitlement or the existence of an endpoint wrapper.
- Balance and webhook controls must remain absent or disabled until their backend capability is explicitly true.

The current backend Co-op audit keeps AccountTransactions polling disabled because the transaction identifier/uniqueness contract is unresolved. The frontend must not offer Sync for that operation while poll is false or unknown. Full Statement is a separate resource; the UI may enable statement import only after the backend has verified the FullStatement contract and reports statement=true. Do not infer a balance endpoint from the former generic AccountBalance path. Do not enable webhook ingestion until the callback contract and secret-handling path are verified.

## 8. Account registration: account label is not bank-verified identity

The current RegisterAccountDialog requires an Account name, sends accountName, and BankAccountCard displays that value. Co-op’s supplied Account Validation response confirms whether the account is valid; it does not return an account-holder name.

The label entered in Tycoon is therefore customer-supplied metadata, not bank-verified identity. Rename the input to **Internal account label** or **Display label** and add helper text explaining that it is a Tycoon label and is not verified by Co-op. The account card should present it as a label, not as a confirmed account-holder name.

Do not show “Account holder verified” or equivalent based only on MessageCode 0. If account-name verification is required, obtain a separate supported bank contract first.

The supplied Co-op examples also contain an account-number length discrepancy: an Account Validation example uses an 11-digit number while another resource schema describes a 14-character number. The frontend currently has no fixed length rule, which is safer than inventing one. Keep validation server-authoritative until the backend defines the exact per-resource contract. Do not add a global regex based on one example.

## 9. Provider error semantics the UI must preserve

The frontend must not collapse different failure classes into “invalid credentials” or “invalid account”.

Relevant Co-op distinctions from the supplied guide include:

| Provider result | Meaning | UI treatment |
|---|---|---|
| Account Validation MessageCode 0 | Account accepted by that validation resource | Show validation success only |
| Account Validation MessageCode -1 | Invalid account | Ask the operator to check the account number |
| MessageCode -7 | Authorization failure | Explain that provider authorization failed; do not label the account invalid |
| MessageCode -8 | Account authorization failure | Explain that the credential may be valid but is not authorized for this account |
| MessageCode -2 | Missing or invalid request parameter | Treat as integration/request configuration error, not bad customer credentials |
| MessageCode -4 | Timeout/backend unavailable | Retry later; preserve existing records |
| MessageCode -6 | Requested transaction count outside provider limit | Explain the configured request limit |
| HTTP 429 / OAuth 900800 | Rate throttled | Retry later with backoff; no rapid repeat action |
| HTTP 503 / 700700 or 900801 | API blocked or hard limit reached | Show provider availability/configuration issue |
| OAuth 900901 | Invalid credentials or superseded access token | Reauthorization may be required; preserve backend classification |
| OAuth 900905 | Wrong token type | Integration grant/resource configuration issue |
| OAuth 900910 | Insufficient scope | Integration configuration/authorization issue, not an invalid account |

The UI may use a short safe message and a reference code. Retry guidance must respect whether the error is retryable. A user should not be instructed to replace valid CK/SK for a timeout or insufficient resource scope.

## 10. Superadmin selected-client scope and cache behavior

The open PR’s selected-client structure is directionally correct and must be preserved:

- PlatformClientDetailPage obtains the selected client from the Superadmin client-detail route.
- IntegrationsTab passes client._id into BankingSetupPanel.
- The banking API wrappers send that value as the Tycoon clientId request scope for list, create, reauthorize, disconnect, account list/register, sync and statement actions.
- The PR query keys include clientId for connection and account queries.
- The page comment correctly states that a route ID is not authorization. Backend middleware must independently require SUPER_ADMIN and verify the target client scope on every request.

Do not remove the selected-client query parameter or use a frontend-only client filter as authorization. Do not confuse this query parameter with the Co-op Consumer Key.

One refresh gap remains: after a bank connection/account mutation, the panel invalidates banking connection/account queries, but the parent Superadmin client-detail query that supplies the Banking summary counts is not invalidated. The Integrations summary can therefore display stale connection/account counts after a successful mutation. Invalidate platformKeys.client(targetClientId) after relevant connection and account mutations, in addition to the bank resource queries. Verify that switching between two selected clients cannot show cached data from the previous client.

## 11. Existing implementation: retain, change and do not invent

### Retain

- Reusable BankingSetupPanel for the normal Banking page and Superadmin client Integrations tab.
- Explicit selected-client request scope for Superadmin operations.
- Server-side authorization; client ID in a URL is not proof of authority.
- Separate BankConnection and BankAccount lifecycle.
- Account registration only under an Active connection.
- Secret-free connection/account response DTOs.
- Request-only credential entry and authenticated API client.
- Separate connection status, account validation status and operation capability.
- Statement/sync result counts rather than fabricating transaction rows in the dialog.

### Change

- Rename generic Client ID/Client secret labels and type fields to Consumer Key (CK)/Consumer Secret (SK).
- Remove mandatory Username and Password from the ordinary customer flow.
- Remove the generic customer Scope field and configure verified scopes in the backend.
- Change operation capability checks to require explicit true.
- Rename Account name to Internal account label / Display label.
- Make provider errors typed and user-safe.
- Add parent client-summary invalidation after mutations.
- Make cleanup comments and UI actions match actual credential cleanup behavior.
- Add direct frontend tests for these behaviors.

### Do not invent

- Do not build a browser-side OAuth implementation.
- Do not collect DCR administrator credentials in the customer form.
- Do not guess resource scopes or production API hosts.
- Do not enable polling, balance or webhooks just because a button or wrapper exists.
- Do not claim Co-op supplied the account holder’s name from Account Validation.
- Do not hardcode one global account-number length while Co-op examples disagree.
- Do not treat password grant as forbidden; only make it a separately authorized flow when a resource actually requires it.

## 12. Requirement register

| ID | Priority | Required frontend change or invariant | Acceptance evidence |
|---|---|---|---|
| FCOOP-FE-001 | Critical | Treat PR #4 as unmerged implementation; correct stale main-branch implementation claims | Main/PR source comparison and PR status |
| FCOOP-FE-002 | Critical | Label and type CK/SK as Consumer Key and Consumer Secret | Form and request-type tests |
| FCOOP-FE-003 | Critical | Do not require username/password for the ordinary client_credentials flow | Create and reauthorize component tests |
| FCOOP-FE-004 | High | Remove generic customer Scope input; backend owns verified resource scopes | Form schema and payload tests |
| FCOOP-FE-005 | Critical | Send credentials only in authenticated POST JSON; never persist or log them | API and storage-boundary tests |
| FCOOP-FE-006 | High | Make failure, retry and credential-clear behavior explicit and accurate | Dialog lifecycle tests |
| FCOOP-FE-007 | High | Show connection authorization separately from account validation and operation capability | Status-state component tests |
| FCOOP-FE-008 | High | Gate poll and statement on capability === true; unknown is disabled | True/false/undefined capability tests |
| FCOOP-FE-009 | High | Do not offer poll while Co-op polling readiness is false or unknown | Co-op capability acceptance test |
| FCOOP-FE-010 | High | Label user-entered account name as an internal label, not verified bank identity | Registration and card tests |
| FCOOP-FE-011 | High | Preserve provider error categories and safe retry guidance | Error-code mapping tests |
| FCOOP-FE-012 | Critical | Preserve selected Tycoon client scope and server-side authorization | SUPER_ADMIN multi-client API tests |
| FCOOP-FE-013 | Medium | Key and invalidate client-scoped data correctly; refresh client summary after mutations | Query-cache tests |
| FCOOP-FE-014 | High | Keep account-number format validation server-authoritative until resource-specific rules are confirmed | Boundary tests for provider validation errors |
| FCOOP-FE-015 | High | Keep balance/webhook disabled until the backend explicitly reports readiness | Capability rendering tests |
| FCOOP-FE-016 | High | Add dedicated coverage for the bank credential form and connection lifecycle | CI test report |

## 13. Required frontend test matrix

The open PR #4 changes many screens and adds other tests, but its changed-file list contains no dedicated test for BankingSetupPanel, Co-op credential collection or connection lifecycle. That gap must not be disguised by unrelated M-PESA or payment tests.

Required tests:

1. **Credential form:** exactly CK and SK are required for the ordinary flow; username, password and generic scope are not shown or required.
2. **Payload contract:** create and reauthorize send consumerKey/consumerSecret in credentialMaterial and keep the selected Tycoon target client ID outside that object.
3. **Secret lifetime:** credentials never enter React Query, query keys, local/session storage, IndexedDB, URL, logs or telemetry; close/cancel/success clear the state.
4. **Error state:** invalid credentials, network timeout, invalid account, account authorization, wrong token type, insufficient scope, provider throttling and provider outage remain distinguishable.
5. **Account label:** UI text explicitly says the label is internal and not bank verified.
6. **Capability gating:** poll=true enables Sync; poll=false or missing disables it. statement=true enables Import statement; statement=false or missing disables it. Balance and webhook remain unavailable unless explicitly true.
7. **Connection semantics:** Active connection does not automatically set account validation or every capability to ready.
8. **Superadmin isolation:** client A and client B use distinct query keys and request scope; switching clients never displays stale details from the other client.
9. **Mutation refresh:** successful create, reauthorize, disconnect and account registration refresh the affected connection/account data and the parent client summary.
10. **No financial side effects:** unsupported polling or failed validation must not create misleading success states or mutate bank transactions/payments.

Use the repository's declared scripts: npm run typecheck, npm run lint, npm test and npm run build. Run the smallest relevant tests during implementation, then the full suite and build. This documentation branch did not run them.

## 14. Implementation order

1. Coordinate the backend request schema and the frontend type rename; do not ship mismatched payload contracts.
2. Change the ordinary credential form to CK/SK only and remove the generic scope input.
3. Ensure backend grant selection and resource scope configuration are authoritative; frontend does not choose OAuth grants.
4. Correct connection/account status semantics and typed error presentation.
5. Fail closed on missing operation capabilities.
6. Rename the account-name field and card display to an internal label.
7. Repair Superadmin query invalidation and add client-switch isolation tests.
8. Add the dedicated component/API tests, then run typecheck, lint, Vitest and build.
9. Verify against the backend integration branch and Co-op sandbox only when credentials and approved sandbox access are available. A local mock is not evidence of provider interoperability.

## 15. Release gate

Do not describe Co-op Connect 2.0.0 frontend integration as complete merely because the reusable panel renders or a BankConnection reaches Active. Completion requires the backend and frontend request names to agree, the CK/SK-only flow to pass, provider errors to remain correctly classified, unknown operations to remain disabled, selected-client isolation to pass, and provider sandbox verification to be recorded separately from local tests.

No live bank credentials, OAuth token or provider payload is included in this audit.
