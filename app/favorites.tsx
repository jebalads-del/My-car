import { View, useWindowDimensions } from 'react-native';
import { Shell } from '@/components/market/shell';
import { C, Empty, Icon, T, row } from '@/components/market/ui';
import { ListingCard } from '@/components/market/listing-card';
import { useMarket } from '@/lib/market-context';
import { DEMO_LISTINGS } from '@/lib/demo-listings';
import { trpc } from '@/lib/trpc';
import { Listing } from '@/shared/market';

export default function Favorites() {
  const { favorites, provider } = useMarket();
  const ads = trpc.market.list.useQuery();
  const { width } = useWindowDimensions();
  const all = (provider !== 'supabase' && ads.data?.length === 0 ? DEMO_LISTINGS : ads.data ?? []) as Listing[];
  const saved = all.filter(x => favorites.includes(String(x.id)));
  const cardWidth = width >= 760 ? '48.8%' : '100%';

  return <Shell title="سيارات أعجبتك" subtitle="اختياراتك المحفوظة في مكان واحد" back showBanner={false}>
    {saved.length ? <>
      <View style={[row, { justifyContent: 'space-between', gap: 12, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 17, padding: 15 }]}>
        <View style={[row, { gap: 11 }]}><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.mint, justifyContent: 'center', alignItems: 'center' }}><Icon name="heart" color={C.green} size={19} /></View><View><T bold style={{ fontSize: 16 }}>قائمة اختياراتك</T><T style={{ color: C.muted, fontSize: 12 }}>تعود إليها متى شئت</T></View></View>
        <T bold style={{ color: C.green, fontSize: 14 }}>{saved.length} سيارات</T>
      </View>
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 16 }}>{saved.map(listing => <View key={listing.id} style={{ width: cardWidth }}><ListingCard listing={listing} /></View>)}</View>
    </> : <View style={{ backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 16 }}><Empty icon="heart-outline" title="اختياراتك تبدأ من هنا" text="اضغط على القلب بجانب أي إعلان لتجده هنا لاحقاً." /></View>}
  </Shell>;
}
