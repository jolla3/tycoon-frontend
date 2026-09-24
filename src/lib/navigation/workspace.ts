/**
 * Workspace navigation — resource IDs live in history state + sessionStorage.
 * They must NEVER appear in the browser path or query string.
 */
export type WorkspaceKind = 'estate' | 'house' | 'tenant' | 'houseType';

const PATH: Record<WorkspaceKind, string> = {
  estate: '/estates/workspace',
  house: '/houses/workspace',
  tenant: '/tenants/workspace',
  houseType: '/house-types/workspace',
};

const KEY: Record<WorkspaceKind, string> = {
  estate: 'estateId',
  house: 'houseId',
  tenant: 'tenantId',
  houseType: 'houseTypeId',
};

/** Optional list-page filter (e.g. payments/reports/sms scoped to an estate). */
const LIST_SCOPE_ESTATE = 'listScopeEstateId';

export function openWorkspace(
  kind: WorkspaceKind,
  id: string,
  router: { push: (href: string) => void }
) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(KEY[kind], id);
    window.history.pushState({ [KEY[kind]]: id }, '', PATH[kind]);
  }
  router.push(PATH[kind]);
}

export function readWorkspaceId(kind: WorkspaceKind): string | null {
  if (typeof window === 'undefined') return null;
  const fromState = (window.history.state as Record<string, string> | null)?.[KEY[kind]];
  if (fromState) return String(fromState);
  return sessionStorage.getItem(KEY[kind]);
}

/** Scope a global list page to an estate without putting the id in the URL. */
export function setListScopeEstate(estateId: string | null) {
  if (typeof window === 'undefined') return;
  if (estateId) sessionStorage.setItem(LIST_SCOPE_ESTATE, estateId);
  else sessionStorage.removeItem(LIST_SCOPE_ESTATE);
}

export function readListScopeEstate(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(LIST_SCOPE_ESTATE);
}

/** Navigate to a global module while optionally scoping to an estate (no query ids). */
export function openScopedList(
  href: '/payments' | '/reports' | '/sms' | '/houses' | '/tenants',
  estateId: string | null,
  router: { push: (href: string) => void }
) {
  setListScopeEstate(estateId);
  router.push(href);
}
