import { useState } from 'react';
import { View, Pressable, Linking } from 'react-native';
import { Shell } from '@/components/market/shell';
import { C, T, Icon, row, Field, Section, Button, ErrorText, Notice } from '@/components/market/ui';
import { useMarket } from '@/lib/market-context';
import { WEBSITE_URL } from '@/shared/identity';
import { trpc } from '@/lib/trpc';
export default function Contact() {
  const { settings, user, provider } = useMarket(); const mutation = trpc.market.contact.useMutation();
  const [name, setName] = useState(user?.name ?? ''); const [email, setEmail] = useState(user?.email ?? ''); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [success, setSuccess] = useState(false);
  const send = async () => { setError(''); setSuccess(false); if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.trim().length < 10) { setError('أدخل الاسم وبريداً صحيحاً ورسالة من 10 أحرف على الأقل.'); return; } try { await mutation.mutateAsync({ name, email, message }); setSuccess(true); setMessage(''); } catch (e) { setError(e instanceof Error ? e.message : 'تعذّر إرسال الرسالة'); } };
  return <Shell title="نسمعك، ونساعدك" subtitle="سؤال، اقتراح، أو مساعدة؟ نحن هنا." back><View style={[row, { backgroundColor: C.mint, padding: 22, borderRadius: 18, gap: 16 }]}><Icon name="chatbubbles-outline" size={39} /><View style={{ flex: 1 }}><T bold style={{ color: C.green, fontSize: 21 }}>تواصل معنا</T><T style={{ color: C.muted, fontSize: 13 }}>قنوات التواصل مع إدارة المنصة.</T></View></View>
  {!!settings.contactPhone && <ContactRow icon="call-outline" title="اتصل بنا" value={settings.contactPhone} onPress={() => Linking.openURL(`tel:${settings.contactPhone}`)} />}
  {!!settings.contactEmail && <ContactRow icon="mail-outline" title="البريد الإلكتروني" value={settings.contactEmail} onPress={() => Linking.openURL(`mailto:${settings.contactEmail}`)} />}
  {!!settings.whatsapp && <ContactRow icon="logo-whatsapp" title="واتساب" value={settings.whatsapp} onPress={() => Linking.openURL(`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`)} />}
  {success && <Notice icon="checkmark-circle-outline">تم إرسال رسالتك بنجاح. ستراجعها إدارة المنصة.</Notice>}
  {provider === 'supabase' ? <View style={{ gap: 12 }}><Notice>قنوات التواصل الإضافية ليست ضمن إعدادات قاعدة الموقع الحالية. يمكنك زيارة الموقع الرسمي؛ لم ننشئ صندوق رسائل منفصلاً في التطبيق.</Notice><Button title="فتح الموقع الرسمي" secondary icon="open-outline" onPress={() => Linking.openURL(WEBSITE_URL)} /></View> : <Section title="اترك لنا رسالة"><Field label="الاسم" value={name} onChangeText={setName} placeholder="اسمك" maxLength={100} /><Field label="البريد الإلكتروني" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" maxLength={320} /><Field label="الرسالة" value={message} onChangeText={setMessage} placeholder="كيف يمكننا مساعدتك؟" multiline maxLength={3000} /><ErrorText text={error} /><Button title="إرسال الرسالة" icon="send-outline" onPress={send} loading={mutation.isPending} /></Section>}
  <T style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>لا ترسل كلمات المرور أو بيانات البطاقة في الرسائل.</T></Shell>;
}
function ContactRow({ icon, title, value, onPress }: any) { return <Pressable onPress={onPress} style={[row, { padding: 19, gap: 14, borderRadius: 13, backgroundColor: C.white, borderWidth: 1, borderColor: C.line }]}><Icon name={icon} /><View style={{ flex: 1 }}><T bold style={{ fontSize: 14 }}>{title}</T><T style={{ color: C.muted, fontSize: 14 }}>{value}</T></View><Icon name="arrow-back-outline" color={C.muted} size={18} /></Pressable>; }
