import { useMemo, useState } from 'react';
import { View, Pressable, TextInput, ScrollView, ActivityIndicator, useWindowDimensions, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Shell } from '@/components/market/shell';
import { C, T, Icon, row, Chip, Field, Button, Empty, Notice } from '@/components/market/ui';
import { ListingCard } from '@/components/market/listing-card';
import { trpc } from '@/lib/trpc';
import { useMarket } from '@/lib/market-context';
import { DEMO_LISTINGS } from '@/lib/demo-listings';
import { CURRENCIES, Listing, matchesSearch } from '@/shared/market';

export default function Home() {
  const { settings, provider } = useMarket();
  const ads = trpc.market.list.useQuery();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState('');
  const [filters, setFilters] = useState(false);
  const [year, setYear] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [currency, setCurrency] = useState('KWD');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const isDemo = provider !== 'supabase' && !ads.isLoading && !ads.error && ads.data?.length === 0;
  const all: Listing[] = (isDemo ? DEMO_LISTINGS : ads.data ?? []) as Listing[];
  const results = useMemo(() => all.filter(x => matchesSearch(x, query) && (!brand || x.brand === brand) && (!year || x.year >= Number(year)) && (!maxPrice || (x.currency === currency && Number(x.price) <= Number(maxPrice))) && (!featuredOnly || x.featured)).sort((a, b) => Number(b.featured) - Number(a.featured)), [all, query, brand, year, maxPrice, currency, featuredOnly]);
  const featured = results.filter(x => x.featured);
  const regular = results.filter(x => !x.featured);
  const cardWidth = wide ? '48.8%' : '100%';
  const renderListings = (listings: Listing[]) => <View style={styles.grid}>{listings.map(listing => <View key={listing.id} style={{ width: cardWidth }}><ListingCard listing={listing} /></View>)}</View>;

  return <Shell showBanner={false}>
    <View style={{ gap: 20 }}>
      <View style={styles.hero}>
        <View style={styles.heroBadge}><Icon name="car-sport-outline" size={15} color={C.green} /><T bold style={{ color: C.green, fontSize: 12 }}>سيارتي · سوق السيارات</T></View>
        <T bold style={styles.heroTitle}>سيارتك القادمة أقرب مما تتوقع</T>
        <T style={styles.heroText}>ابحث عن السيارة المناسبة، أو اعرض سيارتك للبيع مجاناً.</T>
        <View style={[row, { gap: 9, marginTop: 8 }]}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/publish')} style={[row, styles.heroPrimary]}><Icon name="add" size={17} color={C.white} /><T bold style={{ color: C.white, fontSize: 14 }}>أعلن عن سيارتك</T></Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/login')} style={[row, styles.heroSecondary]}><Icon name="log-in-outline" size={16} color={C.green} /><T bold style={{ color: C.green, fontSize: 14 }}>دخول</T></Pressable>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <View style={[row, { justifyContent: 'space-between', gap: 10 }]}>
          <View style={{ flex: 1, gap: 2 }}><T bold style={{ fontSize: 21 }}>ابحث عن سيارتك</T><T style={{ color: C.muted, fontSize: 13 }}>اختر من أحدث الإعلانات في الكويت</T></View>
          <View style={[row, styles.trustPill]}><Icon name="shield-checkmark-outline" size={15} color={C.green} /><T bold style={{ color: C.green, fontSize: 11 }}>إعلانات موثوقة</T></View>
        </View>
        <View style={[row, { gap: 9 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="فلاتر البحث" onPress={() => setFilters(value => !value)} style={[styles.filterButton, filters && styles.filterButtonActive]}><Icon name="options-outline" color={filters ? C.white : C.green} size={21} /></Pressable>
          <View style={[row, styles.searchBox]}>
            <Icon name="search-outline" size={20} color={C.muted} />
            <TextInput accessibilityLabel="البحث عن سيارة" placeholder="ابحث عن ماركة، موديل أو سنة..." placeholderTextColor="#9199AA" value={query} onChangeText={setQuery} style={styles.searchInput} />
            {query !== '' && <Pressable accessibilityLabel="مسح البحث" onPress={() => setQuery('')}><Icon name="close-circle" color={C.muted} size={18} /></Pressable>}
          </View>
        </View>
        {filters && <View style={styles.filterPanel}>
          <View style={[row, { gap: 12 }]}><Field label="من سنة" keyboardType="numeric" value={year} onChangeText={setYear} placeholder="مثال: 2020" /><Field label="أقصى سعر" keyboardType="numeric" value={maxPrice} onChangeText={setMaxPrice} placeholder="بدون حد" /></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[row, { gap: 7 }]}>{CURRENCIES.map(item => <Chip key={item.code} text={item.label} selected={currency === item.code} onPress={() => setCurrency(item.code)} />)}</ScrollView>
          <Pressable onPress={() => setFeaturedOnly(value => !value)} style={[row, { gap: 8, alignSelf: 'flex-end' }]}><Icon name={featuredOnly ? 'checkbox' : 'square-outline'} color={featuredOnly ? C.green : C.muted} /><T style={{ fontSize: 14 }}>الإعلانات المميزة فقط</T></Pressable>
          <Button title="مسح الفلاتر" secondary small onPress={() => { setYear(''); setMaxPrice(''); setBrand(''); setFeaturedOnly(false); setCurrency('KWD'); }} />
        </View>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[row, { gap: 8, paddingVertical: 2 }]}><Chip text="الكل" selected={!brand} onPress={() => setBrand('')} />{Object.keys(settings.brands).map(item => <Chip key={item} text={item} selected={brand === item} onPress={() => setBrand(brand === item ? '' : item)} />)}</ScrollView>
      </View>

      {ads.isLoading && <ActivityIndicator color={C.green} style={{ padding: 30 }} />}
      {ads.error && <Notice>تعذّر تحميل الإعلانات. <T onPress={() => ads.refetch()} bold style={{ color: C.green }}>إعادة المحاولة</T></Notice>}
      {featured.length > 0 && <View style={{ gap: 14 }}>
        <View style={[row, styles.sectionHeader]}><View style={[row, { gap: 8 }]}><View style={styles.sectionIcon}><Icon name="sparkles-outline" color={C.gold} size={18} /></View><View><T bold style={{ fontSize: 19, lineHeight: 25 }}>اختيارات مميزة</T><T style={{ color: C.muted, fontSize: 12 }}>سيارات تستحق نظرة أقرب</T></View></View><T style={styles.resultCount}>{featured.length} إعلانات</T></View>
        {renderListings(featured)}
      </View>}
      {regular.length > 0 && <View style={{ gap: 14 }}>
        <View style={[row, styles.sectionHeader]}><View><T bold style={{ fontSize: 19, lineHeight: 25 }}>أحدث الإعلانات</T><T style={{ color: C.muted, fontSize: 12 }}>اكتشف أحدث السيارات المعروضة</T></View><T style={styles.resultCount}>{regular.length} إعلانات</T></View>
        {renderListings(regular)}
      </View>}
      {!ads.isLoading && !ads.error && results.length === 0 && <Empty title="لا توجد نتائج" text="جرّب اسم ماركة آخر أو وسّع فلاتر البحث." />}
      {isDemo && <T style={{ textAlign: 'center', color: C.muted, fontSize: 12 }}>الإعلانات المعروضة نماذج توضيحية وليست عروض بيع فعلية.</T>}
      <View style={[row, styles.footerNote]}><Icon name="shield-checkmark-outline" color={C.muted} size={15} /><T style={{ color: C.muted, fontSize: 12 }}>إعلانات تُراجع. تواصل مباشر. نشر مجاني.</T></View>
    </View>
  </Shell>;
}

const styles = StyleSheet.create({
  hero: { backgroundColor: '#E2EBFF', borderRadius: 22, padding: 20, gap: 8, alignItems: 'flex-end', overflow: 'hidden' },
  heroBadge: { ...row, gap: 6, backgroundColor: 'rgba(255,255,255,.7)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  heroTitle: { fontSize: 23, lineHeight: 31, color: C.dark, textAlign: 'right' },
  heroText: { color: '#43516E', fontSize: 14, lineHeight: 21, textAlign: 'right' },
  heroPrimary: { ...row, gap: 5, backgroundColor: C.green, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 10 },
  heroSecondary: { ...row, gap: 5, backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: '#CFD9EF', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 10 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'stretch', gap: 15 },
  trustPill: { gap: 5, backgroundColor: C.mint, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 20 },
  searchBox: { flex: 1, backgroundColor: C.white, borderRadius: 15, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, height: 54, gap: 9 },
  searchInput: { flex: 1, fontFamily: 'Tajawal', fontSize: 14, textAlign: 'right', color: C.text, height: '100%' },
  filterButton: { width: 54, height: 54, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  filterButtonActive: { backgroundColor: C.green, borderColor: C.green },
  filterPanel: { backgroundColor: C.white, padding: 15, borderRadius: 17, gap: 14, borderWidth: 1, borderColor: C.line },
  sectionHeader: { justifyContent: 'space-between', gap: 10 },
  sectionIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: C.goldLight, alignItems: 'center', justifyContent: 'center' },
  resultCount: { color: C.muted, fontSize: 11, backgroundColor: C.white, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, overflow: 'hidden' },
  footerNote: { justifyContent: 'center', gap: 7, paddingBottom: 4 },
});
