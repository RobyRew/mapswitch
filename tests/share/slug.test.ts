import { describe, it, expect } from 'vitest';
import { isValidUsername, normalizeUsername, normalizeSlug, isValidSlug } from '@/lib/share/slug';

describe('username', () => {
  it('accepts valid handles', () => {
    expect(isValidUsername('robyrew')).toBe(true);
    expect(isValidUsername('ab_c-1')).toBe(true);
  });

  it('rejects too-short, non-lowercase, spaced, or reserved', () => {
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('UPPER')).toBe(false);
    expect(isValidUsername('has space')).toBe(false);
    expect(isValidUsername('api')).toBe(false);
    expect(isValidUsername('account')).toBe(false);
  });

  it('normalizes', () => {
    expect(normalizeUsername('  RobyRew ')).toBe('robyrew');
  });
});

describe('custom slug', () => {
  it('slugifies a label', () => {
    expect(normalizeSlug('La Casa Que Baila!')).toBe('la-casa-que-baila');
    expect(normalizeSlug('  Hotel  Tarraco--Park ')).toBe('hotel-tarraco-park');
  });

  it('validates the final form', () => {
    expect(isValidSlug('la-casa-que-baila')).toBe(true);
    expect(isValidSlug('-bad')).toBe(false);
    expect(isValidSlug('a'.repeat(41))).toBe(false);
  });
});
