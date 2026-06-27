import { describe, it, expect } from 'vitest';
import { google } from '@/lib/providers/google';

const P = google.parse!;

describe('google provider — input shapes', () => {
  it('@lat,lng,zoom', () => {
    expect(P(new URL('https://www.google.com/maps/@48.8584,2.2945,17z'))).toMatchObject({
      lat: 48.8584,
      lng: 2.2945,
    });
  });

  it('place name + !3d!4d precise pin wins over @viewport', () => {
    const m = P(
      new URL('https://www.google.com/maps/place/Eiffel+Tower/@48.8,2.2,17z/data=!3d48.8584!4d2.2945'),
    );
    expect(m).toMatchObject({ lat: 48.8584, lng: 2.2945, label: 'Eiffel Tower' });
  });

  it('api=1 query', () => {
    expect(P(new URL('https://www.google.com/maps/search/?api=1&query=40.7484,-73.9857'))).toMatchObject({
      lat: 40.7484,
      lng: -73.9857,
    });
  });

  it('?q=coords on maps.google.com', () => {
    expect(P(new URL('https://maps.google.com/?q=51.5007,-0.1246'))).toMatchObject({
      lat: 51.5007,
      lng: -0.1246,
    });
  });

  it('directional coords inside a business-link address string', () => {
    const url = new URL(
      'https://maps.google.com/maps?q=' +
        encodeURIComponent('Hotel Tarraco Park, Carretera València, 206 / N: 41.1151 - E: 1.21836, 43006 Tarragona') +
        '&ftid=0x12a3fd5313e08f6b:0xcd1e037dd18cbb90&entry=gps',
    );
    expect(P(url)).toMatchObject({ lat: 41.1151, lng: 1.21836, label: 'Hotel Tarraco Park' });
  });

  it('builds the universal api=1 link', () => {
    expect(google.link!({ lat: 1, lng: 2 }, 'android')).toBe(
      'https://www.google.com/maps/search/?api=1&query=1,2',
    );
  });
});
