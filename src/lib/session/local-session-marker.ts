// Non-sensitive offline shell marker only.
// Stores nothing that could authenticate: no password, cookie, token, or hash.
// Purpose: after a successful online login, allow the app shell to reopen
// offline and show a clear "re-authentication requires connectivity" state
// when /auth/me cannot be reached.

const STORAGE_KEY = 'pm.session.marker.v1';

export interface LocalSessionMarker {
  /** Stable identity key used for cache namespacing (not a secret). */
  identityKey: string;
  role: string;
  name: string;
  email: string;
  clientId: string | null;
  markedAt: string;
}

export function writeLocalSessionMarker(marker: LocalSessionMarker): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(marker));
  } catch {
    // storage may be unavailable — offline shell marker is best-effort
  }
}

export function readLocalSessionMarker(): LocalSessionMarker | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalSessionMarker;
    if (!parsed?.identityKey || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLocalSessionMarker(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}

/** Build a stable cache-namespace key from session fields (no secrets). */
export function identityKeyFromUser(user: {
  email: string;
  clientId?: string | null;
  role?: string;
}): string {
  const client = user.clientId ?? 'platform';
  return `${client}:${user.email.toLowerCase()}`;
}
