import type { Provider } from './types';

// Radarbot publishes NO public URL scheme. On Android we reach it through the
// generic geo: intent (the OS app-chooser lists Radarbot). On iOS its only
// programmatic entry is its SiriKit `NavigateTo` intent, which demands a
// Placemark object — a raw "lat,lng" string can't be injected directly. So we
// bridge through a one-time user Shortcut named exactly RADARBOT_SHORTCUT:
//   Find Locations [Shortcut Input]  →  Radarbot · Navigate to [Locations]
// We hand it the coordinates as text via the Shortcuts URL scheme.
export const RADARBOT_SHORTCUT = 'Open in Radarbot';

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
    if (platform === 'ios') {
      const name = encodeURIComponent(RADARBOT_SHORTCUT);
      const text = encodeURIComponent(`${t.lat},${t.lng}`);
      return `shortcuts://run-shortcut?name=${name}&input=text&text=${text}`;
    }
    return null; // web: unavailable
  },
};
