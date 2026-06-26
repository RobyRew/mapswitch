import { describe, it, expect } from 'vitest';
import { radarbot, RADARBOT_SHORTCUT } from '@/lib/providers/radarbot';

describe('radarbot provider', () => {
  it('builds an Android geo: intent', () => {
    expect(radarbot.link!({ lat: 41.23, lng: 1.15 }, 'android')).toBe('geo:41.23,1.15?q=41.23,1.15');
  });

  it('includes the label on Android', () => {
    expect(radarbot.link!({ lat: 41.23, lng: 1.15, label: 'Plaça Nova' }, 'android')).toBe(
      'geo:41.23,1.15?q=41.23,1.15(Pla%C3%A7a%20Nova)',
    );
  });

  it('bridges iOS through the Shortcuts URL scheme', () => {
    const href = radarbot.link!({ lat: 41.23, lng: 1.15 }, 'ios')!;
    expect(href).toBe(
      `shortcuts://run-shortcut?name=${encodeURIComponent(RADARBOT_SHORTCUT)}&input=text&text=41.23%2C1.15`,
    );
  });

  it('is unavailable on the web', () => {
    expect(radarbot.link!({ lat: 1, lng: 2 }, 'web')).toBeNull();
  });
});
