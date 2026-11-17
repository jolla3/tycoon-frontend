// src/lib/query/keys.ts
//
// The ONE place query keys are built. Every key that depends on a filter,
// page or estate includes it, so changing any of those can never serve (or
// persist to IndexedDB) another view's data. Invalidate by FAMILY (the short
// prefix) after a mutation.
//
// Estate identity here is only a cache/scoping hint. The backend decides which
// estates a user may read; the frontend never treats these keys or any client
// side filtering as authorization.

type Filters = object | undefined;

export const platformKeys = {
  all: ['platform'] as const,
  overview: () => ['platform', 'overview'] as const,
  clientsFamily: () => ['platform', 'clients'] as const,
  clients: (filters?: Filters) => ['platform', 'clients', filters ?? {}] as const,
  client: (clientId: string) => ['platform', 'client', clientId] as const,
  diagnostics: (clientId: string) => ['platform', 'diagnostics', clientId] as const,
  entitlements: (filters?: Filters) => ['platform', 'entitlements', filters ?? {}] as const,
  bankingIntegrations: (filters?: Filters) => ['platform', 'integrations', 'banking', filters ?? {}] as const,
  mpesaIntegrations: (filters?: Filters) => ['platform', 'integrations', 'mpesa', filters ?? {}] as const,
  users: (filters?: Filters) => ['platform', 'users', filters ?? {}] as const,
  subscriptions: (filters?: Filters) => ['platform', 'subscriptions', filters ?? {}] as const,
  audit: (filters?: Filters) => ['platform', 'audit', filters ?? {}] as const,
  health: () => ['platform', 'health'] as const,
};

/**
 * Estate-scoped keys. `estateId` of `'all'` is an explicit "no estate filter"
 * request, never an omitted value, so an unfiltered list can never be confused
 * with a filtered one.
 */
export const estateKeys = {
  scope: (estateId: string | undefined) => estateId ?? 'all',
  tenants: (estateId: string | undefined, filters?: Filters) => ['tenants', estateKeys.scope(estateId), filters ?? {}] as const,
  tenantsFamily: () => ['tenants'] as const,
  tenantWorkspace: (tenantId: string) => ['tenant-workspace', tenantId] as const,
  transactions: (estateId: string | undefined, filters?: Filters) => ['transactions', estateKeys.scope(estateId), filters ?? {}] as const,
  unmatched: (estateId: string | undefined, filters?: Filters) => ['transactions', 'unmatched', estateKeys.scope(estateId), filters ?? {}] as const,
  transactionsFamily: () => ['transactions'] as const,
  houseTypes: (estateId: string | undefined, includeInactive: boolean) => ['house-types', estateKeys.scope(estateId), includeInactive] as const,
  houseTypesFamily: () => ['house-types'] as const,
  houses: (estateId: string | undefined, filters?: Filters) => ['houses', estateKeys.scope(estateId), filters ?? {}] as const,
  housesFamily: () => ['houses'] as const,
  payments: (estateId: string | undefined, filters?: Filters) => ['payments', estateKeys.scope(estateId), filters ?? {}] as const,
  paymentsFamily: () => ['payments'] as const,
};

export const bankingKeys = {
  connections: () => ['bank', 'connections'] as const,
  accounts: () => ['bank', 'accounts'] as const,
  account: (id: string) => ['bank', 'accounts', id] as const,
};

export const mpesaKeys = {
  link: (tenantId: string) => ['mpesa', 'link', tenantId] as const,
  linkFamily: () => ['mpesa', 'link'] as const,
  submissions: (clientId: string | undefined, filters?: Filters) => ['mpesa', 'submissions', clientId ?? 'own', filters ?? {}] as const,
  submissionsFamily: () => ['mpesa', 'submissions'] as const,
};
