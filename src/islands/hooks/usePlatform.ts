import { useEffect, useState } from 'react';
import type { Platform } from '@/lib/providers/types';

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  // iPadOS 13+ reports as "Macintosh" — disambiguate with touch support.
  if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document)) {
    return 'ios';
  }
  return 'web';
}

export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>('web');
  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);
  return platform;
}
