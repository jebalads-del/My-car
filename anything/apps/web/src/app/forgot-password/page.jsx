import { useState } from "react";

function MainComponent() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email) {
      setError("الرجاء إدخال البريد الإلكتروني");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "حدث خطأ");
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "حدث خطأ. الرجاء المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
            <svg
              className="h-7 w-7 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            نسيت كلمة المرور؟
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور
          </p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="mb-4 rounded-xl bg-green-50 p-6">
              <svg
                className="mx-auto mb-3 h-10 w-10 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="font-medium text-green-800">تم إرسال الرابط!</p>
              <p className="mt-1 text-sm text-green-600">
                تفقد بريدك الإلكتروني واتبع التعليمات
              </p>
            </div>
            <a
              href="/account/signin"
              className="text-sm font-medium text-blue-500 hover:text-blue-600"
            >
              العودة إلى تسجيل الدخول
            </a>
          </div>
        ) : (
          <form noValidate onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-right text-sm font-medium text-gray-700">
                البريد الإلكتروني
              </label>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="أدخل بريدك الإلكتروني"
                  className="w-full bg-transparent text-right text-base outline-none"
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
              className="w-full rounded-lg bg-[#60A5FA] px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-[#3B82F6] disabled:opacity-50"
            >
              {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
            </button>

            <p className="text-center text-sm text-gray-600">
              <a
                href="/account/signin"
                className="font-medium text-[#60A5FA] hover:text-[#3B82F6]"
              >
                العودة إلى تسجيل الدخول
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default MainComponent;
