import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import * as ReactNative from 'react-native';
const bundleId = 'space.manus.sayarat.t216154127124529';
const timestamp = bundleId.split('.').pop()?.replace(/^t/, '') ?? '';
const schemeFromBundleId = `manus${timestamp}`;
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
const env = {
  portal: extra.oauthPortalUrl ?? process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? '',
  server: extra.oauthServerUrl ?? process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? '',
  appId: extra.appId ?? process.env.EXPO_PUBLIC_APP_ID ?? '',
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? '',
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? '',
  apiBaseUrl: extra.websiteApiBaseUrl || process.env.EXPO_PUBLIC_WEBSITE_API_URL || extra.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || '',
  deepLinkScheme: schemeFromBundleId,
};
export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;
export function getApiBaseUrl(): string {
  // Metro forwards /api/* on Web. Same-origin requests do not need third-party API cookies.
  if (ReactNative.Platform.OS === 'web') return '';
  if (API_BASE_URL) return API_BASE_URL.replace(/\/$/, '');
  return '';
}
export const SESSION_TOKEN_KEY = 'app_session_token';
export const USER_INFO_KEY = 'manus-runtime-user-info';
export const getRedirectUri = () => ReactNative.Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}/api/oauth/callback` : Linking.createURL('/oauth/callback', { scheme: env.deepLinkScheme });
export async function startOAuthLogin(): Promise<string | null> {
  if (!OAUTH_PORTAL_URL || !APP_ID) throw new Error('Manus login configuration is unavailable');
  const redirectUri = getRedirectUri();
  const frontendOrigin = ReactNative.Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'native';
  const response = await fetch(`${getApiBaseUrl()}/api/oauth/prepare`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ redirectUri, frontendOrigin }) });
  if (!response.ok) throw new Error('تعذّر تجهيز تسجيل الدخول الآمن');
  const result = (await response.json()) as { url?: string };
  if (!result.url) throw new Error('رابط تسجيل الدخول غير متاح');
  if (ReactNative.Platform.OS === 'web') { window.location.href = result.url; return null; }
  const supported = await Linking.canOpenURL(result.url);
  if (!supported) throw new Error('لا يمكن فتح بوابة تسجيل الدخول على هذا الجهاز');
  await Linking.openURL(result.url);
  return null;
}
