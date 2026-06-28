import { t, type Locale } from './utils';
import type { ShareActionsStrings } from '@/islands/ShareActions';

/** Strings for the <ShareActions> toolkit — shared by the home result + Share page. */
export function shareActionsStrings(locale: Locale): ShareActionsStrings {
  return {
    neutralTitle: t(locale, 'chooser.share.neutralTitle'),
    namePlaceholder: t(locale, 'share.labelPlaceholder'),
    yourLink: t(locale, 'share.yourLink'),
    copyNeutral: t(locale, 'chooser.share.copyNeutral'),
    shareButton: t(locale, 'chooser.share.shareButton'),
    copy: t(locale, 'share.copy'),
    copied: t(locale, 'share.copied'),
    saveShorten: t(locale, 'account.saveShorten'),
    yourShortLink: t(locale, 'account.yourShortLink'),
    expiryLabel: t(locale, 'account.expiryLabel'),
    expiryIndefinite: t(locale, 'account.expiryIndefinite'),
    expiry7d: t(locale, 'account.expiry7d'),
    expiry30d: t(locale, 'account.expiry30d'),
    expiry1y: t(locale, 'account.expiry1y'),
    anonNote: t(locale, 'account.anonNote'),
    weeklyLimit: t(locale, 'account.weeklyLimit'),
    accountLimit: t(locale, 'account.accountLimit'),
    error: t(locale, 'account.genericError'),
  };
}
