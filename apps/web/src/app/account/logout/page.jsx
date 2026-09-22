import useAuth from "@/utils/useAuth";

function MainComponent() {
  const { signOut } = useAuth();
  const handleSignOut = async () => {
    await signOut({
      callbackUrl: "/",
      redirect: true,
    });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8">
        <h1 className="mb-8 text-center text-2xl font-semibold text-gray-900">
          تسجيل الخروج
        </h1>

        <p className="mb-8 text-center text-sm text-gray-600">
          هل أنت متأكد من تسجيل الخروج من حسابك؟
        </p>

        <button
          onClick={handleSignOut}
          className="w-full rounded-lg bg-[#60A5FA] px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
          تسجيل الخروج
        </button>

        <a
          href="/"
          className="mt-4 block text-center text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          العودة للرئيسية
        </a>
      </div>
    </div>
  );
}

export default MainComponent;
