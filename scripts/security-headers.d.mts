// Type surface for the runtime-safe security-headers module (plain ESM).
export function buildCSP(umamiScriptUrl?: string | null): string;
export function securityHeaders(
  pathname: string,
  umamiScriptUrl?: string | null,
): Record<string, string>;
