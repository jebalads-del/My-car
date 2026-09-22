import { useState } from "react";
import useUser from "@/utils/useUser";

export default function MakeAdminPage() {
  const { data: user, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleMakeAdmin = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/make-admin", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || "فشل في الترقية");
      }
    } catch (err) {
      setError("حدث خطأ أثناء الترقية");
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-gray-600">جاري التحميل...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-2xl font-semibold text-gray-900">
            تسجيل الدخول مطلوب
          </h1>
          <p className="mb-8 text-sm text-gray-600">
            يجب عليك تسجيل الدخول أولاً لترقية حسابك إلى مدير
          </p>
          <a
            href="/account/signin"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700"
          >
            تسجيل الدخول
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="mb-4 text-2xl font-semibold text-gray-900">
            تمت الترقية بنجاح!
          </h1>

          <p className="mb-6 text-sm text-gray-600">
            أصبحت الآن مديراً. يجب عليك حذف هذه الصفحة من التطبيق لأسباب أمنية.
          </p>

          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800" dir="rtl">
              ⚠️ مهم: احذف الملف التالي فوراً:
            </p>
            <code
              className="mt-2 block rounded bg-red-100 px-3 py-2 text-xs text-red-900"
              dir="ltr"
            >
              /apps/web/src/app/make-admin/page.jsx
            </code>
            <p className="mt-2 text-xs text-red-700">وأيضاً احذف:</p>
            <code
              className="mt-1 block rounded bg-red-100 px-3 py-2 text-xs text-red-900"
              dir="ltr"
            >
              /apps/web/src/app/api/admin/make-admin/route.js
            </code>
          </div>

          <a
            href="/"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700"
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8">
        <h1 className="mb-2 text-center text-2xl font-semibold text-gray-900">
          ترقية الحساب إلى مدير
        </h1>

        <p className="mb-6 text-center text-sm text-gray-600">
          هذه الصفحة مخصصة لترقية أول مستخدم إلى مدير
        </p>

        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-700">
            <span className="font-medium">المستخدم الحالي:</span>
          </p>
          <p className="mt-1 text-sm text-gray-900">{user.email}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleMakeAdmin}
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "جاري الترقية..." : "ترقية إلى مدير"}
        </button>

        <div className="mt-6 rounded-lg bg-yellow-50 p-4">
          <p className="text-xs text-yellow-800">
            ⚠️ تحذير: احذف هذه الصفحة بعد إنشاء أول مستخدم مدير لأسباب أمنية
          </p>
        </div>
      </div>
    </div>
  );
}
