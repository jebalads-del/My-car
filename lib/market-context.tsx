import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '@/lib/trpc';
import { DEFAULT_SETTINGS } from '@/shared/market';
import type { EntityId } from '@/shared/identity';
import { startOAuthLogin } from '@/constants/oauth';
import { authRequest, clearSharedSession, confirmSharedSession, refreshSharedSession } from '@/lib/shared-session';

interface ProviderInfo {
  provider: 'supabase' | 'local';
  websiteUrl?: string;
  unsupportedCarFields?: string[];
  extendedSettings?: boolean;
  uploadMaxBytes?: number;
}

const MarketContext = createContext<any>(null);
export function MarketProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const provider = useQuery<ProviderInfo>({
    queryKey: ['auth-provider'], queryFn: () => authRequest('/api/auth/provider'),
    staleTime: Infinity, retry: false,
  });
  const auth = useQuery({
    queryKey: ['shared-auth'],
    queryFn: async () => {
      try { return (await authRequest('/api/auth/me', undefined, true)).user ?? null; }
      catch { return null; }
    },
    retry: false, refetchInterval: 30000,
  });
  const settings = trpc.market.settings.useQuery();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('sayarat-favorites').then(value => {
      if (!value) return;
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) setFavorites(parsed.filter(id => typeof id === 'number' || typeof id === 'string').map(String));
      } catch { /* Ignore malformed local preference data. */ }
    }).finally(() => setReady(true));
  }, []);
  useEffect(() => { if (ready) void AsyncStorage.setItem('sayarat-favorites', JSON.stringify(favorites)); }, [favorites, ready]);
  useEffect(() => {
    if (!auth.data || provider.data?.provider !== 'supabase') return;
    const interval = setInterval(() => { void refreshSharedSession(); }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [auth.data?.id, provider.data?.provider]);

  const toggleFavorite = (id: EntityId) => {
    const key = String(id);
    setFavorites(items => items.includes(key) ? items.filter(item => item !== key) : [...items, key]);
  };
  const login = async () => {
    try { setLoginError(''); await startOAuthLogin(); }
    catch { setLoginError('تعذّر فتح تسجيل الدخول. حاول مرة أخرى.'); }
  };
  const localLogin = async (email: string, password: string) => {
    setLoginError('');
    try {
      await authRequest('/api/auth/local-login', { email: email.trim(), password });
      const user = await confirmSharedSession();
      queryClient.removeQueries({ predicate: query => !['shared-auth', 'auth-provider'].includes(String(query.queryKey[0])) });
      queryClient.setQueryData(['shared-auth'], user);
      await settings.refetch();
      return user;
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'بيانات الدخول غير صحيحة');
      throw error;
    }
  };
  const signOut = async () => {
    // Invalidate the remote session before removing local access/refresh tokens.
    await authRequest('/api/auth/logout', {});
    await clearSharedSession();
    queryClient.clear();
    await auth.refetch();
  };
  return <MarketContext.Provider value={{
    user: auth.data ?? null, authLoading: auth.isLoading,
    settings: settings.data ?? DEFAULT_SETTINGS,
    favorites, toggleFavorite, login, localLogin, loginError,
    refreshAuth: async () => { const user = await confirmSharedSession(); queryClient.setQueryData(['shared-auth'], user); await settings.refetch(); },
    signOut, provider: provider.data?.provider ?? 'supabase',
    providerLoading: provider.isLoading,
    unsupportedCarFields: provider.data?.unsupportedCarFields ?? ['location', 'transmission', 'fuel', 'condition'],
    extendedSettings: provider.data?.extendedSettings ?? false,
    uploadMaxBytes: provider.data?.uploadMaxBytes ?? 5 * 1024 * 1024,
  }}>{children}</MarketContext.Provider>;
}

export const useMarket = () => useContext(MarketContext) as {
  user: any; authLoading: boolean; settings: typeof DEFAULT_SETTINGS;
  favorites: string[]; toggleFavorite: (id: EntityId) => void;
  login: () => Promise<void>; localLogin: (email: string, password: string) => Promise<any>;
  loginError: string; refreshAuth: () => Promise<void>; signOut: () => Promise<void>;
  provider: 'supabase' | 'local'; providerLoading: boolean;
  unsupportedCarFields: string[]; extendedSettings: boolean;
  uploadMaxBytes: number;
};
