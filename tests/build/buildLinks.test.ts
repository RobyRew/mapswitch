import { describe, it, expect } from 'vitest';
import { buildForRegistry } from '@/lib/providers/registry';

const place = { lat: 48.8584, lng: 2.2945, label: 'Eiffel' };

describe('buildForRegistry — platform behaviour', () => {
  it('android offers Radarbot via a geo: link', () => {
    const rb = buildForRegistry(place, 'android').find((o) => o.id === 'radarbot');
    expect(rb?.available).toBe(true);
    expect(rb?.href).toContain('geo:');
  });

  it('ios offers Radarbot via the Shortcuts bridge', () => {
    const rb = buildForRegistry(place, 'ios').find((o) => o.id === 'radarbot');
    expect(rb?.available).toBe(true);
    expect(rb?.href).toContain('shortcuts://run-shortcut');
  });

  it('web omits Radarbot and the geo system-chooser entirely', () => {
    const web = buildForRegistry(place, 'web');
    expect(web.find((o) => o.id === 'radarbot')).toBeUndefined();
    expect(web.find((o) => o.id === 'geo')).toBeUndefined();
  });

  it('android exposes the geo: system chooser', () => {
    expect(buildForRegistry(place, 'android').find((o) => o.id === 'geo')?.href).toContain('geo:');
  });

  it('Apple Maps is not offered on android', () => {
    expect(buildForRegistry(place, 'android').find((o) => o.id === 'apple')).toBeUndefined();
  });
});
