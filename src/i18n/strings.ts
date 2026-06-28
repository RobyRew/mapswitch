import { t, path, type Locale } from './utils';
import { EXPIRY_TOKENS, type ExpiryToken } from '@/lib/share/expiry';
import type { ShareActionsStrings } from '@/islands/ShareActions';

export interface ExpiryStrings {
  label: string;
  options: Record<ExpiryToken, string>;
}

const EXPIRY_KEY: Record<ExpiryToken, string> = {
  '1h': 'account.expiry1h',
  '8h': 'account.expiry8h',
  '1d': 'account.expiry1d',
  '7d': 'account.expiry7d',
  '30d': 'account.expiry30d',
  '6mo': 'account.expiry6mo',
  '1y': 'account.expiry1y',
  '2y': 'account.expiry2y',
  never: 'account.expiryIndefinite',
};

/** Labels for the expiry dropdown (Settings default + the share panel). */
export function expiryStrings(locale: Locale): ExpiryStrings {
  const options = {} as Record<ExpiryToken, string>;
  for (const tk of EXPIRY_TOKENS) options[tk] = t(locale, EXPIRY_KEY[tk]);
  return { label: t(locale, 'account.expiryLabel'), options };
}

/** Strings for the <ShareActions> toolkit — shared by the home result + open pages. */
export function shareActionsStrings(locale: Locale): ShareActionsStrings {
  return {
    neutralTitle: t(locale, 'chooser.share.neutralTitle'),
    namePlaceholder: t(locale, 'share.labelPlaceholder'),
    modeNeutral: t(locale, 'chooser.share.modeNeutral'),
    modeShort: t(locale, 'chooser.share.modeShort'),
    yourLink: t(locale, 'share.yourLink'),
    shareButton: t(locale, 'chooser.share.shareButton'),
    customSlugPlaceholder: t(locale, 'chooser.share.customSlugPlaceholder'),
    customSlugClaim: t(locale, 'chooser.share.customSlugClaim'),
    accountHref: path(locale, 'account'),
    copy: t(locale, 'share.copy'),
    copied: t(locale, 'share.copied'),
    saveShorten: t(locale, 'account.saveShorten'),
    yourShortLink: t(locale, 'account.yourShortLink'),
    expiry: expiryStrings(locale),
    anonNote: t(locale, 'account.anonNote'),
    weeklyLimit: t(locale, 'account.weeklyLimit'),
    accountLimit: t(locale, 'account.accountLimit'),
    error: t(locale, 'account.genericError'),
  };
}
