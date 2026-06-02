import { describe, it, expect } from 'vitest';
import { safeExpand, ExpandError } from '@/lib/expand/safeExpand';

function fetchSeq(map: Record<string, { status: number; location?: string }>) {
  return async (url: string) => {
    const r = map[url];
    if (!r) return new Response(null, { status: 200 });
    const headers = new Headers();
    if (r.location) headers.set('location', r.location);
    return new Response(null, { status: r.status, headers });
  };
}

describe('safeExpand — DNS rebinding on redirect', () => {
  it('blocks a redirect whose target host resolves to a private IP', async () => {
    const fetchImpl = fetchSeq({
      'https://maps.app.goo.gl/abc': { status: 302, location: 'https://maps.google.com/evil' },
    });
    // First host is public; the redirect target re-resolves to loopback.
    const lookupImpl = async (host: string) =>
      host === 'maps.app.goo.gl' ? [{ address: '142.250.0.1' }] : [{ address: '127.0.0.1' }];

    await expect(
      safeExpand('https://maps.app.goo.gl/abc', { fetchImpl, lookupImpl }),
    ).rejects.toBeInstanceOf(ExpandError);
  });
});
