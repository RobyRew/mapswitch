import { describe, it, expect } from 'vitest';
import { isBlockedIp } from '@/lib/expand/ipGuard';
import { isAllowedHost } from '@/lib/expand/allowlist';

// ★ Security-critical: Phase 1 does not ship unless this suite is green.

describe('ipGuard blocks internal / special ranges', () => {
  const blocked = [
    '127.0.0.1',
    '10.0.0.5',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254', // cloud metadata
    '100.64.0.1', // CGNAT
    '0.0.0.0',
    '255.255.255.255',
    '::1',
    '::',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:169.254.169.254',
  ];
  for (const ip of blocked) {
    it(`blocks ${ip}`, () => expect(isBlockedIp(ip)).toBe(true));
  }

  const allowed = ['8.8.8.8', '1.1.1.1', '142.250.185.78', '2606:4700:4700::1111'];
  for (const ip of allowed) {
    it(`allows ${ip}`, () => expect(isBlockedIp(ip)).toBe(false));
  }
});

describe('allowlist suffix matching', () => {
  it('allows known hosts and their subdomains', () => {
    expect(isAllowedHost('maps.app.goo.gl')).toBe(true);
    expect(isAllowedHost('www.google.com')).toBe(true);
    expect(isAllowedHost('maps.apple.com')).toBe(true);
  });

  it('rejects suffix-spoofing and look-alikes', () => {
    expect(isAllowedHost('maps.app.goo.gl.evil.com')).toBe(false);
    expect(isAllowedHost('notgoo.gl')).toBe(false);
    expect(isAllowedHost('evil.com')).toBe(false);
  });
});
