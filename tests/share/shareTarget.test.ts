import { describe, it, expect } from 'vitest';
import { pickSharedInput, detectLocale } from '@/lib/share/shareTarget';

const sp = (obj: Record<string, string>) => new URLSearchParams(obj);

describe('pickSharedInput', () => {
  it('returns a plain shared url', () => {
    expect(pickSharedInput(sp({ url: 'https://maps.app.goo.gl/abc' }))).toBe('https://maps.app.goo.gl/abc');
  });

  it('extracts the url buried in Waze share prose (text param)', () => {
    const text =
      "I'm using Waze to drive to X, arriving at 7:23. Watch my drive in real-time: https://waze.com/ul?a=share_drive&sd=x&env=row";
    expect(pickSharedInput(sp({ text }))).toBe('https://waze.com/ul?a=share_drive&sd=x&env=row');
  });

  it('prefers a url found anywhere over a plain title', () => {
    expect(pickSharedInput(sp({ title: 'My place', text: 'see https://g.co/x' }))).toBe('https://g.co/x');
  });

  it('falls back to a place name when there is no url', () => {
    expect(pickSharedInput(sp({ text: 'Sagrada Familia, Barcelona' }))).toBe('Sagrada Familia, Barcelona');
  });

  it('returns null for an empty share', () => {
    expect(pickSharedInput(sp({}))).toBeNull();
  });
});

describe('detectLocale', () => {
  it('matches the first supported language', () => {
    expect(detectLocale('es-ES,es;q=0.9,en;q=0.8')).toBe('es');
    expect(detectLocale('ca,en;q=0.9')).toBe('ca');
  });

  it('falls back to en for unsupported / missing', () => {
    expect(detectLocale('de-DE,fr;q=0.9')).toBe('en');
    expect(detectLocale(null)).toBe('en');
  });
});
