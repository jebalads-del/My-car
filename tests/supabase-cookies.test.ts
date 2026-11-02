import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { serialize } from 'cookie';
import { readSupabaseCookie, supabaseCookieNames, supabaseCookieOptions } from '../server/supabase-cookies';

const secure = () => ({ protocol: 'http', hostname: '127.0.0.1', headers: { 'x-forwarded-proto': 'https' } } as unknown as Request);
const local = () => ({ protocol: 'http', hostname: 'localhost', headers: {} } as unknown as Request);
afterEach(() => vi.unstubAllEnvs());

describe('app-owned Supabase cookies', () => {
  it('uses secure host-only HttpOnly partitioned cookies in HTTPS preview', () => {
    const options = supabaseCookieOptions(secure());
    expect(options).toMatchObject({ httpOnly: true, path: '/', sameSite: 'none', secure: true, partitioned: true });
    expect(options).not.toHaveProperty('domain');
    const names = supabaseCookieNames(secure());
    expect(names.access).toMatch(/^__Host-sayarty_session_/);
    expect(names.refresh).toMatch(/^__Host-sayarty_refresh_/);
    for (const name of [names.access, names.refresh]) {
      const encoded = serialize(name, 'mock-value', options as any);
      expect(encoded).toContain('Partitioned'); expect(encoded).toContain('HttpOnly');
      expect(encoded).toContain('Secure'); expect(encoded).not.toContain('Domain=');
    }
  });

  it('keeps local HTTP cookies separate and not partitioned', () => {
    expect(supabaseCookieOptions(local())).toMatchObject({ secure: false, sameSite: 'lax', httpOnly: true });
    expect(supabaseCookieOptions(local()).partitioned).not.toBe(true);
    expect(supabaseCookieNames(local()).access).toMatch(/^sayarty_local_session_/);
  });

  it('does not lose the secure cookie when a proxy reports an internal HTTP scheme', () => {
    const name = supabaseCookieNames(secure()).access;
    const req = local(); req.headers.cookie = `${name}=mock-token`;
    expect(readSupabaseCookie(req, 'session')).toBe('mock-token');
  });

  it('never reads the platform cookie, generic refresh cookie or a transport challenge as authentication', () => {
    const req = secure(); const names = supabaseCookieNames(req);
    req.headers.cookie = `app_session_id=platform-mock; supabase_refresh=old-mock; ${names.probe}=challenge-mock`;
    expect(readSupabaseCookie(req, 'session')).toBeUndefined();
    expect(readSupabaseCookie(req, 'refresh')).toBeUndefined();
    expect(readSupabaseCookie(req, 'transport')).toBe('challenge-mock');
  });
});
