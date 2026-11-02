import { useState } from 'react';
import { View, Pressable, ScrollView, Linking, Share, useWindowDimensions, ActivityIndicator } from 'react-native';
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = parseEntityId(id);
  const query = trpc.market.detail.useQuery({ id: listingId }, { enabled: !!listingId });
  const { user, favorites, toggleFavorite, provider } = useMarket();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const demo = provider === 'supabase' ? undefined : DEMO_LISTINGS.find(x => x.id === listingId);
  const ad = (demo || query.data) as Listing | undefined;
  const [image, setImage] = useState(0);
  const [feature, setFeature] = useState(false);
  const [message, setMessage] = useState('');
  const isFavorite = ad ? favorites.includes(String(ad.id)) : false;

  const share = async () => {
    if (!ad) return;
    try {
      const url = listingWebsiteUrl(ad.id);
      await Share.share({ message: `${ad.brand} ${ad.model} ${ad.year} — ${Number(ad.price).toLocaleString('en-US')} ${currencySymbol(ad.currency)}${url ? `\n${url}` : ''}`, ...(url ? { url } : {}) });
    } catch { setMessage('تعذّرت المشاركة من هذا الجهاز.'); }
  };
  const contact = async (mode: 'phone' | 'whatsapp') => {
    if (!ad?.sellerPhone) return;
    const phone = ad.sellerPhone.replace(/[^0-9+]/g, '');
    try { await Linking.openURL(mode === 'phone' ? `tel:${phone}` : `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(`مرحباً، أود الاستفسار عن إعلان ${ad.brand} ${ad.model} على سيّارة.`)}`); }
    catch { setMessage('تعذّر فتح وسيلة التواصل على هذا الجهاز. حاول مرة أخرى.'); }
  };

  if (!ad) return <Shell title="تفاصيل الإعلان" back showBanner={false}>{query.isLoading ? <ActivityIndicator color={C.green} /> : <View style={styles.emptyCard}><Empty title="الإعلان غير متاح" text="قد يكون الإعلان قيد المراجعة أو تم بيعه." /></View>}</Shell>;

  const specs = [
    { label: 'سنة الصنع', value: ad.year, icon: 'calendar-outline' },
    { label: 'الكيلومترات', value: `${ad.mileage.toLocaleString('en-US')} كم`, icon: 'speedometer-outline' },
    { label: 'اللون', value: ad.color, icon: 'color-palette-outline' },
    { label: 'ناقل الحركة', value: ad.transmission, icon: 'git-compare-outline' },
    { label: 'الوقود', value: ad.fuel, icon: 'water-outline' },
    { label: 'الحالة', value: ad.condition, icon: 'car-outline' },
  ].filter(spec => spec.value !== '' && spec.value != null);

  return <Shell title="تفاصيل الإعلان" back showBanner={false}>
    <View style={[row, { alignItems: 'stretch', gap: 18, flexWrap: wide ? 'nowrap' : 'wrap' }]}>
      <View style={{ width: wide ? '57%' : '100%', gap: 10 }}>
        <View style={styles.imageFrame}>
          <Image source={ad.demo ? demoImages[Number(ad.id)] : { uri: assetUrl(ad.images[image]) }} style={{ width: '100%', height: wide ? 385 : 260, backgroundColor: '#E7E8E2' }} contentFit="cover" transition={200} />
          <View style={styles.imageCounter}><T style={{ color: C.white, fontSize: 12 }}>{image + 1} / {ad.images.length}</T></View>
          {ad.featured && <View style={styles.featuredBadge}><Icon name="star" color={C.gold} size={14} /><T bold style={{ color: C.gold, fontSize: 13 }}>إعلان مميّز</T></View>}
        </View>
        {ad.images.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[row, { gap: 9 }]}>{ad.images.map((url, index) => <Pressable key={index} onPress={() => setImage(index)} accessibilityLabel={`عرض الصورة ${index + 1}`} style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: image === index ? C.green : 'transparent' }}><Image source={{ uri: assetUrl(url) }} style={{ width: 82, height: 64 }} contentFit="cover" /></Pressable>)}</ScrollView>}
      </View>

      <View style={[styles.summaryCard, { flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }]}>
        <View style={[row, { justifyContent: 'space-between', gap: 12 }]}>
          <View style={{ flex: 1, gap: 5 }}><T style={{ color: C.muted, fontSize: 13 }}>{ad.year} · {ad.location || 'الكويت'}</T><T bold style={{ fontSize: 26, lineHeight: 34 }}>{ad.brand} {ad.model}</T></View>
          <View style={[row, { gap: 8 }]}>
            <Pressable onPress={() => toggleFavorite(ad.id)} accessibilityLabel={isFavorite ? 'إزالة من المفضلة' : 'حفظ الإعلان'} style={styles.iconAction}><Icon name={isFavorite ? 'heart' : 'heart-outline'} color={isFavorite ? '#BA675B' : C.green} /></Pressable>
            <Pressable onPress={share} accessibilityLabel="مشاركة الإعلان" style={styles.iconAction}><Icon name="share-outline" /></Pressable>
          </View>
        </View>
        <View style={[row, styles.priceRow]}><T bold style={{ fontSize: 34, color: C.green, lineHeight: 44 }}>{Number(ad.price).toLocaleString('en-US')}</T><T bold style={{ color: C.green, fontSize: 15 }}>{currencySymbol(ad.currency)}</T></View>
        <View style={styles.summaryDivider} />
        <View style={[row, styles.quickSpecs]}>
          <QuickSpec icon="speedometer-outline" label="المسافة" value={`${Number(ad.mileage).toLocaleString('en-US')} كم`} />
          <QuickSpec icon="git-compare-outline" label="ناقل الحركة" value={ad.transmission || '—'} />
        </View>
        {ad.demo && <Notice>هذا إعلان توضيحي وليس عرض بيع فعلياً. لا توجد بيانات بائع أو عملية شراء لهذا النموذج.</Notice>}
        {!ad.demo && <View style={{ gap: 10 }}>
          <View style={[row, { gap: 11 }]}><View style={styles.sellerIcon}><Icon name="person-outline" color={C.green} /></View><View style={{ flex: 1 }}><T bold>{ad.sellerName}</T><T style={{ color: C.muted, fontSize: 13 }}>تواصل مباشرة مع البائع</T></View></View>
          {ad.sellerPhone && <View style={[row, { gap: 9 }]}><View style={{ flex: 1 }}><Button title="اتصال بالبائع" icon="call-outline" onPress={() => contact('phone')} /></View><View style={{ flex: 1 }}><Button title="واتساب" secondary icon="logo-whatsapp" onPress={() => contact('whatsapp')} /></View></View>}
        </View>}
        {!!message && <Notice>{message}</Notice>}
        {user?.id === ad.userId && ad.status === 'approved' && !ad.featured && <Button title="تمييز هذا الإعلان" icon="star-outline" secondary onPress={() => setFeature(true)} />}
      </View>
    </View>

    <Section title="مواصفات السيارة" caption="التفاصيل التي تساعدك على اتخاذ قرارك">
      <View style={[row, { flexWrap: 'wrap', gap: 5 }]}>{specs.map(spec => <View key={spec.label} style={[row, styles.specItem]}><View style={styles.specIcon}><Icon name={spec.icon as any} size={18} color={C.green} /></View><View><T style={{ color: C.muted, fontSize: 11, lineHeight: 17 }}>{spec.label}</T><T bold style={{ fontSize: 14 }}>{spec.value}</T></View></View>)}</View>
    </Section>
    <Section title="عن السيارة"><T style={{ color: C.muted, lineHeight: 28 }}>{ad.description || 'لم يضف الناشر وصفاً إضافياً.'}</T><T style={{ fontSize: 12, color: C.muted }}>رقم الإعلان: {ad.demo ? 'توضيحي' : ad.id}</T></Section>
    <View style={[row, styles.safetyNote]}><Icon name="shield-checkmark-outline" color={C.green} size={20} /><T style={{ flex: 1, color: C.green, fontSize: 13 }}>افحص السيارة قبل الشراء، ولا تدفع عربوناً قبل التحقق من البائع.</T></View>
    <FeatureRequest visible={feature} onClose={() => setFeature(false)} listingId={ad.id} />
  </Shell>;
}

function QuickSpec({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <View style={[row, { flex: 1, gap: 8 }]}><Icon name={icon as any} color={C.muted} size={18} /><View><T style={{ color: C.muted, fontSize: 11 }}>{label}</T><T bold style={{ fontSize: 13 }}>{value}</T></View></View>;
}

const styles = {
  emptyCard: { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 12 },
  imageFrame: { borderRadius: 20, overflow: 'hidden' as const, position: 'relative' as const, backgroundColor: C.line },
  imageCounter: { position: 'absolute' as const, bottom: 13, left: 13, backgroundColor: 'rgba(24,40,32,.75)', borderRadius: 8, paddingHorizontal: 11, paddingVertical: 5 },
  featuredBadge: { position: 'absolute' as const, right: 13, top: 13, flexDirection: 'row-reverse' as const, alignItems: 'center' as const, backgroundColor: C.goldLight, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 6, gap: 5 },
  summaryCard: { gap: 17, padding: 21, backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.line },
  iconAction: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg, alignItems: 'center' as const, justifyContent: 'center' as const },
  priceRow: { alignItems: 'baseline' as const, gap: 7, backgroundColor: C.mint, borderRadius: 15, paddingHorizontal: 15, paddingVertical: 9, alignSelf: 'flex-start' as const },
  summaryDivider: { height: 1, backgroundColor: C.line },
  quickSpecs: { gap: 13 },
  sellerIcon: { backgroundColor: C.mint, width: 42, height: 42, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const },
  specItem: { width: '48%' as const, gap: 10, paddingVertical: 10 },
  specIcon: { backgroundColor: C.mint, borderRadius: 11, padding: 9 },
  safetyNote: { backgroundColor: C.mint, borderRadius: 15, padding: 15, gap: 10 },
};
