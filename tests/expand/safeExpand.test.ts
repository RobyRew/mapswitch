import { describe, it, expect } from 'vitest';
import { safeExpand, ExpandError } from '@/lib/expand/safeExpand';

const publicLookup = async () => [{ address: '142.250.185.78' }];

function fetchSeq(map: Record<string, { status: number; location?: string }>) {
  return async (url: string) => {
    const r = map[url];
    if (!r) return new Response(null, { status: 200 });
    const headers = new Headers();
    if (r.location) headers.set('location', r.location);
    return new Response(null, { status: r.status, headers });
  };
}

describe('safeExpand', () => {
  it('follows allow-listed redirects to the final url', async () => {
    const fetchImpl = fetchSeq({
      'https://maps.app.goo.gl/abc': {
        status: 302,
        location: 'https://www.google.com/maps/place/X/@48.8584,2.2945,17z',
      },
      'https://www.google.com/maps/place/X/@48.8584,2.2945,17z': { status: 200 },
    });
    const final = await safeExpand('https://maps.app.goo.gl/abc', { fetchImpl, lookupImpl: publicLookup });
    expect(final).toContain('google.com/maps');
  });

  it('rejects a redirect to a non-allowlisted host', async () => {
    const fetchImpl = fetchSeq({
      'https://maps.app.goo.gl/abc': { status: 302, location: 'https://evil.com/' },
    });
    await expect(
      safeExpand('https://maps.app.goo.gl/abc', { fetchImpl, lookupImpl: publicLookup }),
    ).rejects.toBeInstanceOf(ExpandError);
  });

  it('rejects a host resolving to a private ip', async () => {
    const internalLookup = async () => [{ address: '127.0.0.1' }];
    await expect(
      safeExpand('https://maps.app.goo.gl/abc', { fetchImpl: fetchSeq({}), lookupImpl: internalLookup }),
    ).rejects.toBeInstanceOf(ExpandError);
  });

  it('rejects a non-allowlisted initial host', async () => {
    await expect(
      safeExpand('https://evil.com/', { fetchImpl: fetchSeq({}), lookupImpl: publicLookup }),
    ).rejects.toBeInstanceOf(ExpandError);
  });

  it('rejects non-http(s) schemes', async () => {
    await expect(
      safeExpand('file:///etc/passwd', { fetchImpl: fetchSeq({}), lookupImpl: publicLookup }),
    ).rejects.toBeInstanceOf(ExpandError);
  });
});
