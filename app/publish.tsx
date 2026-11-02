import { useEffect, useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Shell, LoginGate } from '@/components/market/shell';
import { C, T, Icon, row, Section, Field, Select, Button, ErrorText, Notice, Sheet } from '@/components/market/ui';
import { assetUrl } from '@/components/market/listing-card';
import { useMarket } from '@/lib/market-context';
import { trpc } from '@/lib/trpc';
import { parseEntityId } from '@/shared/identity';
import { CURRENCIES, COLORS, LOCATIONS } from '@/shared/market';
import { SessionActions } from '@/components/market/session-actions';
const initial = { brand: '', model: '', color: '', year: '', price: '', currency: 'KWD', mileage: '', location: 'الكويت العاصمة', description: '', transmission: 'أوتوماتيك', fuel: 'بنزين', condition: 'مستعملة' };
type Photo = { uri: string; base64?: string | null; mime?: string; saved?: boolean };
const numeric = (v: string) => Number(v.replace(/[٠-٩]/g, x => String('٠١٢٣٤٥٦٧٨٩'.indexOf(x))).replace(/,/g, ''));
export default function Publish() {
  const { user, settings, unsupportedCarFields, uploadMaxBytes } = useMarket(); const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editingId = parseEntityId(edit);
  const existing = trpc.market.detail.useQuery({ id: editingId }, { enabled: !!editingId && !!user });
  const mine = trpc.market.me.useQuery(undefined, { enabled: !!user });
  const create = trpc.market.create.useMutation(); const update = trpc.market.update.useMutation(); const upload = trpc.market.upload.useMutation();
  const utils = trpc.useUtils();
  const [form, setForm] = useState(initial); const [photos, setPhotos] = useState<Photo[]>([]); const [accepted, setAccepted] = useState(false); const [termsOpen, setTermsOpen] = useState(false);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(''); const [success, setSuccess] = useState(false);
  const set = (key: keyof typeof initial, value: string) => setForm(v => ({ ...v, [key]: value, ...(key === 'brand' ? { model: '' } : {}) }));
  useEffect(() => {
    const ad = existing.data; if (!ad) return;
    setForm({ brand: ad.brand, model: ad.model, color: ad.color, year: String(ad.year), price: String(ad.price), currency: ad.currency, mileage: String(ad.mileage), location: ad.location, description: ad.description, transmission: ad.transmission, fuel: ad.fuel, condition: ad.condition });
    setPhotos(ad.images.map(uri => ({ uri, saved: true })));
  }, [existing.data]);
  const pickPhotos = async () => {
    setError(''); if (photos.length >= 6) { setError('يمكنك إضافة 6 صور فقط. احذف صورة لإضافة غيرها.'); return; }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 6 - photos.length, base64: true, quality: .8 });
      if (result.canceled) return;
      if (result.assets.length + photos.length > 6) { setError('الحد الأقصى 6 صور لكل إعلان.'); return; }
      if (result.assets.some(x => (x.fileSize ?? 0) > uploadMaxBytes || (x.base64?.length ?? 0) > Math.ceil(uploadMaxBytes / 3) * 4 + 128)) { setError(`حجم كل صورة يجب أن يكون أقل من ${uploadMaxBytes / 1024 / 1024} ميغابايت.`); return; }
      if (result.assets.some(x => !x.base64 || !['image/jpeg', 'image/png', 'image/webp'].includes(x.mimeType ?? 'image/jpeg'))) { setError('اختر صور JPG أو PNG أو WebP.'); return; }
      setPhotos(v => [...v, ...result.assets.map(x => ({ uri: x.uri, base64: x.base64, mime: x.mimeType ?? 'image/jpeg' }))]);
    } catch { setError('تعذّر فتح مكتبة الصور. تحقق من السماح للتطبيق بالوصول إلى الصور.'); }
  };
  const submit = async () => {
    setError('');
    if (!user) return;
    if (!mine.data?.user?.phone) { setError('أضف رقم هاتفك في حسابي أولاً حتى يتواصل معك المشترون.'); return; }
    if (!form.brand || !form.model || !form.color) { setError('اختر الماركة والموديل واللون.'); return; }
    if (!form.year || numeric(form.year) < 1950 || numeric(form.year) > new Date().getFullYear() + 1) { setError('أدخل سنة صحيحة بين 1950 والسنة القادمة.'); return; }
    if (!form.price || !Number.isFinite(numeric(form.price)) || numeric(form.price) <= 0) { setError('أدخل سعراً صحيحاً أكبر من صفر.'); return; }
    if (!form.mileage || !Number.isFinite(numeric(form.mileage)) || numeric(form.mileage) < 0) { setError('أدخل عدد الكيلومترات، ويمكن أن يكون صفراً.'); return; }
    if (!photos.length || photos.length > 6) { setError('أضف صورة واحدة على الأقل وبحد أقصى 6 صور.'); return; }
    if (!accepted) { setError('يجب الموافقة على شروط النشر قبل إرسال الإعلان.'); return; }
    setBusy(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        setProgress(`تحميل الصورة ${i + 1} من ${photos.length}`);
        if (photo.saved) { urls.push(photo.uri); continue; }
        const result = await upload.mutateAsync({ base64: photo.base64!, mime: photo.mime! });
        urls.push(result.url);
      }
      setPhotos(urls.map(uri => ({ uri, saved: true })));
      setProgress('إرسال الإعلان للمراجعة...');
      const data = { ...form, price: numeric(form.price), year: numeric(form.year), mileage: numeric(form.mileage), images: urls, termsAccepted: true as const };
      if (editingId) await update.mutateAsync({ id: editingId, ...data }); else await create.mutateAsync(data);
      await Promise.all([utils.market.me.invalidate(), utils.market.list.invalidate()]);
      setSuccess(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذّر إرسال الإعلان، يرجى المحاولة مجدداً.'); } finally { setBusy(false); setProgress(''); }
  };
  const navigation = <SessionActions home personal disabled={busy} />;
  if (!user) return <Shell title="أعلن مجاناً" subtitle="بيع سيارتك يبدأ بخطوة بسيطة" showBanner={false} titleActions={navigation} back><LoginGate compact text="سجّل دخولك لنشر إعلانك مجاناً وحفظه في حسابك." /></Shell>;
  if (success) return <Shell title="تم استلام إعلانك" showBanner={false} titleActions={navigation} back><View style={{ paddingVertical: 28, alignItems: 'center', gap: 17 }}><View style={{ backgroundColor: C.mint, padding: 23, borderRadius: 60 }}><Icon name="checkmark-circle-outline" size={50} /></View><T bold style={{ fontSize: 25 }}>خطوة أقرب لبيع سيارتك</T><T style={{ textAlign: 'center', color: C.muted }}>إعلانك الآن قيد المراجعة. سيظهر في السوق بعد موافقة الإدارة، ويمكنك متابعة حالته من حسابك.</T><View style={{ width: '100%', marginTop: 12 }}><Button title="عرض إعلاناتي" icon="car-outline" onPress={() => router.replace('/account')} /></View></View></Shell>;
  return <Shell title={editingId ? 'تعديل إعلانك' : 'أعلن عن سيارتك'} subtitle="نشر مجاني. خطوات واضحة. مشترون أقرب." showBanner={false} titleActions={navigation} back>
    {!!editingId && existing.isLoading && <ActivityIndicator color={C.green} />}
    {!mine.data?.user?.phone && <Notice>أكمل رقم هاتفك في <T bold onPress={() => router.push('/account')} style={{ color: C.green }}>حسابي</T> قبل النشر.</Notice>}
    <Section title="01  معلومات السيارة" caption="اختر التفاصيل التي تساعد المشتري على العثور على سيارتك.">
      <View style={[row, { gap: 12 }]}><Select label="الماركة *" value={form.brand} options={Object.keys(settings.brands)} onChange={v => set('brand', v)} /><Select label="الموديل *" value={form.model} options={settings.brands[form.brand] ?? []} onChange={v => set('model', v)} disabled={!form.brand} /></View>
      <View style={[row, { gap: 12 }]}><Field label="سنة الصنع *" placeholder="2024" keyboardType="numeric" maxLength={4} value={form.year} onChangeText={v => set('year', v)} /><Select label="اللون *" value={form.color} options={COLORS} onChange={v => set('color', v)} /></View>
      {!unsupportedCarFields.includes('transmission') && <View style={[row, { gap: 12 }]}><Select label="ناقل الحركة" value={form.transmission} options={['أوتوماتيك', 'يدوي']} onChange={v => set('transmission', v)} /><Select label="نوع الوقود" value={form.fuel} options={['بنزين', 'ديزل', 'كهرباء', 'هايبرد']} onChange={v => set('fuel', v)} /></View>}
      <View style={[row, { gap: 12 }]}><Field label="الكيلومترات *" placeholder="مثال: 18000" keyboardType="numeric" value={form.mileage} onChangeText={v => set('mileage', v)} />{!unsupportedCarFields.includes('condition') && <Select label="حالة السيارة" value={form.condition} options={['مستعملة', 'جديدة']} onChange={v => set('condition', v)} />}</View>
    </Section>
    <Section title="02  السعر والتفاصيل"><View style={[row, { gap: 12 }]}><Field label="السعر المطلوب *" keyboardType="decimal-pad" placeholder="0" value={form.price} onChangeText={v => set('price', v)} /><Select label="العملة *" value={form.currency} options={CURRENCIES.filter(x => settings.currencies.includes(x.code)).map(x => ({ label: `${x.symbol} — ${x.label}`, value: x.code }))} onChange={v => set('currency', v)} /></View>{!unsupportedCarFields.includes('location') && <Select label="الموقع" value={form.location} options={LOCATIONS} onChange={v => set('location', v)} />}<Field label="وصف الإعلان" placeholder="حالة السيارة، الصيانة، المواصفات الإضافية..." multiline maxLength={3000} value={form.description} onChangeText={v => set('description', v)} /></Section>
    <Section title="03  صور تليق بسيارتك" caption={`حتى 6 صور · JPG / PNG / WebP · أقل من ${uploadMaxBytes / 1024 / 1024} MB للصورة`}><View style={[row, { flexWrap: 'wrap', gap: 10 }]}>{photos.map((photo, i) => <View key={`${photo.uri}-${i}`} style={{ width: 88, height: 88, borderRadius: 10, overflow: 'hidden' }}><Image source={{ uri: photo.saved ? assetUrl(photo.uri) : photo.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /><Pressable accessibilityLabel={`حذف الصورة ${i + 1}`} onPress={() => setPhotos(v => v.filter((_, index) => index !== i))} disabled={busy} style={{ position: 'absolute', left: 4, top: 4, padding: 2, backgroundColor: C.white, borderRadius: 10 }}><Icon name="close" size={16} /></Pressable>{i === 0 && <View style={{ position: 'absolute', bottom: 0, width: '100%', backgroundColor: C.green }}><T style={{ color: C.white, fontSize: 10, textAlign: 'center', lineHeight: 16 }}>الصورة الرئيسية</T></View>}</View>)}{photos.length < 6 && <Pressable accessibilityLabel="إضافة صور من الجهاز" onPress={pickPhotos} disabled={busy} style={{ width: 88, height: 88, borderRadius: 10, backgroundColor: C.mint, borderColor: '#C5DACD', borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Icon name="camera-outline" size={27} /><T bold style={{ color: C.green, fontSize: 11 }}>إضافة صور</T></Pressable>}</View><T style={{ color: C.muted, fontSize: 12 }}>{photos.length} / 6 صور · أول صورة هي صورة الغلاف</T></Section>
    <View style={{ gap: 14 }}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} onPress={() => setAccepted(v => !v)} style={[row, { alignItems: 'flex-start', gap: 10 }]}><Icon name={accepted ? 'checkbox' : 'square-outline'} size={24} /><T style={{ flex: 1, fontSize: 14 }}>أقرّ بصحة بيانات الإعلان وأوافق على <T bold onPress={() => setTermsOpen(true)} style={{ fontSize: 14, color: C.green, textDecorationLine: 'underline' }}>شروط وأحكام النشر.</T></T></Pressable><ErrorText text={error} /><Button title={busy ? progress : editingId ? 'حفظ وإرسال للمراجعة' : 'إرسال الإعلان'} icon="arrow-back-outline" onPress={submit} loading={busy} disabled={!accepted || busy} />{busy && <T style={{ fontSize: 13, textAlign: 'center', color: C.green }}>{progress}</T>}<T style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>لا رسوم على نشر الإعلان. تتم مراجعة المحتوى قبل ظهوره.</T></View>
    <Sheet title="شروط وأحكام النشر" visible={termsOpen} onClose={() => setTermsOpen(false)}><T style={{ lineHeight: 28, marginBottom: 20 }}>{settings.terms}</T><Button title="أوافق على الشروط" onPress={() => { setAccepted(true); setTermsOpen(false); }} /></Sheet>
  </Shell>;
}
