// Open-redirect guard: only ever redirect to a same-origin, path-only target.
// Rejects absolute URLs, protocol-relative (`//host`), backslash tricks,
// embedded credentials, control chars, and scheme-like values.
function hasControlChar(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (!target) return fallback;
  if (target[0] !== '/') return fallback; // must be an absolute path
  if (target.startsWith('//') || target.startsWith('/\\')) return fallback; // protocol-relative
  if (target.includes('@')) return fallback; // userinfo trick
  if (target.includes('\\')) return fallback; // backslash normalisation tricks
  if (hasControlChar(target)) return fallback; // control chars
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(target)) return fallback; // scheme-like, e.g. "/javascript:"
  return target;
}
