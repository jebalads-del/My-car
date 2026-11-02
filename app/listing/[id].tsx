import { useState } from 'react';
import { View, Pressable, ScrollView, Linking, Share, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '@/components/market/shell';
import { C, T, Icon, row, Section, Button, Notice, Empty } from '@/components/market/ui';
import { FeatureRequest } from '@/components/market/feature-request';
import { assetUrl } from '@/components/market/listing-card';
import { useMarket } from '@/lib/market-context';
import { DEMO_LISTINGS, demoImages } from '@/lib/demo-listings';
import { trpc } from '@/lib/trpc';
import { parseEntityId, listingWebsiteUrl } from '@/shared/identity';
import { Listing, currencySymbol } from '@/shared/market';
export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const listingId = parseEntityId(id);
  const query = trpc.market.detail.useQuery({ id: listingId }, { enabled: !!listingId });
  const { user, favorites, toggleFavorite, provider } = useMarket();
  const demo = provider === 'supabase' ? undefined : DEMO_LISTINGS.find(x => x.id === listingId); const ad = (demo || query.data) as Listing | undefined;
  const [image, setImage] = useState(0); const [feature, setFeature] = useState(false); const [message, setMessage] = useState('');
  const share = async () => { if (!ad) return; try { const url = listingWebsiteUrl(ad.id); await Share.share({ message: `${ad.brand} ${ad.model} ${ad.year} — ${Number(ad.price).toLocaleString('en-US')} ${currencySymbol(ad.currency)}${url ? `\n${url}` : ''}`, ...(url ? { url } : {}) }); } catch { setMessage('تعذّرت المشاركة من هذا الجهاز.'); } };
  const contact = async (mode: 'phone' | 'whatsapp') => { if (!ad?.sellerPhone) return; const phone = ad.sellerPhone.replace(/[^0-9+]/g, ''); try { await Linking.openURL(mode === 'phone' ? `tel:${phone}` : `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(`مرحباً، أود الاستفسار عن إعلان ${ad.brand} ${ad.model} على سيّارة.`)}`); } catch { setMessage('تعذّر فتح وسيلة التواصل على هذا الجهاز. حاول مرة أخرى.'); } };
  if (!ad) return <Shell title="تفاصيل الإعلان" back>{query.isLoading ? <ActivityIndicator color={C.green} /> : <Empty title="الإعلان غير متاح" text="قد يكون الإعلان قيد المراجعة أو تم بيعه." />}</Shell>;
  const specs = [{ label: 'سنة الصنع', value: ad.year, icon: 'calendar-outline' }, { label: 'الكيلومترات', value: `${ad.mileage.toLocaleString('en-US')} كم`, icon: 'speedometer-outline' }, { label: 'اللون', value: ad.color, icon: 'color-palette-outline' }, { label: 'ناقل الحركة', value: ad.transmission, icon: 'git-compare-outline' }, { label: 'الوقود', value: ad.fuel, icon: 'water-outline' }, { label: 'الحالة', value: ad.condition, icon: 'car-outline' }].filter(spec => spec.value !== '' && spec.value != null);
  return <Shell title="تفاصيل الإعلان" back>
    <View style={{ borderRadius: 18, overflow: 'hidden', position: 'relative' }}><Image source={ad.demo ? demoImages[Number(ad.id)] : { uri: assetUrl(ad.images[image]) }} style={{ width: '100%', height: 255, backgroundColor: '#E7EAE5' }} contentFit="cover" transition={200} /><View style={{ position: 'absolute', bottom: 13, left: 13, backgroundColor: 'rgba(0,0,0,.55)', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 3 }}><T style={{ color: C.white, fontSize: 12 }}>{image + 1} / {ad.images.length}</T></View>{ad.featured && <View style={[row, { position: 'absolute', right: 12, top: 12, backgroundColor: C.goldLight, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 5, gap: 5 }]}><Icon name="star" color={C.gold} size={14} /><T bold style={{ color: C.gold, fontSize: 13 }}>إعلان مميّز</T></View>}</View>
    {ad.images.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[row, { gap: 10 }]}>{ad.images.map((url, i) => <Pressable key={i} onPress={() => setImage(i)} accessibilityLabel={`عرض الصورة ${i + 1}`} style={{ borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: image === i ? C.green : 'transparent' }}><Image source={{ uri: assetUrl(url) }} style={{ width: 82, height: 65 }} contentFit="cover" /></Pressable>)}</ScrollView>}
    <View style={{ gap: 7 }}><View style={[row, { justifyContent: 'space-between', gap: 10 }]}><T bold style={{ fontSize: 26, flex: 1 }}>{ad.brand} {ad.model}</T><Pressable onPress={() => toggleFavorite(ad.id)} accessibilityLabel="حفظ الإعلان" style={{ padding: 8 }}><Icon name={favorites.includes(String(ad.id)) ? 'heart' : 'heart-outline'} color={favorites.includes(String(ad.id)) ? '#BA675B' : C.green} /></Pressable><Pressable onPress={share} accessibilityLabel="مشاركة الإعلان"><Icon name="share-outline" /></Pressable></View><View style={[row, { gap: 5 }]}><Icon name="location-outline" color={C.muted} size={16} /><T style={{ color: C.muted, fontSize: 14 }}>{ad.location ? `${ad.location} · ` : ''}{ad.year}</T></View><View style={[row, { alignItems: 'baseline', gap: 7, paddingTop: 5 }]}><T bold style={{ fontSize: 34, color: C.green, lineHeight: 43 }}>{Number(ad.price).toLocaleString('en-US')}</T><T style={{ color: C.green }}>{currencySymbol(ad.currency)}</T></View></View>
    {ad.demo && <Notice>هذا إعلان توضيحي وليس عرض بيع فعلياً. لا توجد بيانات بائع أو عملية شراء لهذا النموذج.</Notice>}
    <Section title="مواصفات السيارة"><View style={[row, { flexWrap: 'wrap', gap: 0 }]}>{specs.map(spec => <View key={spec.label} style={[row, { width: '50%', gap: 11, paddingVertical: 14 }]}><View style={{ backgroundColor: C.bg, borderRadius: 10, padding: 9 }}><Icon name={spec.icon as any} size={19} color={C.muted} /></View><View><T style={{ color: C.muted, fontSize: 11, lineHeight: 18 }}>{spec.label}</T><T bold style={{ fontSize: 14 }}>{spec.value}</T></View></View>)}</View></Section>
    <Section title="عن السيارة"><T style={{ color: '#5E6C62', lineHeight: 28 }}>{ad.description || 'لم يضف الناشر وصفاً إضافياً.'}</T><T style={{ fontSize: 12, color: C.muted }}>رقم الإعلان: {ad.demo ? 'توضيحي' : ad.id}</T></Section>
    {!ad.demo && <Section title="تواصل مع البائع"><View style={[row, { gap: 12 }]}><View style={{ backgroundColor: C.mint, padding: 13, borderRadius: 30 }}><Icon name="person-outline" /></View><View style={{ flex: 1 }}><T bold>{ad.sellerName}</T><T style={{ color: C.muted, fontSize: 13 }}>متاح عبر الاتصال أو واتساب</T></View></View>{ad.sellerPhone && <View style={[row, { gap: 10 }]}><View style={{ flex: 1 }}><Button title="اتصال بالبائع" icon="call-outline" onPress={() => contact('phone')} /></View><View style={{ flex: 1 }}><Button title="واتساب" secondary icon="logo-whatsapp" onPress={() => contact('whatsapp')} /></View></View>}</Section>}
    {!!message && <Notice>{message}</Notice>}
    {user?.id === ad.userId && ad.status === 'approved' && !ad.featured && <Button title="تمييز هذا الإعلان" icon="star-outline" secondary onPress={() => setFeature(true)} />}
    <T style={{ textAlign: 'center', color: C.muted, fontSize: 12 }}>افحص السيارة قبل الشراء. لا تدفع عربوناً قبل التحقق من البائع.</T>
    <FeatureRequest visible={feature} onClose={() => setFeature(false)} listingId={ad.id} />
  </Shell>;
}
