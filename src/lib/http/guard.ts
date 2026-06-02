// Shared JSON request guard: enforce Content-Type, cap body size, parse safely.
// Closes the missing/odd Content-Type trick at the app layer (complements
// Astro's checkOrigin) and bounds memory before parsing.

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export async function readJson(request: Request, maxBytes = 16_384): Promise<unknown> {
  const ct = (request.headers.get('content-type') ?? '').toLowerCase();
  if (!ct.includes('application/json')) {
    throw new HttpError(415, 'unsupported_media_type');
  }
  // Pre-check Content-Length when present, then enforce the real size too.
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new HttpError(413, 'payload_too_large');
  }
  const buf = await request.arrayBuffer();
  if (buf.byteLength > maxBytes) {
    throw new HttpError(413, 'payload_too_large');
  }
  try {
    return JSON.parse(new TextDecoder().decode(buf));
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
}
