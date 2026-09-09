import { useState, useEffect } from "react";

function MainComponent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("token");
      if (!t) {
        setError("رابط إعادة التعيين غير صالح");
      } else {
        setToken(t);
      }
    }
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError("الرجاء ملء جميع الحقول");
      return;
    }

    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمة المرور وتأكيدها غير متطابقتين");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
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

  if (!token && !error) {
    return null;
  }

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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            إعادة تعيين كلمة المرور
          </h1>
          <p className="mt-2 text-sm text-gray-500">أدخل كلمة المرور الجديدة</p>
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
              <p className="font-medium text-green-800">
                تم تغيير كلمة المرور بنجاح!
              </p>
              <p className="mt-1 text-sm text-green-600">
                يمكنك الآن تسجيل الدخول بكلمة مرورك الجديدة
              </p>
            </div>
            <a
              href="/account/signin"
              className="inline-block w-full rounded-lg bg-[#60A5FA] px-4 py-3 text-center text-base font-semibold text-white hover:bg-[#3B82F6]"
            >
              تسجيل الدخول
            </a>
          </div>
        ) : (
          <form noValidate onSubmit={onSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-right text-sm text-red-600">
                {error}
              </div>
            )}

            {token && (
              <>
                <div className="space-y-2">
                  <label className="block text-right text-sm font-medium text-gray-700">
                    كلمة المرور الجديدة
                  </label>
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الجديدة"
                      className="w-full bg-transparent text-right text-base outline-none"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-right text-sm font-medium text-gray-700">
                    تأكيد كلمة المرور
                  </label>
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                    <input
                      required
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور"
                      className="w-full bg-transparent text-right text-base outline-none"
                      dir="rtl"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#60A5FA] px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-[#3B82F6] disabled:opacity-50"
                >
                  {loading ? "جاري الحفظ..." : "حفظ كلمة المرور الجديدة"}
                </button>
              </>
            )}

            {!token && (
              <a
                href="/forgot-password"
                className="block text-center text-sm font-medium text-blue-500 hover:text-blue-600"
              >
                طلب رابط جديد
              </a>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default MainComponent;
