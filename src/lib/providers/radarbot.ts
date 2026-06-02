import type { Provider } from './types';

// Radarbot publishes NO public URL scheme. On Android we reach it through the
// generic geo: intent (the OS app-chooser lists Radarbot); on iOS there is no
// way to deep-link it, so it surfaces as an explicit disabled option rather
// than a dead link.
export const radarbot: Provider = {
  id: 'radarbot',
  name: 'Radarbot',
  color: '#ff9500',
  platforms: ['ios', 'android'],
  showWhenUnavailable: true,

  link(t, platform) {
    if (platform === 'android') {
      const label = t.label ? `(${encodeURIComponent(t.label)})` : '';
      return `geo:${t.lat},${t.lng}?q=${t.lat},${t.lng}${label}`;
    }
    return null; // iOS / web: unavailable
  },
};
