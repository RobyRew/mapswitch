import { describe, it, expect } from 'vitest';
import { readJson, HttpError } from '@/lib/http/guard';

function req(body: string, ct = 'application/json'): Request {
  return new Request('http://x/api', { method: 'POST', headers: { 'content-type': ct }, body });
}

describe('readJson', () => {
  it('parses a valid small json body', async () => {
    await expect(readJson(req(JSON.stringify({ a: 1 })))).resolves.toEqual({ a: 1 });
  });

  it('rejects a non-json content-type (415)', async () => {
    await expect(readJson(req('{}', 'text/plain'))).rejects.toMatchObject({ status: 415 });
  });

  it('rejects an oversized body (413)', async () => {
    const big = JSON.stringify({ a: 'x'.repeat(100) });
    await expect(readJson(req(big), 50)).rejects.toMatchObject({ status: 413 });
  });

  it('rejects malformed json (400)', async () => {
    await expect(readJson(req('{not json'))).rejects.toMatchObject({ status: 400 });
  });

  it('throws HttpError instances', async () => {
    await expect(readJson(req('{}', 'text/plain'))).rejects.toBeInstanceOf(HttpError);
  });
});
