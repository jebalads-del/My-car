import { useMemo, useState } from 'react';
import { View, Pressable, TextInput, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Shell } from '@/components/market/shell';
import { C, T, Icon, row, Chip, Select, Field, Button, Empty, Notice } from '@/components/market/ui';
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

  return <Shell>
    <View style={{ gap: 17 }}>
      <View style={[row, { justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }]}>
        <View style={{ gap: 3, flex: 1 }}><T bold style={{ fontSize: wide ? 25 : 21, lineHeight: 31 }}>ابحث عن سيارتك</T><T style={{ color: C.muted, fontSize: 13 }}>خيارات مختارة تناسب طريقك القادم</T></View>
        <View style={[row, styles.trustPill]}><Icon name="shield-checkmark-outline" size={16} color={C.green} /><T bold style={{ color: C.green, fontSize: 12 }}>إعلانات موثوقة</T></View>
      </View>
      <View style={[row, { gap: 10 }]}>
        <View style={[row, styles.searchBox]}>
          <Icon name="search-outline" size={21} color={C.muted} />
          <TextInput accessibilityLabel="البحث عن سيارة" placeholder="ابحث عن ماركة، موديل أو سنة..." placeholderTextColor="#91968E" value={query} onChangeText={setQuery} style={styles.searchInput} />
          {query !== '' && <Pressable onPress={() => setQuery('')} accessibilityLabel="مسح البحث"><Icon name="close-circle" color={C.muted} size={18} /></Pressable>}
        </View>
        <Pressable accessibilityLabel="فلاتر البحث" accessibilityRole="button" onPress={() => setFilters(v => !v)} style={[styles.filterButton, filters && styles.filterButtonActive]}><Icon name="options-outline" color={filters ? C.white : C.green} size={21} /></Pressable>
      </View>
      {filters && <View style={styles.filterPanel}>
        <View style={[row, { gap: 12 }]}><Field label="من سنة" keyboardType="numeric" value={year} onChangeText={setYear} placeholder="مثال: 2020" /><Field label="أقصى سعر" keyboardType="numeric" value={maxPrice} onChangeText={setMaxPrice} placeholder="بدون حد" /></View>
        <Select label="عملة فلتر السعر" value={currency} options={CURRENCIES.map(x => ({ label: x.label, value: x.code }))} onChange={setCurrency} />
        <Pressable onPress={() => setFeaturedOnly(v => !v)} style={[row, { gap: 8, alignSelf: 'flex-end' }]}><Icon name={featuredOnly ? 'checkbox' : 'square-outline'} color={featuredOnly ? C.green : C.muted} /><T style={{ fontSize: 14 }}>الإعلانات المميزة فقط</T></Pressable>
        <Button title="مسح الفلاتر" secondary small onPress={() => { setYear(''); setMaxPrice(''); setBrand(''); setFeaturedOnly(false); setCurrency('KWD'); }} />
      </View>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[row, { gap: 8, paddingVertical: 1 }]}><Chip text="الكل" selected={!brand} onPress={() => setBrand('')} />{Object.keys(settings.brands).map(b => <Chip key={b} text={b} selected={brand === b} onPress={() => setBrand(brand === b ? '' : b)} />)}</ScrollView>
    </View>

    {ads.isLoading && <ActivityIndicator color={C.green} style={{ padding: 30 }} />}
    {ads.error && <Notice>تعذّر تحميل الإعلانات. <T onPress={() => ads.refetch()} bold style={{ color: C.green }}>إعادة المحاولة</T></Notice>}
    {featured.length > 0 && <View style={{ gap: 15 }}>
      <View style={[row, styles.sectionHeader]}><View style={[row, { gap: 8 }]}><View style={styles.sectionIcon}><Icon name="sparkles-outline" color={C.gold} size={18} /></View><View><T bold style={{ fontSize: 20, lineHeight: 25 }}>اختيارات مميّزة</T><T style={{ color: C.muted, fontSize: 12 }}>سيارات تستحق نظرة أقرب</T></View></View><T style={styles.resultCount}>{featured.length} إعلانات</T></View>
      {renderListings(featured)}
    </View>}
    {regular.length > 0 && <View style={{ gap: 15 }}>
      <View style={[row, styles.sectionHeader]}><View><T bold style={{ fontSize: 20, lineHeight: 25 }}>أحدث الإعلانات</T><T style={{ color: C.muted, fontSize: 12 }}>اكتشف أحدث السيارات في السوق</T></View><T style={styles.resultCount}>{regular.length} إعلانات</T></View>
      {renderListings(regular)}
    </View>}
    {!ads.isLoading && !ads.error && results.length === 0 && <Empty title="لا توجد نتائج" text="جرّب اسم ماركة آخر أو وسّع فلاتر البحث." />}
    {isDemo && <T style={{ textAlign: 'center', color: C.muted, fontSize: 12 }}>الإعلانات المعروضة نماذج توضيحية وليست عروض بيع فعلية.</T>}
    <View style={[row, styles.footerNote]}><Icon name="shield-checkmark-outline" color={C.muted} size={15} /><T style={{ color: C.muted, fontSize: 12 }}>إعلانات تُراجع. تواصل مباشر. نشر مجاني.</T></View>
  </Shell>;
}

const styles = {
  grid: { flexDirection: 'row-reverse' as const, flexWrap: 'wrap' as const, alignItems: 'stretch' as const, gap: 16 },
  trustPill: { gap: 6, backgroundColor: C.mint, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
  searchBox: { flex: 1, backgroundColor: C.white, borderRadius: 15, borderWidth: 1, borderColor: C.line, paddingHorizontal: 15, height: 56, gap: 10 },
  searchInput: { flex: 1, fontFamily: 'Tajawal', fontSize: 14, textAlign: 'right' as const, color: C.text, height: '100%' as const },
  filterButton: { width: 56, height: 56, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 15, justifyContent: 'center' as const, alignItems: 'center' as const },
  filterButtonActive: { backgroundColor: C.green, borderColor: C.green },
  filterPanel: { backgroundColor: C.white, padding: 18, borderRadius: 17, gap: 15, borderWidth: 1, borderColor: C.line },
  sectionHeader: { justifyContent: 'space-between' as const, gap: 10 },
  sectionIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.goldLight, alignItems: 'center' as const, justifyContent: 'center' as const },
  resultCount: { color: C.muted, fontSize: 12, backgroundColor: C.white, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, overflow: 'hidden' as const },
  footerNote: { justifyContent: 'center' as const, gap: 7, paddingBottom: 4 },
};
