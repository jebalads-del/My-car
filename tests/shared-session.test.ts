import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ platform: 'web', token: '', storage: new Map<string, string>() }));
vi.mock('react-native', () => ({ Platform: { get OS() { return state.platform; } } }));
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => state.storage.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => { state.storage.set(key, value); }),
  deleteItemAsync: vi.fn(async (key: string) => { state.storage.delete(key); }),
}));
vi.mock('../lib/_core/auth', () => ({
  getSessionToken: vi.fn(async () => state.token),
  setSessionToken: vi.fn(async (value: string) => { state.token = value; }),
  removeSessionToken: vi.fn(async () => { state.token = ''; }),
  clearUserInfo: vi.fn(async () => {}),
}));
vi.mock('../constants/oauth', () => ({ getApiBaseUrl: () => 'https://api.example.invalid' }));

import { authRequest, AuthRequestError, confirmSharedSession } from '../lib/shared-session';

const user = { id: '11111111-1111-4111-8111-111111111111', role: 'user' };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => { vi.unstubAllGlobals(); state.platform = 'web'; state.token = ''; state.storage.clear(); });

describe('shared login transport', () => {
  it('sends web credentials without storing JWTs in browser storage', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://preview.example.invalid' } });
    const fetcher = vi.fn(async (_url: string, _init: RequestInit) => response({ user })); vi.stubGlobal('fetch', fetcher);
    const result = await authRequest('/api/auth/local-login', { email: 'owner@example.invalid', password: 'test-only-password' });
    expect(result.user).toEqual(user);
    const init = fetcher.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('include');
    expect(init.headers).toMatchObject({ 'X-Sayarty-Origin': 'https://preview.example.invalid' });
    expect(JSON.parse(init.body as string).platform).toBe('web');
    expect(state.token).toBe(''); expect(state.storage.size).toBe(0);
  });

  it('preserves safe server error codes and status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ error: 'بيانات الدخول غير صحيحة', code: 'INVALID_CREDENTIALS' }, 401)));
    await expect(authRequest('/api/auth/local-login', {})).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
  });

  it('rejects a gateway HTML page instead of treating HTTP 200 as login success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>gateway</html>', { status: 200 })));
    await expect(authRequest('/api/auth/local-login', {})).rejects.toMatchObject({ code: 'AUTH_RESPONSE_INVALID' });
  });

  it('reports network failure in Arabic without exposing the low-level exception', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('private transport details'); }));
    try { await authRequest('/api/auth/local-login', {}); throw new Error('unexpected success'); }
    catch (error) {
      expect(error).toBeInstanceOf(AuthRequestError);
      expect(error).toMatchObject({ code: 'AUTH_NETWORK_ERROR' });
      expect((error as Error).message).not.toContain('private transport details');
    }
  });

  it('does not confirm an unpersisted web session after unsuccessful refresh', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ error: 'Not authenticated' }, 401)));
    await expect(confirmSharedSession()).rejects.toMatchObject({ code: 'SESSION_NOT_PERSISTED' });
  });

  it('requires an actual user in the session response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ user: null })));
    await expect(confirmSharedSession()).rejects.toMatchObject({ code: 'SESSION_NOT_PERSISTED' });
  });

  it('confirms a real server session before returning its user', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ user })));
    await expect(confirmSharedSession()).resolves.toEqual(user);
  });

  it('saves native credentials securely and forwards the access token on confirmation', async () => {
    state.platform = 'android';
    const fetcher = vi.fn(async (url: string, init: RequestInit) => url.endsWith('/local-login')
      ? response({ user, accessToken: 'mock-access', refreshToken: 'mock-refresh', expiresAt: Math.floor(Date.now() / 1000) + 3600 })
      : response({ user }));
    vi.stubGlobal('fetch', fetcher);
    await authRequest('/api/auth/local-login', { email: 'owner@example.invalid', password: 'test-only-password' });
    await expect(confirmSharedSession()).resolves.toEqual(user);
    expect(state.token).toBe('mock-access');
    expect(state.storage.get('sayarty_supabase_refresh')).toBe('mock-refresh');
    expect((fetcher.mock.calls[1][1].headers as Record<string, string>).Authorization).toBe('Bearer mock-access');
  });
});
