import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C, T, Button } from '@/components/market/ui';
import { useMarket } from '@/lib/market-context';
import { completeGoogleLogin } from '@/lib/shared-session';

export default function GoogleCallback() {
  const { code, error } = useLocalSearchParams<{ code?: string; error?: string }>();
  const router = useRouter();
  const { refreshAuth } = useMarket();
  const started = useRef(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (Platform.OS === 'web') window.history.replaceState(null, '', '/google-callback');
    const complete = async () => {
      try {
        if (error || !code) throw new Error('لم يكتمل تسجيل الدخول عبر Google. حاول مجدداً.');
        await completeGoogleLogin(code);
        await refreshAuth();
        router.replace('/account');
      } catch (failure) {
        setMessage(failure instanceof Error ? failure.message : 'تعذّر تسجيل الدخول عبر Google.');
      }
    };
    void complete();
  }, [code, error, refreshAuth, router]);

  return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16, backgroundColor: C.white }}>
    {message ? <><T style={{ textAlign: 'center', color: C.muted }}>{message}</T><Button title="العودة إلى تسجيل الدخول" onPress={() => router.replace('/login')} /></> : <><ActivityIndicator color={C.green} /><T>جارٍ إكمال تسجيل الدخول...</T></>}
  </View>;
}
