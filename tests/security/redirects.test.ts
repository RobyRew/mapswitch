import { describe, it, expect } from 'vitest';
import { safeRedirect } from '@/lib/security/redirects';

describe('safeRedirect', () => {
  it('accepts same-origin paths (incl. hyphens)', () => {
    expect(safeRedirect('/en/account')).toBe('/en/account');
    expect(safeRedirect('/en/account/reset-password')).toBe('/en/account/reset-password');
    expect(safeRedirect('/')).toBe('/');
  });

  it('rejects protocol-relative and absolute urls', () => {
    expect(safeRedirect('//evil.com')).toBe('/');
    expect(safeRedirect('https://evil.com')).toBe('/');
    expect(safeRedirect('http://x')).toBe('/');
  });

  it('rejects backslash / scheme / userinfo / control-char tricks', () => {
    expect(safeRedirect('/\\evil.com')).toBe('/');
    expect(safeRedirect('/javascript:alert(1)')).toBe('/');
    expect(safeRedirect('javascript:alert(1)')).toBe('/');
    expect(safeRedirect('/foo@evil')).toBe('/');
    expect(safeRedirect('/foo\nbar')).toBe('/');
  });

  it('uses the provided fallback for empty input', () => {
    expect(safeRedirect(null, '/en')).toBe('/en');
    expect(safeRedirect(undefined, '/en')).toBe('/en');
  });
});
