import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useMarket } from '@/lib/market-context';
import { Button, ErrorText, row } from './ui';

export function SessionActions({ home = false, personal = false, logout = false, disabled = false }: {
  home?: boolean;
  personal?: boolean;
  logout?: boolean;
  disabled?: boolean;
}) {
  const { user, signOut } = useMarket();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const leaveSession = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await signOut();
      router.replace('/');
    } catch {
      setError('تعذّر تسجيل الخروج. حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  return <View style={{ gap: 6, width: '100%' }}>
    <View style={[row, { flexWrap: 'wrap', gap: 7 }]}>
      {home && <Button title="الرئيسية" small secondary icon="home-outline" disabled={disabled || busy} onPress={() => router.replace('/')} />}
      {personal && <Button title={user ? 'صفحتي الشخصية' : 'تسجيل الدخول'} small secondary icon={user ? 'person-outline' : 'log-in-outline'} disabled={disabled || busy} onPress={() => router.push(user ? '/account' : '/login')} />}
      {logout && !!user && <Button title="تسجيل الخروج" small danger icon="log-out-outline" disabled={disabled} loading={busy} onPress={leaveSession} />}
    </View>
    <ErrorText text={error} />
  </View>;
}
