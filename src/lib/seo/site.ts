import type { Metadata } from 'next';

/**
 * NEXT_PUBLIC_SITE_URL must be an absolute HTTP(S) origin only.
 * Leave it unset until the final public product domain is approved.
 */
export function parseSiteOrigin(value: string | undefined | null): URL | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an absolute HTTP(S) site origin.');
  }

  if (
    (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin only, without credentials, path, query or fragment.',
    );
  }

  return new URL(parsed.origin);
}

export function getSiteOrigin(): URL | undefined {
  return parseSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
}

export function canonicalUrlForPath(path: string, origin: URL | undefined): string | undefined {
  if (!origin) return undefined;
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('?') || path.includes('#')) {
    throw new Error('Canonical paths must be fixed, same-site absolute paths without query or fragment.');
  }
  return new URL(path, origin).toString();
}

export function canonicalAlternates(path: string): Metadata['alternates'] {
  const canonical = canonicalUrlForPath(path, getSiteOrigin());
  return canonical ? { canonical } : undefined;
}
