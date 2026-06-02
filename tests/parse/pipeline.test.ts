import { describe, it, expect } from 'vitest';
import { parsePure, isExpandable, urlForExpansion } from '@/lib/parse/pipeline';

describe('pipeline expansion routing', () => {
  it('flags a google short link as needing server expansion', () => {
    expect(isExpandable('https://maps.app.goo.gl/abc123')).toBe(true);
    expect(parsePure('https://maps.app.goo.gl/abc123')).toBeNull();
    expect(urlForExpansion('https://maps.app.goo.gl/abc123')).toBe('https://maps.app.goo.gl/abc123');
  });

  it('does not flag a full link as expandable', () => {
    expect(isExpandable('https://www.google.com/maps/@1,2,17z')).toBe(false);
  });

  it('parses the expanded url (simulating the server step)', () => {
    const expanded =
      'https://www.google.com/maps/place/X/@48.8584,2.2945,17z/data=!3d48.8584!4d2.2945';
    expect(parsePure(expanded)).toMatchObject({ lat: 48.8584, lng: 2.2945, source: 'google' });
  });
});
