import React from 'react';
import { View, ScrollView, Pressable, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { C, T, Icon, row } from './ui';
import { useMarket } from '@/lib/market-context';
import Svg, { Path, Circle } from 'react-native-svg';

export function Brand({ small = false }: { small?: boolean }) {
  return <View style={[row, { gap: 10 }]}>
    <View style={{ backgroundColor: C.green, width: small ? 40 : 46, height: small ? 40 : 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={29} height={29} viewBox="0 0 40 40"><Path d="M7 23h26l-3-8c-.7-2-2-3-4-3H15c-2 0-3.5 1-4 3l-4 8Zm-1 0v8m28-8v8M8 28h24" stroke="#FAF7EF" strokeWidth="2.8" strokeLinecap="round" fill="none" /><Circle cx="29" cy="8" r="2.1" fill={C.gold} /></Svg>
    </View>
    <View><T bold style={{ fontSize: small ? 25 : 29, lineHeight: 32, color: C.green }}>سيّارة.</T><T style={{ fontSize: 10, lineHeight: 14, color: C.muted }}>سوق السيارات، ببساطة</T></View>
  </View>;
}

export function Shell({ children, title, subtitle, titleActions, back = false, scroll = true, showBanner = true }: { children: React.ReactNode; title?: string; subtitle?: string; titleActions?: React.ReactNode; back?: boolean; scroll?: boolean; showBanner?: boolean }) {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const { user } = useMarket();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const nav = [
    { path: '/', text: 'الرئيسية', icon: 'home-outline' },
    { path: '/favorites', text: 'المفضلة', icon: 'heart-outline' },
    { path: '/publish', text: 'أعلن مجاناً', icon: 'add' },
    { path: '/contact', text: 'تواصل معنا', icon: 'chatbubbles-outline' },
  ];
  const activePath = path === '/(tabs)' ? '/' : path;
  const isActive = (itemPath: string) => activePath === itemPath;

  return <View style={styles.background}>
    <View style={[styles.frame, { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 0 : 8) }]}>
      <View style={[styles.header, { paddingHorizontal: wide ? 32 : 18 }]}>
        <Pressable onPress={() => router.push('/')} accessibilityLabel="سيّارة الرئيسية"><Brand small /></Pressable>
        {wide && <View style={[row, styles.desktopNav]}>{nav.filter(item => item.path !== '/publish').map(item => <Pressable key={item.path} accessibilityRole="button" onPress={() => router.push(item.path as any)} style={styles.desktopNavItem}><T bold={isActive(item.path)} style={{ color: isActive(item.path) ? C.green : C.muted, fontSize: 14 }}>{item.text}</T>{isActive(item.path) && <View style={styles.activeMarker} />}</Pressable>)}</View>}
        <View style={[row, { gap: 9 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={user ? 'صفحتي الشخصية' : 'تسجيل الدخول'} onPress={() => router.push(user ? '/account' : '/login')} style={[styles.loginButton, { minHeight: 42 }]}>
            <Icon name={user ? 'person-outline' : 'log-in-outline'} size={17} color={C.green} />
            {wide && <T bold style={{ color: C.green, fontSize: 13 }}>{user ? 'حسابي' : 'تسجيل الدخول'}</T>}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="أعلن مجاناً" onPress={() => router.push('/publish')} style={[styles.headerPost, { minHeight: 42 }]}>
            <Icon name="add" size={19} color={C.white} /><T bold style={{ color: C.white, fontSize: 13 }}>أعلن مجاناً</T>
          </Pressable>
        </View>
      </View>

      {showBanner && <View style={[styles.heroBanner, { height: wide ? 270 : 210, marginHorizontal: wide ? 28 : 14, marginTop: wide ? 20 : 12 }]}>
        <Image source={require('@/assets/cars/toyota.jpg')} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        <View style={styles.heroShade} />
        <View style={[styles.heroContent, { paddingHorizontal: wide ? 38 : 22 }]}>
          <View style={{ maxWidth: wide ? 520 : 330, gap: wide ? 9 : 5 }}>
            <View style={[row, { alignSelf: 'flex-end', gap: 6, backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 30, paddingHorizontal: 11, paddingVertical: 5 }]}><Icon name="shield-checkmark-outline" color="#E9D5AA" size={14} /><T bold style={{ color: '#F0E8D7', fontSize: 12 }}>سوق موثوق لكل سيارة</T></View>
            <T bold style={{ color: C.white, fontSize: wide ? 36 : 26, lineHeight: wide ? 46 : 35, width: '100%' }}>سيارتك القادمة أقرب مما تتوقع</T>
            <T style={{ color: '#E8E9E3', fontSize: wide ? 16 : 13, lineHeight: wide ? 25 : 20, width: '100%' }}>اكتشف خيارات مميزة، أو اعرض سيارتك للبيع مجاناً.</T>
            <View style={[row, { gap: 10, marginTop: 7, alignSelf: 'flex-end' }]}>
              <Pressable onPress={() => router.push('/publish')} style={[row, styles.heroPrimary]}><T bold style={{ color: C.dark, fontSize: 13 }}>أعلن عن سيارتك</T><Icon name="arrow-back" size={16} color={C.dark} /></Pressable>
              <Pressable onPress={() => router.push('/')} style={[row, styles.heroSecondary]}><T bold style={{ color: C.white, fontSize: 13 }}>تصفّح السيارات</T></Pressable>
            </View>
          </View>
        </View>
      </View>}

      {title && <View style={[row, { paddingHorizontal: wide ? 32 : 20, paddingTop: 24, paddingBottom: 14, gap: 12 }]}>
        {back && <Pressable accessibilityLabel="رجوع" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.round}><Icon name="arrow-forward" /></Pressable>}
        <View style={{ flex: 1 }}><T bold style={{ fontSize: 26, lineHeight: 36 }}>{title}</T>{subtitle && <T style={{ color: C.muted, fontSize: 14 }}>{subtitle}</T>}</View>
      </View>}
      {titleActions && <View style={{ paddingHorizontal: wide ? 32 : 20, paddingBottom: 8 }}>{titleActions}</View>}
      {scroll ? <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: wide ? 32 : 16, paddingTop: wide ? 22 : 16, paddingBottom: 30, gap: 22 }}>{children}</ScrollView> : <View style={{ flex: 1 }}>{children}</View>}
      {!wide && <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 6) }]}>{nav.map((item, index) => {
        const active = isActive(item.path);
        return <Pressable key={item.path} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={item.text} onPress={() => router.push(item.path as any)} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
          <View style={index === 2 ? styles.addButton : { height: 27, justifyContent: 'center', alignItems: 'center' }}><Icon name={active && index === 0 ? 'home' : item.icon as any} size={index === 2 ? 22 : 20} color={index === 2 ? C.white : active ? C.green : '#929990'} /></View>
          <T bold={active || index === 2} style={{ fontSize: 10, color: active || index === 2 ? C.green : C.muted, lineHeight: 15 }}>{item.text}</T>
          {active && index !== 2 && <View style={styles.activeMarker} />}
        </Pressable>;
      })}</View>}
    </View>
  </View>;
}

export { AccountLoginGate as LoginGate } from './login-gate';

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#E8E6DF', alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: 1280, backgroundColor: C.bg, overflow: 'hidden', borderLeftWidth: Platform.OS === 'web' ? 1 : 0, borderRightWidth: Platform.OS === 'web' ? 1 : 0, borderColor: '#E0DED6' },
  header: { minHeight: 76, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 14, backgroundColor: C.white, borderBottomWidth: 1, borderColor: C.line },
  desktopNav: { gap: 28, alignSelf: 'stretch' },
  desktopNavItem: { justifyContent: 'center', alignItems: 'center', gap: 7 },
  activeMarker: { height: 3, width: 18, backgroundColor: C.gold, borderRadius: 3 },
  loginButton: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: C.mint, borderWidth: 1, borderColor: '#D8E3D8' },
  headerPost: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 12, backgroundColor: C.green },
  heroBanner: { overflow: 'hidden', borderRadius: 22, backgroundColor: C.dark },
  heroShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(17,28,22,.62)' },
  heroContent: { flex: 1, justifyContent: 'center', alignItems: 'flex-end' },
  heroPrimary: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: '#E4C58D', borderRadius: 11, paddingHorizontal: 14, paddingVertical: 10 },
  heroSecondary: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.46)', borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9 },
  round: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, justifyContent: 'center', alignItems: 'center' },
  nav: { flexDirection: 'row-reverse', backgroundColor: C.white, borderTopWidth: 1, borderColor: C.line, paddingTop: 8, paddingHorizontal: 10, gap: 4 },
  addButton: { height: 34, width: 42, borderRadius: 13, backgroundColor: C.green, justifyContent: 'center', alignItems: 'center' },
});
