import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Shell, LoginGate } from '@/components/market/shell';
import { C } from '@/components/market/ui';
import { useMarket } from '@/lib/market-context';
import { SessionActions } from '@/components/market/session-actions';

export default function LoginScreen() {
  const { user, authLoading } = useMarket();
  useEffect(() => {
    if (!authLoading && user) router.replace('/account');
  }, [authLoading, user?.id]);

  return <Shell back showBanner={false} titleActions={<SessionActions home />}>
    {authLoading || user ? <ActivityIndicator color={C.green} /> : <LoginGate compact />}
  </Shell>;
}
