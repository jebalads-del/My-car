import { API_BASE_URL } from '../../constants/oauth';
import * as ReactNative from 'react-native';

export function getApiUrl(): string {
  if (ReactNative.Platform.OS === 'web') {
    return '';
  }
  return 'https://sayarty.store';
}

export function apiUrl(path: string): string {
  const base = getApiUrl();
  if (!path.startsWith('/')) {
    return `${base}/${path}`;
  }
  return `${base}${path}`;
}
