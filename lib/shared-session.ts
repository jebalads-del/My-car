import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Auth from './_core/auth';
import { getApiBaseUrl } from '../constants/oauth';

const REFRESH_KEY = 'sayarty_supabase_refresh';
const EXPIRY_KEY = 'sayarty_supabase_expiry';
let refreshInFlight: Promise<boolean> | null = null;

function browserOriginHeaders(): Record<string, string> {
  return Platform.OS === 'web' && typeof window !== 'undefined'
    ? { 'X-Sayarty-Origin': window.location.origin } : {};
}

export interface SessionResult {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export class AuthRequestError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) {
    super(message);
    this.name = 'AuthRequestError';
  }
}

export async function saveSharedSession(result: SessionResult): Promise<void> {
  // Web sessions remain in HttpOnly cookies; never put JWT/refresh tokens in localStorage.
  if (Platform.OS === 'web' || !result.accessToken) return;
  await Auth.setSessionToken(result.accessToken);
  if (result.refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, result.refreshToken);
  if (result.expiresAt) {
    const milliseconds = result.expiresAt < 1e12 ? result.expiresAt * 1000 : result.expiresAt;
    await SecureStore.setItemAsync(EXPIRY_KEY, String(milliseconds));
  }
}

export async function clearSharedSession(): Promise<void> {
  await Auth.removeSessionToken();
  await Auth.clearUserInfo();
  if (Platform.OS !== 'web') {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await SecureStore.deleteItemAsync(EXPIRY_KEY);
  }
}

export async function refreshSharedSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const native = Platform.OS !== 'web';
    const refreshToken = native ? await SecureStore.getItemAsync(REFRESH_KEY) : undefined;
    if (native && !refreshToken) return false;
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/session/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...browserOriginHeaders() },
        body: JSON.stringify(native ? { platform: 'native', refreshToken } : { platform: 'web' }),
      });
      if (!response.ok) {
        if (native && (response.status === 400 || response.status === 401)) await clearSharedSession();
        return false;
      }
      await saveSharedSession(await response.json());
      return true;
    } catch {
      // A temporary network error does not erase the existing refresh token.
      return false;
    }
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

export async function sharedAuthHeaders(): Promise<Record<string, string>> {
  if (Platform.OS === 'web') return browserOriginHeaders();
  const expiresAt = Number(await SecureStore.getItemAsync(EXPIRY_KEY));
  if (expiresAt && expiresAt < Date.now() + 60000) await refreshSharedSession();
  const token = await Auth.getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function authRequest(path: string, body?: Record<string, unknown>, retrySession = false): Promise<any> {
  const perform = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      return await fetch(`${getApiBaseUrl()}${path}`, {
        method: body ? 'POST' : 'GET',
        credentials: 'include',
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...await sharedAuthHeaders() },
        ...(body ? { body: JSON.stringify({ ...body, platform: Platform.OS === 'web' ? 'web' : 'native' }) } : {}),
        signal: controller.signal,
      });
    } catch {
      throw new AuthRequestError('تعذّر الاتصال بخادم الحسابات. تحقق من اتصال الإنترنت ثم حاول مجدداً.', 0, 'AUTH_NETWORK_ERROR');
    } finally {
      clearTimeout(timeout);
    }
  };
  let response = await perform();
  if (retrySession && response.status === 401 && await refreshSharedSession()) response = await perform();
  const result = await response.json().catch(() => null);
  if (!result || typeof result !== 'object') throw new AuthRequestError('لم يصل رد صالح من خادم الحسابات. افتح المعاينة الحالية ثم حاول مجدداً.', response.status, 'AUTH_RESPONSE_INVALID');
  if (!response.ok) throw new AuthRequestError(result.error || result.message || 'تعذّر الاتصال بالخادم', response.status, result.code || 'AUTH_REQUEST_FAILED');
  await saveSharedSession(result);
  return result;
}

/** Confirm live authentication before the UI treats login/verification as successful. */
export async function confirmSharedSession(): Promise<any> {
  try {
    const result = await authRequest('/api/auth/me', undefined, true);
    if (!result.user) throw new AuthRequestError('لم تُثبت جلسة الحساب. أعد تسجيل الدخول.', 401, 'SESSION_NOT_PERSISTED');
    return result.user;
  } catch (error) {
    if (error instanceof AuthRequestError && error.status === 401) {
      throw new AuthRequestError('قُبلت بيانات الدخول، لكن لم تُحفظ الجلسة. اسمح بملفات الارتباط أو افتح المعاينة في نافذة مستقلة ثم أعد الدخول.', 401, 'SESSION_NOT_PERSISTED');
    }
    throw error;
  }
}
