"use client";
import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Car,
  Star,
  X,
  Phone,
  MessageCircle,
} from "lucide-react";

const GULF_CURRENCIES = {
  KWD: { name: "دينار كويتي", flag: "🇰🇼" },
  SAR: { name: "ريال سعودي", flag: "🇸🇦" },
  AED: { name: "درهم إماراتي", flag: "🇦🇪" },
  QAR: { name: "ريال قطري", flag: "🇶🇦" },
  BHD: { name: "دينار بحريني", flag: "🇧🇭" },
  OMR: { name: "ريال عُماني", flag: "🇴🇲" },
};

function BannerAd({ banners }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners]);
  if (!banners || banners.length === 0) return null;
  const banner = banners[idx];
  return (
    <a
      href={banner.link_url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="block relative rounded-xl overflow-hidden mb-4"
    >
      <img
        src={banner.image_url}
        alt={banner.title}
        className="w-full h-24 object-cover"
      />
      <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-md font-bold">
        إعلان
      </span>
      {banners.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
          {banners.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </a>
  );
}

function CarCard({ car, onClick }) {
  const currency = car.currency || "KWD";
  return (
    <div
      onClick={() => onClick(car)}
      className={`bg-white rounded-xl border ${car.is_featured ? "border-2 border-yellow-400" : "border-gray-200"} overflow-hidden cursor-pointer hover:shadow-md transition-shadow`}
    >
      {car.is_featured && (
        <div className="bg-yellow-50 px-3 py-1.5 flex items-center justify-end gap-1.5">
          <Star size={12} fill="#D97706" color="#D97706" />
          <span className="text-xs font-bold text-yellow-700">إعلان مميز</span>
        </div>
      )}
      {car.images && car.images.length > 0 ? (
        <img
          src={car.images[0]}
          alt={`${car.brand} ${car.model}`}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
          <Car size={48} color="#E5E7EB" />
        </div>
      )}
      <div className="p-3">
        <h3 className="text-base font-bold text-gray-900 text-right mb-2">
          {car.brand} {car.model}
        </h3>
        <div className="flex flex-wrap justify-end gap-1.5 mb-2">
          {[
            car.year,
            `${(car.kilometers || 0).toLocaleString()} كم`,
            car.color,
          ].map((tag, i) => (
            <span
              key={i}
              className="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
        {car.price && (
          <p className="text-base font-bold text-blue-400 text-right">
            {GULF_CURRENCIES[currency]?.flag}{" "}
            {parseFloat(car.price).toLocaleString()} {currency}
          </p>
        )}
      </div>
    </div>
  );
}

function CarModal({ car, onClose }) {
  const [currentImg, setCurrentImg] = useState(0);
  if (!car) return null;
  const currency = car.currency || "KWD";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* صور */}
        {car.images && car.images.length > 0 ? (
          <div className="relative">
            <img
              src={car.images[currentImg]}
              alt=""
              className="w-full h-60 object-cover rounded-t-2xl"
            />
            {car.images.length > 1 && (
              <div className="flex gap-2 p-2 overflow-x-auto">
                {car.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    onClick={() => setCurrentImg(i)}
                    className={`h-14 w-20 object-cover rounded-lg cursor-pointer flex-shrink-0 border-2 ${i === currentImg ? "border-blue-400" : "border-transparent"}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-60 bg-gray-100 flex items-center justify-center rounded-t-2xl">
            <Car size={64} color="#E5E7EB" />
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={22} />
            </button>
            <h2 className="text-xl font-bold text-gray-900">
              {car.is_featured && (
                <span className="text-yellow-500 ml-1">⭐</span>
              )}
              {car.brand} {car.model}
            </h2>
          </div>

          <div className="flex flex-wrap justify-end gap-2 mb-4">
            {[
              { label: "السنة", value: car.year },
              {
                label: "الكيلومترات",
                value: `${(car.kilometers || 0).toLocaleString()} كم`,
              },
              { label: "اللون", value: car.color },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center"
              >
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-sm font-semibold text-gray-800">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {car.price && (
            <div className="bg-blue-50 rounded-xl p-3 mb-4 text-center">
              <p className="text-2xl font-bold text-blue-500">
                {GULF_CURRENCIES[currency]?.flag}{" "}
                {parseFloat(car.price).toLocaleString()} {currency}
              </p>
            </div>
          )}

          {car.description && (
            <div className="mb-4">
              <h4 className="font-bold text-gray-700 mb-1">الوصف</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                {car.description}
              </p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400 text-left">
              البائع: {car.user_name || "غير محدد"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCar, setSelectedCar] = useState(null);
  const [topBanners, setTopBanners] = useState([]);
  const [bottomBanners, setBottomBanners] = useState([]);
  const [filters, setFilters] = useState({
    brand: "",
    year: "",
    color: "",
    maxKilometers: "",
  });

  useEffect(() => {
    fetchCars();
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const [top, bot] = await Promise.all([
        fetch("/api/banners?position=top&status=approved").then((r) =>
          r.json(),
        ),
        fetch("/api/banners?position=bottom&status=approved").then((r) =>
          r.json(),
        ),
      ]);
      setTopBanners(top.banners || []);
      setBottomBanners(bot.banners || []);
    } catch {}
  };

  const fetchCars = async (customFilters, customSearch) => {
    try {
      setLoading(true);
      const f = customFilters || filters;
      const s = customSearch !== undefined ? customSearch : searchQuery;
      let url = "/api/cars?status=approved";
      if (s) url += `&search=${encodeURIComponent(s)}`;
      if (f.brand) url += `&brand=${encodeURIComponent(f.brand)}`;
      if (f.year) url += `&year=${f.year}`;
      if (f.color) url += `&color=${encodeURIComponent(f.color)}`;
      if (f.maxKilometers) url += `&maxKilometers=${f.maxKilometers}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCars(data.cars || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    const empty = { brand: "", year: "", color: "", maxKilometers: "" };
    setFilters(empty);
    setSearchQuery("");
    setShowFilters(false);
    fetchCars(empty, "");
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinner {
          animation: spin 0.8s linear infinite;
        }
      `}</style>
      {/* هيدر */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              <a
                href="/account/signin"
                className="text-sm text-blue-400 hover:text-blue-600 font-medium"
              >
                تسجيل الدخول
              </a>
              <span className="text-gray-300">|</span>
              <a
                href="/account/signup"
                className="text-sm text-blue-400 hover:text-blue-600 font-medium"
              >
                إنشاء حساب
              </a>
            </div>
            <h1 className="text-xl font-bold text-gray-900">🚗 سوق السيارات</h1>
          </div>

          {/* شريط البحث */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center rounded-lg border px-3 py-2.5 transition-colors ${showFilters ? "bg-blue-400 border-blue-400 text-white" : "bg-gray-50 border-gray-200 text-gray-500"}`}
            >
              <Filter size={18} />
            </button>
            <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 gap-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400">
              <Search size={16} color="#9CA3AF" className="flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchCars()}
                placeholder="ابحث عن ماركة، موديل..."
                className="flex-1 bg-transparent text-sm outline-none text-gray-800 text-right"
              />
            </div>
            <button
              onClick={() => fetchCars()}
              className="bg-blue-400 hover:bg-blue-500 text-white text-sm font-semibold px-4 rounded-lg transition-colors"
            >
              بحث
            </button>
          </div>

          {/* فلاتر متقدمة */}
          {showFilters && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-xs font-bold text-gray-700 mb-2 text-right">
                🔍 تصفية متقدمة
              </p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {[
                  { placeholder: "الماركة", key: "brand" },
                  { placeholder: "السنة", key: "year", type: "number" },
                  { placeholder: "اللون", key: "color" },
                  {
                    placeholder: "أقصى كيلومترات",
                    key: "maxKilometers",
                    type: "number",
                  },
                ].map((f) => (
                  <input
                    key={f.key}
                    type={f.type || "text"}
                    placeholder={f.placeholder}
                    value={filters[f.key]}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        [f.key]: e.target.value,
                      }))
                    }
                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-right outline-none focus:border-blue-400"
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchCars()}
                  className="flex-1 bg-blue-400 hover:bg-blue-500 text-white text-sm font-bold py-2 rounded-lg transition-colors"
                >
                  بحث
                </button>
                <button
                  onClick={resetFilters}
                  className="flex-1 bg-white border border-gray-200 text-gray-500 text-sm py-2 rounded-lg"
                >
                  إعادة تعيين
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* المحتوى */}
      <main className="max-w-3xl mx-auto px-4 py-5">
        {/* بانر علوي */}
        {topBanners.length > 0 && <BannerAd banners={topBanners} />}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-400 rounded-full spinner mb-3" />
            <p>جاري التحميل...</p>
          </div>
        ) : cars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Car size={64} color="#E5E7EB" />
            <p className="mt-4 text-base">لا توجد سيارات متاحة حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cars.map((car, idx) => {
              const showBottomBanner =
                (idx + 1) % 5 === 0 && bottomBanners.length > 0;
              return (
                <div key={car.id}>
                  <CarCard car={car} onClick={setSelectedCar} />
                  {showBottomBanner && (
                    <div className="mt-4 col-span-full">
                      <BannerAd banners={bottomBanners} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* بانر سفلي */}
        {!loading && bottomBanners.length > 0 && (
          <div className="mt-4">
            <BannerAd banners={bottomBanners} />
          </div>
        )}
      </main>

      {/* مودال تفاصيل السيارة */}
      {selectedCar && (
        <CarModal car={selectedCar} onClose={() => setSelectedCar(null)} />
      )}
    </div>
  );
}
