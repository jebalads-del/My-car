import { useState } from "react";
import useAuth from "@/utils/useAuth";

function MainComponent() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const { signUpWithCredentials, signInWithGoogle } = useAuth();

  // Read callbackUrl from URL params (important for Expo mobile auth flow)
  const getCallbackUrl = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("callbackUrl") || "/";
    }
    return "/";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("الرجاء ملء جميع الحقول المطلوبة");
      setLoading(false);
      return;
    }

    try {
      await signUpWithCredentials({
        email,
        password,
        name: name || undefined,
        callbackUrl: getCallbackUrl(),
        redirect: true,
      });
    } catch (err) {
      const errorMessages = {
        OAuthSignin: "تعذر بدء التسجيل. الرجاء المحاولة مرة أخرى.",
        OAuthCallback:
          "فشل التسجيل بعد إعادة التوجيه. الرجاء المحاولة مرة أخرى.",
        OAuthCreateAccount: "تعذر إنشاء حساب بهذه الطريقة. جرب طريقة أخرى.",
        EmailCreateAccount: "هذا البريد الإلكتروني مسجل بالفعل.",
        Callback: "حدث خطأ أثناء التسجيل. الرجاء المحاولة مرة أخرى.",
        OAuthAccountNotLinked: "هذا الحساب مرتبط بطريقة تسجيل مختلفة.",
        CredentialsSignin:
          "البريد الإلكتروني أو كلمة المرور غير صحيحة. إذا كان لديك حساب بالفعل، جرب تسجيل الدخول.",
        AccessDenied: "ليس لديك صلاحية التسجيل.",
        Configuration: "التسجيل لا يعمل الآن. الرجاء المحاولة لاحقاً.",
        Verification: "انتهت صلاحية رابط التسجيل. اطلب رابطاً جديداً.",
      };

      setError(
        errorMessages[err.message] || "حدث خطأ. الرجاء المحاولة مرة أخرى.",
      );
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await signInWithGoogle({
        callbackUrl: getCallbackUrl(),
        redirect: true,
      });
    } catch (err) {
      setError("فشل التسجيل عبر Google");
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-4">
      <form
        noValidate
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8"
      >
        <h1 className="mb-2 text-center text-2xl font-semibold text-gray-900">
          إنشاء حساب جديد
        </h1>
        <p className="mb-8 text-center text-sm text-gray-500">
          انضم إلى سوق السيارات الآن
        </p>

        <div className="space-y-6">
          {/* Google Sign Up */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            التسجيل عبر Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500">أو</span>
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <label className="block text-right text-sm font-medium text-gray-700">
              الاسم (اختياري)
            </label>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
              <input
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسمك"
                className="w-full bg-transparent text-right text-base outline-none"
                dir="rtl"
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label className="block text-right text-sm font-medium text-gray-700">
              البريد الإلكتروني *
            </label>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
              <input
                required
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل بريدك الإلكتروني"
                className="w-full bg-transparent text-right text-base outline-none"
                dir="rtl"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="block text-right text-sm font-medium text-gray-700">
              كلمة المرور *
            </label>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
              <input
                required
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-transparent text-right text-base outline-none"
                placeholder="أدخل كلمة المرور"
                dir="rtl"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-right text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#60A5FA] px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
          </button>

          <p className="text-center text-sm text-gray-600">
            لديك حساب بالفعل؟{" "}
            <a
              href={`/account/signin${
                typeof window !== "undefined" ? window.location.search : ""
              }`}
              className="font-medium text-[#60A5FA] hover:text-[#3B82F6]"
            >
              سجل الدخول
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}

export default MainComponent;
