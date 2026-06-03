import { describe, it, expect } from 'vitest';
import { google } from '@/lib/providers/google';

describe('google coords-in-path fallback (expanded short links)', () => {
  it('parses /maps/search/LAT,+LNG', () => {
    const m = google.parse!(new URL('https://www.google.com/maps/search/41.225531,+1.148071?entry=tts'));
    expect(m).toMatchObject({ lat: 41.225531, lng: 1.148071, source: 'google' });
  });

  it('parses /maps/place/LAT,LNG', () => {
    expect(google.parse!(new URL('https://www.google.com/maps/place/48.8584,2.2945'))).toMatchObject({
      lat: 48.8584,
      lng: 2.2945,
    });
  });
});
