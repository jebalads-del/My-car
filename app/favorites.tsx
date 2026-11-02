import { Shell } from '@/components/market/shell';
import { Empty } from '@/components/market/ui';
import { ListingCard } from '@/components/market/listing-card';
import { useMarket } from '@/lib/market-context';
import { DEMO_LISTINGS } from '@/lib/demo-listings';
import { trpc } from '@/lib/trpc';
import { Listing } from '@/shared/market';
export default function Favorites() { const { favorites, provider } = useMarket(); const ads = trpc.market.list.useQuery(); const all = (provider !== 'supabase' && ads.data?.length === 0 ? DEMO_LISTINGS : ads.data ?? []) as Listing[]; const saved = all.filter(x => favorites.includes(String(x.id))); return <Shell title="سيارات أعجبتك" subtitle="اختياراتك محفوظة على هذا الجهاز" back>{saved.length ? saved.map(listing => <ListingCard key={listing.id} listing={listing} />) : <Empty icon="heart-outline" title="اختياراتك تبدأ من هنا" text="اضغط على القلب بجانب أي إعلان لتجده هنا لاحقاً." />}</Shell>; }
