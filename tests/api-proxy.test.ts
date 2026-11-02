import { afterEach, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import { PassThrough } from 'node:stream';
import { createApiProxy } from '../scripts/api-proxy.cjs';

function request(path: string, headers: Record<string, string> = {}) {
  return Object.assign(new PassThrough(), { url: path, method: 'POST', headers });
}
function response() { return Object.assign(new PassThrough(), { writeHead: vi.fn() }); }
function upstream() { const stream = new PassThrough(); return Object.assign(stream, { setTimeout: vi.fn(() => stream) }); }
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('Metro same-origin API proxy', () => {
  it('only proxies API/storage namespaces and delegates page routes to Metro', () => {
    const fallback = vi.fn(); const outgoing = vi.spyOn(http, 'request');
    const proxy = createApiProxy(fallback);
    for (const path of ['/login', '/api.evil', 'http://evil.invalid/api/auth/me', '/']) proxy(request(path) as any, response() as any);
    expect(fallback).toHaveBeenCalledTimes(4); expect(outgoing).not.toHaveBeenCalled();
  });

  it('keeps the target fixed and preserves credentials plus trusted HTTPS context', async () => {
    vi.stubEnv('EXPO_WEB_PREVIEW_URL', 'https://preview.example.invalid');
    const remote = upstream(); const outgoing = vi.spyOn(http, 'request').mockReturnValue(remote as any);
    const req = request('/api/auth/local-login?test=1', { origin: 'https://preview.example.invalid', host: 'evil.invalid', cookie: 'owned=mock', authorization: 'Bearer mock', 'proxy-connection': 'keep-alive' });
    createApiProxy(vi.fn())(req as any, response() as any);
    req.end('mock-body'); await new Promise(resolve => setImmediate(resolve));
    const options = outgoing.mock.calls[0][0] as http.RequestOptions;
    expect(options).toMatchObject({ hostname: '127.0.0.1', port: 3000, path: '/api/auth/local-login?test=1' });
    expect(options.headers).toMatchObject({ cookie: 'owned=mock', authorization: 'Bearer mock', 'x-forwarded-proto': 'https', 'x-forwarded-host': 'preview.example.invalid' });
    expect(options.headers).not.toHaveProperty('proxy-connection');
    expect(remote.read()?.toString()).toBe('mock-body');
  });

  it('streams the response without flattening multiple Set-Cookie headers', async () => {
    const remote = upstream(); vi.spyOn(http, 'request').mockReturnValue(remote as any);
    const req = request('/api/auth/me'); const res = response(); const chunks: Buffer[] = [];
    res.on('data', chunk => chunks.push(Buffer.from(chunk)));
    createApiProxy(vi.fn())(req as any, res as any);
    const cookies = ['one=mock; HttpOnly', 'two=mock; HttpOnly'];
    const incoming = Object.assign(new PassThrough(), { statusCode: 200, headers: { 'set-cookie': cookies, 'content-type': 'application/json' } });
    remote.emit('response', incoming); incoming.end('{"ok":true}');
    await new Promise(resolve => setImmediate(resolve));
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'set-cookie': cookies }));
    expect(Buffer.concat(chunks).toString()).toBe('{"ok":true}'); req.end();
  });

  it('restores only the exact internal Expo origin using the app AJAX declaration', () => {
    vi.stubEnv('EXPO_WEB_PREVIEW_URL', 'https://preview.example.invalid');
    const outgoing = vi.spyOn(http, 'request').mockImplementation(() => upstream() as any);
    const proxy = createApiProxy(vi.fn());
    const req = request('/api/auth/local-login', { origin: 'http://127.0.0.1:8081', 'x-sayarty-origin': 'https://preview.example.invalid' });
    proxy(req as any, response() as any); req.end();
    expect((outgoing.mock.calls[0][0] as http.RequestOptions).headers).toMatchObject({ origin: 'https://preview.example.invalid' });
    const attack = request('/api/auth/local-login', { origin: 'https://attacker.invalid', 'x-sayarty-origin': 'https://preview.example.invalid' });
    proxy(attack as any, response() as any); attack.end();
    expect((outgoing.mock.calls[1][0] as http.RequestOptions).headers).toMatchObject({ origin: 'https://attacker.invalid' });
    const preflight = request('/api/auth/local-login', { origin: 'http://127.0.0.1:8081', 'access-control-request-method': 'POST', 'x-sayarty-origin': 'https://preview.example.invalid' });
    proxy(preflight as any, response() as any); preflight.end();
    expect((outgoing.mock.calls[2][0] as http.RequestOptions).headers).toMatchObject({ origin: 'https://preview.example.invalid' });
  });

  it('restores a secure declared browser origin when Preview env vars are absent', () => {
    const outgoing = vi.spyOn(http, 'request').mockImplementation(() => upstream() as any);
    const req = request('/api/auth/local-login', { origin: 'http://127.0.0.1:8081', 'x-sayarty-origin': 'https://preview-without-env.example.invalid' });
    createApiProxy(vi.fn())(req as any, response() as any); req.end();
    expect((outgoing.mock.calls[0][0] as http.RequestOptions).headers).toMatchObject({
      origin: 'https://preview-without-env.example.invalid',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'preview-without-env.example.invalid',
    });
  });

  it('returns a safe 502 if the API is unavailable', async () => {
    const remote = upstream(); vi.spyOn(http, 'request').mockReturnValue(remote as any);
    const res = response(); const chunks: Buffer[] = []; res.on('data', chunk => chunks.push(Buffer.from(chunk)));
    const req = request('/api/auth/provider'); createApiProxy(vi.fn())(req as any, res as any);
    remote.emit('error', new Error('private details'));
    await new Promise(resolve => setImmediate(resolve));
    expect(res.writeHead).toHaveBeenCalledWith(502, expect.anything());
    expect(Buffer.concat(chunks).toString()).toContain('API_UNAVAILABLE');
    expect(Buffer.concat(chunks).toString()).not.toContain('private details'); req.end();
  });
});
