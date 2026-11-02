import '@/global.css';
import '@/lib/_core/nativewind-pressable';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaInsetsContext, SafeAreaFrameContext, initialWindowMetrics } from 'react-native-safe-area-context';
import { useFonts, Tajawal_400Regular, Tajawal_700Bold } from '@expo-google-fonts/tajawal';
import { trpc, createTRPCClient } from '@/lib/trpc';
import { initManusRuntime, subscribeSafeAreaInsets } from '@/lib/_core/manus-runtime';
import { ThemeProvider } from '@/lib/theme-provider';
import { MarketProvider } from '@/lib/market-context';
export const unstable_settings = { anchor: '(tabs)' };
export default function RootLayout() {
  useFonts({ Tajawal: Tajawal_400Regular, 'Tajawal-Bold': Tajawal_700Bold });
  const [insets, setInsets] = useState(initialWindowMetrics?.insets ?? { top: 0, bottom: 0, left: 0, right: 0 });
  const [frame, setFrame] = useState(initialWindowMetrics?.frame ?? { x: 0, y: 0, width: 0, height: 0 });
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } }));
  const [rpc] = useState(() => createTRPCClient());
  useEffect(() => { initManusRuntime(); }, []);
  useEffect(() => { if (Platform.OS === 'web') return subscribeSafeAreaInsets(metrics => { setInsets(metrics.insets); setFrame(metrics.frame); }); }, []);
  const content = <GestureHandlerRootView style={{ flex: 1 }}><trpc.Provider client={rpc} queryClient={client}><QueryClientProvider client={client}><MarketProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F7F8F7' }, animation: 'slide_from_left' }} /><StatusBar style="dark" /></MarketProvider></QueryClientProvider></trpc.Provider></GestureHandlerRootView>;
  return <ThemeProvider><SafeAreaProvider initialMetrics={initialWindowMetrics}>{Platform.OS === 'web' ? <SafeAreaFrameContext.Provider value={frame}><SafeAreaInsetsContext.Provider value={insets}>{content}</SafeAreaInsetsContext.Provider></SafeAreaFrameContext.Provider> : content}</SafeAreaProvider></ThemeProvider>;
}
