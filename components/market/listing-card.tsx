import { View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Listing, currencySymbol } from '@/shared/market';
import { C, T, Icon, row } from './ui';
import { useMarket } from '@/lib/market-context';
import { demoImages } from '@/lib/demo-listings';
import { getApiBaseUrl } from '@/constants/oauth';

export function assetUrl(url?: string) { return (url ?? '').startsWith('/manus-storage/') ? `${getApiBaseUrl()}${url}` : (url ?? ''); }

export function ListingCard({ listing }: { listing: Listing }) {
  const { favorites, toggleFavorite } = useMarket();
  const { width } = useWindowDimensions();
  const isFavorite = favorites.includes(String(listing.id));
  const imageHeight = width >= 760 ? 205 : 195;

  return <View style={[styles.card, listing.featured && styles.featuredCard]}>
    <Pressable onPress={() => router.push(`/listing/${listing.id}` as any)} accessibilityLabel={`تفاصيل ${listing.brand} ${listing.model}`}>
      <Image source={listing.demo ? demoImages[Number(listing.id)] : { uri: assetUrl(listing.images[0]) }} style={{ width: '100%', height: imageHeight, backgroundColor: '#E7E8E2' }} contentFit="cover" transition={200} />
      <View style={styles.badgeStack}>
        {listing.featured && <View style={[row, styles.badge]}><Icon name="star" size={12} color="#80643A" /><T bold style={{ color: '#80643A', fontSize: 12, lineHeight: 18 }}>إعلان مميّز</T></View>}
        {listing.demo && <View style={styles.demoBadge}><T style={{ fontSize: 10, lineHeight: 16, color: C.muted }}>نموذج توضيحي</T></View>}
      </View>
    </Pressable>
    <Pressable accessibilityLabel={isFavorite ? 'إزالة من المفضلة' : 'حفظ في المفضلة'} onPress={() => toggleFavorite(listing.id)} style={styles.favorite}>
      <Icon name={isFavorite ? 'heart' : 'heart-outline'} color={isFavorite ? '#BA675E' : C.text} size={20} />
    </Pressable>
    <View style={styles.content}>
      <View style={[row, { justifyContent: 'space-between', gap: 8 }]}>
        <T bold style={{ fontSize: 20, flex: 1 }}>{listing.brand} {listing.model}</T>
        <T style={styles.year}>{listing.year}</T>
      </View>
      <View style={[row, styles.metaRow]}>
        <View style={[row, styles.metaItem]}><Icon name="speedometer-outline" size={15} color={C.muted} /><T style={styles.meta}>{Number(listing.mileage).toLocaleString('en-US')} كم</T></View>
        {!!listing.transmission && <View style={[row, styles.metaItem]}><Icon name="git-compare-outline" size={15} color={C.muted} /><T style={styles.meta}>{listing.transmission}</T></View>}
        {!!listing.location && <View style={[row, styles.metaItem]}><Icon name="location-outline" size={15} color={C.muted} /><T style={styles.meta}>{listing.location}</T></View>}
      </View>
      <View style={styles.divider} />
      <View style={[row, { justifyContent: 'space-between', gap: 8 }]}>
        <View style={[row, { gap: 5, alignItems: 'baseline' }]}><T bold style={{ fontSize: 23, color: C.green, lineHeight: 32 }}>{Number(listing.price).toLocaleString('en-US')}</T><T style={{ color: C.green, fontSize: 13 }}>{currencySymbol(listing.currency)}</T></View>
        <Pressable accessibilityRole="button" onPress={() => router.push(`/listing/${listing.id}` as any)} style={[row, styles.detailsButton]}><T bold style={{ fontSize: 12, color: C.green }}>التفاصيل</T><Icon name="arrow-back" size={15} /></Pressable>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.line, overflow: 'hidden', height: '100%' },
  featuredCard: { borderColor: '#D9CBAF' },
  badgeStack: { position: 'absolute', top: 12, right: 12, gap: 6 },
  badge: { backgroundColor: '#FFF8E9', borderWidth: 1, borderColor: '#E8D9B8', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4, gap: 5 },
  demoBadge: { backgroundColor: 'rgba(255,255,255,.94)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  favorite: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,.96)', width: 37, height: 37, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  content: { padding: 16, gap: 11, flex: 1 },
  year: { color: C.muted, fontSize: 12, backgroundColor: C.bg, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, overflow: 'hidden' },
  metaRow: { gap: 12, flexWrap: 'wrap' },
  metaItem: { gap: 5 },
  meta: { color: C.muted, fontSize: 11, lineHeight: 18 },
  divider: { height: 1, backgroundColor: C.line },
  detailsButton: { gap: 5, backgroundColor: C.mint, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 11 },
});
