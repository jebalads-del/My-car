export const BRANDS: Record<string, string[]> = {
  'تويوتا': ['لاند كروزر', 'برادو', 'كامري', 'كورولا', 'هايلكس', 'راف فور', 'أفالون'],
  'لكزس': ['LX 600', 'LX 570', 'ES 350', 'RX 350', 'IS 300', 'GX 460'],
  'مرسيدس': ['E 200', 'E 300', 'C 200', 'S 500', 'G 63', 'GLC 300'],
  'نيسان': ['باترول', 'ألتيما', 'صني', 'إكس تريل', 'باثفايندر'],
  'بي إم دبليو': ['520i', '530i', 'X5', 'X6', '740i'],
  'كيا': ['سبورتاج', 'K5', 'سيراتو', 'سورينتو'],
  'هيونداي': ['توسان', 'سوناتا', 'إلنترا', 'سانتافي'],
  'شيفروليه': ['تاهو', 'سوبربان', 'سيلفرادو', 'ماليبو'],
  'فورد': ['إكسبلورر', 'إكسبيديشن', 'موستانج', 'F-150'],
  'بورش': ['كايين', 'ماكان', '911', 'باناميرا'],
  'لاند روفر': ['رنج روفر', 'ديفندر', 'ديسكفري'],
  'جي إم سي': ['يوكون', 'سييرا', 'أكاديا'],
};
export const CURRENCIES = [
  { code: 'KWD', label: 'دينار كويتي', symbol: 'د.ك' },
  { code: 'SAR', label: 'ريال سعودي', symbol: 'ر.س' },
  { code: 'AED', label: 'درهم إماراتي', symbol: 'د.إ' },
  { code: 'QAR', label: 'ريال قطري', symbol: 'ر.ق' },
  { code: 'BHD', label: 'دينار بحريني', symbol: 'د.ب' },
  { code: 'OMR', label: 'ريال عُماني', symbol: 'ر.ع' },
];
export const LOCATIONS = ['الكويت العاصمة', 'حولي', 'الفروانية', 'الأحمدي', 'الجهراء', 'مبارك الكبير', 'السعودية', 'الإمارات', 'قطر', 'البحرين', 'عُمان'];
export const COLORS = ['أبيض', 'أسود', 'فضي', 'رمادي', 'أزرق', 'أحمر', 'بيج', 'بني', 'أخضر', 'لون آخر'];
export const STATUS_LABELS: Record<string, string> = { pending: 'قيد المراجعة', approved: 'منشور', rejected: 'مرفوض', sold: 'تم البيع', archived: 'مؤرشف' };
export interface Listing {
  id: number | string; userId: number | string; brand: string; model: string; year: number; color: string;
  price: string; currency: string; mileage: number; location: string; description: string;
  transmission: string; fuel: string; condition: string; images: string[];
  status: string; featured: boolean; featuredUntil?: Date | string | null;
  sellerName: string; sellerPhone: string; createdAt: Date | string;
  demo?: boolean; rejectionReason?: string | null;
}
export interface MarketSettings {
  brands: Record<string, string[]>; currencies: string[]; terms: string;
  contactEmail: string; contactPhone: string; whatsapp: string;
  paypalEnabled: boolean; paypalUrl: string; westernEnabled: boolean; westernInstructions: string;
  paypalEmail?: string;
  featuredPrice: number; featuredDays: number;
}
export const DEFAULT_SETTINGS: MarketSettings = {
  brands: BRANDS, currencies: CURRENCIES.map(x => x.code),
  terms: 'أقر بأن جميع بيانات الإعلان صحيحة، وأنني مالك السيارة أو مخوّل ببيعها. لا أرفع صوراً لا أملك حق استخدامها ولا أنشر محتوى مضللاً. يخضع الإعلان للمراجعة ويحق للإدارة رفض المخالف. لا تضمن المنصة حالة السيارة أو صحة المعاملة، ويُنصح بالفحص قبل الشراء وعدم دفع عربون قبل التحقق من البائع.',
  contactEmail: '', contactPhone: '', whatsapp: '',
  paypalEnabled: false, paypalUrl: '', westernEnabled: false, westernInstructions: '',
  featuredPrice: 5, featuredDays: 7,
};
export function currencySymbol(code: string) { return CURRENCIES.find(x => x.code === code)?.symbol ?? code; }
export function normalizeSearch(s: string) { return s.toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim(); }
export function matchesSearch(listing: Listing, query: string) {
  const haystack = normalizeSearch(`${listing.brand} ${listing.model} ${listing.year} ${listing.color} ${listing.location} ${listing.description}`);
  return normalizeSearch(query).split(' ').filter(Boolean).every(token => haystack.includes(token));
}
