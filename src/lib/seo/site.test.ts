import { describe, expect, it } from 'vitest';
import { canonicalUrlForPath, parseSiteOrigin } from './site';

describe('parseSiteOrigin', () => {
  it('returns no origin while the final public domain is not configured', () => {
    expect(parseSiteOrigin(undefined)).toBeUndefined();
    expect(parseSiteOrigin(null)).toBeUndefined();
    expect(parseSiteOrigin('   ')).toBeUndefined();
  });

  it('accepts and normalizes an absolute HTTPS origin', () => {
    expect(parseSiteOrigin('https://app.example.com/')?.toString()).toBe('https://app.example.com/');
    expect(parseSiteOrigin('https://app.example.com')?.origin).toBe('https://app.example.com');
  });

  it('allows HTTP for local development', () => {
    expect(parseSiteOrigin('http://localhost:3000')?.origin).toBe('http://localhost:3000');
  });

  it.each([
    'app.example.com',
    'ftp://app.example.com',
    'https://user:password@app.example.com',
    'https://app.example.com/subpath',
    'https://app.example.com?preview=1',
    'https://app.example.com#fragment',
  ])('rejects an invalid site origin: %s', (value) => {
    expect(() => parseSiteOrigin(value)).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });
});

describe('canonicalUrlForPath', () => {
  const origin = new URL('https://app.example.com/');

  it('does not emit canonicals when the site origin is absent', () => {
    expect(canonicalUrlForPath('/', undefined)).toBeUndefined();
    expect(canonicalUrlForPath('/privacy', undefined)).toBeUndefined();
  });

  it('builds absolute same-origin canonical URLs', () => {
    expect(canonicalUrlForPath('/', origin)).toBe('https://app.example.com/');
    expect(canonicalUrlForPath('/privacy', origin)).toBe('https://app.example.com/privacy');
  });

  it.each(['privacy', '//other.example/path', '/privacy?token=secret', '/pay#t=secret'])(
    'rejects non-canonical path input: %s',
    (path) => {
      expect(() => canonicalUrlForPath(path, origin)).toThrow(/Canonical paths/);
    },
  );
});
