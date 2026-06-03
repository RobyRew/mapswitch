import { describe, it, expect } from 'vitest';
import { safeExpand } from '@/lib/expand/safeExpand';

function fetchSeq(map: Record<string, { status: number; location?: string }>) {
  return async (url: string) => {
    const r = map[url];
    if (!r) return new Response(null, { status: 200 });
    const headers = new Headers();
    if (r.location) headers.set('location', r.location);
    return new Response(null, { status: r.status, headers });
  };
}

describe('safeExpand — EU consent interstitial', () => {
  it('takes the real URL from consent.google.com ?continue=', async () => {
    const real = 'https://www.google.com/maps/search/41.2,1.1';
    const fetchImpl = fetchSeq({
      'https://maps.app.goo.gl/abc': {
        status: 302,
        location: 'https://consent.google.com/m?continue=' + encodeURIComponent(real) + '&gl=ES',
      },
      [real]: { status: 200 },
    });
    const lookupImpl = async () => [{ address: '142.250.0.1' }];
    const final = await safeExpand('https://maps.app.goo.gl/abc', { fetchImpl, lookupImpl });
    expect(final).toBe(real);
  });
});
