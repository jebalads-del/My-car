import { useMemo, useState } from 'react';
import { View, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Shell } from '@/components/market/shell';
import { C, T, Icon, row, Chip, Select, Field, Button, Empty, Notice } from '@/components/market/ui';
import { ListingCard } from '@/components/market/listing-card';
import { trpc } from '@/lib/trpc';
import { useMarket } from '@/lib/market-context';
import { DEMO_LISTINGS } from '@/lib/demo-listings';
import { CURRENCIES, Listing, matchesSearch } from '@/shared/market';
export default function Home() {
  const { settings, provider } = useMarket(); const ads = trpc.market.list.useQuery();
  const [query, setQuery] = useState(''); const [brand, setBrand] = useState(''); const [filters, setFilters] = useState(false);
  const [year, setYear] = useState(''); const [maxPrice, setMaxPrice] = useState(''); const [currency, setCurrency] = useState('KWD'); const [featuredOnly, setFeaturedOnly] = useState(false);
  const isDemo = provider !== 'supabase' && !ads.isLoading && !ads.error && ads.data?.length === 0;
  const all: Listing[] = (isDemo ? DEMO_LISTINGS : ads.data ?? []) as Listing[];
  const results = useMemo(() => all.filter(x => matchesSearch(x, query) && (!brand || x.brand === brand) && (!year || x.year >= Number(year)) && (!maxPrice || (x.currency === currency && Number(x.price) <= Number(maxPrice))) && (!featuredOnly || x.featured)).sort((a, b) => Number(b.featured) - Number(a.featured)), [all, query, brand, year, maxPrice, currency, featuredOnly]);
  const featured = results.filter(x => x.featured); const regular = results.filter(x => !x.featured);
  return <Shell>
  <View style={{ gap: 12 }}><View style={[row, { gap: 10 }]}><View style={[row, { backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.line, flex: 1, paddingHorizontal: 13, height: 49, gap: 8 }]}><Icon name="search-outline" size={20} color={C.muted} /><TextInput accessibilityLabel="البحث عن سيارة" placeholder="ابحث عن ماركة، موديل أو سنة..." placeholderTextColor="#949D95" value={query} onChangeText={setQuery} style={{ flex: 1, fontFamily: 'Tajawal', fontSize: 14, textAlign: 'right', color: C.text, height: '100%' }} />{query !== '' && <Pressable onPress={() => setQuery('')} accessibilityLabel="مسح البحث"><Icon name="close-circle" color={C.muted} size={18} /></Pressable>}</View><Pressable accessibilityLabel="فلاتر البحث" onPress={() => setFilters(v => !v)} style={{ width: 49, height: 49, backgroundColor: filters ? C.green : C.white, borderWidth: 1, borderColor: C.line, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}><Icon name="options-outline" color={filters ? C.white : C.green} /></Pressable></View>
  {filters && <View style={{ backgroundColor: C.white, padding: 17, borderRadius: 14, gap: 12, borderWidth: 1, borderColor: C.line }}><View style={[row, { gap: 12 }]}><Field label="من سنة" keyboardType="numeric" value={year} onChangeText={setYear} placeholder="مثال: 2020" /><Field label="أقصى سعر" keyboardType="numeric" value={maxPrice} onChangeText={setMaxPrice} placeholder="بدون حد" /></View><Select label="عملة فلتر السعر" value={currency} options={CURRENCIES.map(x => ({ label: x.label, value: x.code }))} onChange={setCurrency} /><Pressable onPress={() => setFeaturedOnly(v => !v)} style={[row, { gap: 8 }]}><Icon name={featuredOnly ? 'checkbox' : 'square-outline'} /><T style={{ fontSize: 14 }}>الإعلانات المميزة فقط</T></Pressable><Button title="مسح الفلاتر" secondary small onPress={() => { setYear(''); setMaxPrice(''); setBrand(''); setFeaturedOnly(false); setCurrency('KWD'); }} /></View>}
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[row, { gap: 7 }]}><Chip text="الكل" selected={!brand} onPress={() => setBrand('')} />{Object.keys(settings.brands).map(b => <Chip key={b} text={b} selected={brand === b} onPress={() => setBrand(brand === b ? '' : b)} />)}</ScrollView></View>
  {ads.isLoading && <ActivityIndicator color={C.green} style={{ padding: 30 }} />}
  {ads.error && <Notice>تعذّر تحميل الإعلانات. <T onPress={() => ads.refetch()} bold style={{ color: C.green }}>إعادة المحاولة</T></Notice>}
  {featured.length > 0 && <View style={{ gap: 14 }}><View style={[row, { justifyContent: 'space-between', marginTop: 2 }]}><View style={[row, { gap: 7 }]}><Icon name="sparkles-outline" color={C.gold} size={21} /><T bold style={{ fontSize: 20 }}>اختيارات مميّزة</T></View><T style={{ color: C.muted, fontSize: 12 }}>{featured.length} إعلانات</T></View>{featured.map(listing => <ListingCard key={listing.id} listing={listing} />)}</View>}
  {regular.length > 0 && <View style={{ gap: 14 }}><View style={[row, { justifyContent: 'space-between', marginTop: 5 }]}><T bold style={{ fontSize: 20 }}>أحدث الإعلانات</T><T style={{ color: C.muted, fontSize: 12 }}>جديد السوق</T></View>{regular.map(listing => <ListingCard key={listing.id} listing={listing} />)}</View>}
  {!ads.isLoading && !ads.error && results.length === 0 && <Empty title="لا توجد نتائج" text="جرّب اسم ماركة آخر أو وسّع فلاتر البحث." />}
  {isDemo && <T style={{ textAlign: 'center', color: C.muted, fontSize: 12 }}>الإعلانات المعروضة نماذج توضيحية وليست عروض بيع فعلية.</T>}
  <View style={[row, { justifyContent: 'center', gap: 6, paddingBottom: 4 }]}><Icon name="shield-checkmark-outline" color={C.muted} size={15} /><T style={{ color: C.muted, fontSize: 12 }}>إعلانات تُراجع. تواصل مباشر. نشر مجاني.</T></View></Shell>;
}
