import { parse as parseCookie } from 'cookie';
import type { CookieOptions, Request } from 'express';
import { SESSION_COOKIE_SUFFIX } from '../shared/const';
import { getSessionCookieOptions } from './_core/cookies';

export function supabaseCookieOptions(req: Request): CookieOptions {
  const options = getSessionCookieOptions(req);
  return { ...options, ...(options.secure ? { partitioned: true } : {}) };
}

export function supabaseCookieNames(req: Request) {
  const prefix = getSessionCookieOptions(req).secure ? '__Host-sayarty' : 'sayarty_local';
  return {
    access: `${prefix}_session_${SESSION_COOKIE_SUFFIX}`,
    refresh: `${prefix}_refresh_${SESSION_COOKIE_SUFFIX}`,
    probe: `${prefix}_transport_${SESSION_COOKIE_SUFFIX}`,
  };
}

/** Reading does not depend on an internal proxy's scheme; the JWT is still validated live. */
export function readSupabaseCookie(req: Request, kind: 'session' | 'refresh' | 'transport'): string | undefined {
  const cookies = parseCookie(req.headers.cookie || '');
  return cookies[`__Host-sayarty_${kind}_${SESSION_COOKIE_SUFFIX}`]
    || cookies[`sayarty_local_${kind}_${SESSION_COOKIE_SUFFIX}`];
}
