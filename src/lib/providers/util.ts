/** Label-boundary host suffix match: 'maps.apple.com' matches 'maps.apple.com'
 *  and '*.maps.apple.com', but NOT 'maps.apple.com.evil.com'. */
export function hostMatches(url: URL, suffixes: string[]): boolean {
  const h = url.hostname.toLowerCase();
  return suffixes.some((s) => h === s || h.endsWith('.' + s));
}
