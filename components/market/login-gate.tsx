import { useState, type PropsWithChildren } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { C, T, Button, Empty, ErrorText, Field, Icon, Notice, row } from './ui';
import { useMarket } from '@/lib/market-context';
import { authRequest, startGoogleLogin } from '@/lib/shared-session';

type Mode = 'login' | 'register' | 'forgot';
function CompactLogin({ title, text, children }: PropsWithChildren<{ title: string; text: string; icon?: string }>) {
  return <View style={{ gap: 14, padding: 24, backgroundColor: C.white, borderRadius: 22, borderWidth: 1, borderColor: C.line, width: '100%', maxWidth: 460, alignSelf: 'center', marginVertical: 18 }}><View style={{ alignSelf: 'center', width: 52, height: 52, borderRadius: 17, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}><Icon name="person-outline" size={24} color={C.green} /></View><T bold style={{ fontSize: 24, lineHeight: 32, textAlign: 'center' }}>{title}</T><T style={{ fontSize: 14, color: C.muted, textAlign: 'center' }}>{text}</T>{children}</View>;
}

function PasswordField({ label, value, onChangeText, placeholder, visible, onToggle }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder: string; visible: boolean; onToggle: () => void;
}) {
  return <View style={{ position: 'relative' }}>
    <Field label={label} value={value} onChangeText={onChangeText} placeholder={placeholder} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} style={{ paddingLeft: 48 }} />
    <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} onPress={onToggle} hitSlop={4} style={{ position: 'absolute', left: 4, top: 27, height: 45, width: 40, alignItems: 'center', justifyContent: 'center' }}><Icon name={visible ? 'eye-off-outline' : 'eye-outline'} color={C.muted} size={21} /></Pressable>
  </View>;
}

export function AccountLoginGate({ text = 'سجّل دخولك لإدارة حسابك وإعلاناتك.', compact = false }: { text?: string; compact?: boolean }) {
  const { login, localLogin, authLoading, provider, providerLoading, refreshAuth } = useMarket();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);

  const changeMode = (next: Mode) => {
    setMode(next); setOtpSent(false); setCode(''); setPassword(''); setConfirmPassword('');
    setPasswordVisible(false);
    setError(''); setNotice('');
  };
  const requestCode = async () => {
    await authRequest(mode === 'register' ? '/api/auth/register/request' : '/api/auth/password/request',
      mode === 'register' ? { email: email.trim(), name, password } : { email: email.trim() });
    setOtpSent(true); setResendAt(Date.now() + 60000);
    setNotice('تحقق من بريدك ومن مجلد الرسائل غير المرغوب فيها. لا تشارك الرمز مع أي شخص.');
  };
  const submit = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('أدخل البريد الإلكتروني المسجّل في الموقع، وليس اسم المستخدم.');
      if (mode === 'login') { await localLogin(email, password); return; }
      if (!otpSent) {
        if (mode === 'register' && password !== confirmPassword) throw new Error('كلمتا المرور غير متطابقتين');
        await requestCode(); return;
      }
      if (mode === 'register') {
        await authRequest('/api/auth/register/verify', { email: email.trim(), code });
        await refreshAuth();
      } else {
        if (password !== confirmPassword) throw new Error('كلمتا المرور غير متطابقتين');
        await authRequest('/api/auth/password/reset', { email: email.trim(), code, password });
        changeMode('login'); setNotice('تم تغيير كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.');
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'تعذّر تنفيذ الطلب'); }
    finally { setBusy(false); }
  };
  const googleLogin = async () => {
    setBusy(true); setError(''); setNotice('');
    try { await startGoogleLogin(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'تعذّر تسجيل الدخول عبر Google'); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    if (Date.now() < resendAt) { setError('انتظر دقيقة قبل إعادة إرسال الرمز.'); return; }
    setBusy(true); setError('');
    try { await requestCode(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'تعذّر إرسال الرمز'); }
    finally { setBusy(false); }
  };
  if (providerLoading) return <ActivityIndicator color={C.green} />;
  const title = mode === 'login' ? 'تسجيل الدخول' : mode === 'register' ? 'إنشاء حساب جديد' : 'استعادة كلمة المرور';
  const needsPassword = mode === 'login' || (mode === 'register' && !otpSent) || (mode === 'forgot' && otpSent);
  const disabled = busy || !email.trim() || (mode === 'register' && !name.trim()) || (needsPassword && password.length < (mode === 'login' ? 1 : 8)) || (otpSent && !/^\d{6,8}$/.test(code));
  const Container = compact ? CompactLogin : Empty;
  return <Container icon="person-outline" title={mode === 'login' && compact ? 'مرحباً بك مجدداً' : title} text={mode === 'login' ? text : 'حساب واحد للموقع والتطبيق، وبريد واحد للتحقق.'}>
    <View style={{ width: '100%', marginTop: 10, gap: 10 }}>
      {mode === 'register' && !otpSent && <Field label="الاسم" value={name} onChangeText={setName} maxLength={100} placeholder="الاسم الكامل" />}
      {!otpSent ? <Field label="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="example@domain.com" /> : <T style={{ fontSize: 12, textAlign: 'center', color: C.muted }}>أرسلنا رمز التحقق إلى {email}</T>}
      {otpSent && <Field label="رمز التحقق" value={code} onChangeText={value => setCode(value.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/\D/g, ''))} keyboardType="number-pad" maxLength={8} placeholder="أدخل الرمز الموجود في البريد" />}
      {needsPassword && <PasswordField label={mode === 'forgot' ? 'كلمة المرور الجديدة' : 'كلمة المرور'} value={password} onChangeText={setPassword} visible={passwordVisible} onToggle={() => setPasswordVisible(value => !value)} placeholder={mode === 'login' ? 'كلمة المرور' : '8 أحرف على الأقل'} />}
      {needsPassword && mode !== 'login' && <PasswordField label="تأكيد كلمة المرور" value={confirmPassword} onChangeText={setConfirmPassword} visible={passwordVisible} onToggle={() => setPasswordVisible(value => !value)} placeholder="أعد كتابة كلمة المرور" />}
      {!!notice && <Notice>{notice}</Notice>}
      <ErrorText text={error} />
      <Button title={mode === 'login' ? 'دخول' : otpSent ? (mode === 'register' ? 'تفعيل الحساب' : 'حفظ كلمة المرور') : 'إرسال رمز التحقق'} onPress={submit} loading={busy || authLoading} disabled={disabled} icon={mode === 'login' ? 'log-in-outline' : otpSent ? 'checkmark-circle-outline' : 'mail-outline'} />
      {provider === 'supabase' && !otpSent && mode !== 'forgot' && <Button title="المتابعة باستخدام Google" onPress={googleLogin} loading={busy} disabled={busy} secondary />}
      {otpSent && <View style={[row, { justifyContent: 'space-between' }]}><Pressable disabled={busy} onPress={resend}><T style={{ color: C.green, fontSize: 12 }}>إعادة إرسال الرمز</T></Pressable><Pressable disabled={busy} onPress={() => { setOtpSent(false); setCode(''); setNotice(''); }}><T style={{ color: C.green, fontSize: 12 }}>تغيير البريد</T></Pressable></View>}
      {mode === 'login' ? <><View style={[row, { flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, borderTopWidth: 1, borderColor: C.line, paddingTop: 12, marginTop: 4 }]}><Pressable accessibilityRole="button" disabled={busy} onPress={() => changeMode('register')} style={{ minHeight: 40, justifyContent: 'center' }}><T bold style={{ color: C.green, fontSize: 13 }}>تسجيل حساب جديد</T></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => changeMode('forgot')} style={{ minHeight: 40, justifyContent: 'center' }}><T style={{ color: C.muted, fontSize: 13 }}>نسيت كلمة المرور؟</T></Pressable></View>{provider === 'local' && <Button title="الدخول عبر Manus" onPress={login} loading={authLoading} secondary />}</> : <Pressable accessibilityRole="button" disabled={busy} onPress={() => changeMode('login')}><T style={{ textAlign: 'center', color: C.green, fontSize: 13 }}>العودة إلى تسجيل الدخول</T></Pressable>}
      <T style={{ textAlign: 'center', color: C.muted, fontSize: 11 }}>نفس حسابك في sayarty.store · التحقق بالبريد</T>
    </View>
  </Container>;
}
