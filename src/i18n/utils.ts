import en from './en.json';
import es from './es.json';
import ca from './ca.json';
import ro from './ro.json';

export const LOCALES = ['en', 'es', 'ca', 'ro'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

type Dict = Record<string, unknown>;
const dictionaries = { en, es, ca, ro } as Record<Locale, Dict>;

function deepGet(obj: Dict, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (acc, key) => (acc && typeof acc === 'object' ? (acc as Dict)[key] : undefined),
    obj,
  );
}

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function getDict(locale: Locale): Dict {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/** t('en', 'home.title') with {{var}} interpolation and EN fallback. */
export function t(locale: Locale, key: string, vars: Record<string, string | number> = {}): string {
  let value = deepGet(getDict(locale), key);
  if (value === undefined && locale !== DEFAULT_LOCALE) {
    value = deepGet(dictionaries[DEFAULT_LOCALE], key);
  }
  if (typeof value !== 'string') return key;
  return value.replace(/\{\{(\w+)\}\}/g, (_, name) => (name in vars ? String(vars[name]) : `{{${name}}}`));
}

/** Localised URL: path('en', 'share') → '/en/share' */
export function path(locale: Locale, ...segments: string[]): string {
  const clean = segments.flatMap((s) => s.split('/')).filter(Boolean).join('/');
  return `/${locale}${clean ? `/${clean}` : ''}`;
}

export function stripLocale(pathname: string): string {
  for (const loc of LOCALES) {
    const prefix = `/${loc}`;
    if (pathname === prefix) return '/';
    if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  }
  return pathname;
}

export function localeIntl(locale: Locale): string {
  return { en: 'en-GB', es: 'es-ES', ca: 'ca-ES', ro: 'ro-RO' }[locale];
}

/** hreflang variants of the current page. */
export function alternateLinks(currentPath: string): Array<{ locale: Locale; href: string }> {
  const stripped = stripLocale(currentPath);
  return LOCALES.map((loc) => ({ locale: loc, href: `/${loc}${stripped === '/' ? '' : stripped}` }));
}
