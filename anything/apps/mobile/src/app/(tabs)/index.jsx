import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
} from "react-native";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Search, Filter, Car, Star } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

const GULF_CURRENCIES = {
  KWD: { name: "دينار كويتي", flag: "🇰🇼" },
  SAR: { name: "ريال سعودي", flag: "🇸🇦" },
  AED: { name: "درهم إماراتي", flag: "🇦🇪" },
  QAR: { name: "ريال قطري", flag: "🇶🇦" },
  BHD: { name: "دينار بحريني", flag: "🇧🇭" },
  OMR: { name: "ريال عُماني", flag: "🇴🇲" },
};

function BannerAd({ banners, index }) {
  if (!banners || banners.length === 0) return null;
  const banner = banners[index % banners.length];
  return (
    <Pressable
      onPress={() =>
        banner.link_url && Linking.openURL(banner.link_url).catch(() => {})
      }
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <Image
        source={{ uri: banner.image_url }}
        style={{ width: "100%", height: 90 }}
        contentFit="cover"
      />
      <View
        style={{
          position: "absolute",
          top: 6,
          right: 8,
          backgroundColor: "rgba(0,0,0,0.45)",
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}
      >
        <Text style={{ fontSize: 10, color: "#FFF", fontWeight: "700" }}>
          إعلان
        </Text>
      </View>
      {banners.length > 1 && (
        <View
          style={{
            position: "absolute",
            bottom: 6,
            left: 0,
            right: 0,
            flexDirection: "row",
            justifyContent: "center",
            gap: 4,
          }}
        >
          {banners.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === index % banners.length ? 14 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  i === index % banners.length
                    ? "#FFF"
                    : "rgba(255,255,255,0.45)",
              }}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

export default function HomePage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    brand: "",
    year: "",
    color: "",
    maxKilometers: "",
  });
  const [topBanners, setTopBanners] = useState([]);
  const [bottomBanners, setBottomBanners] = useState([]);
  const [topIdx, setTopIdx] = useState(0);
  const [botIdx, setBotIdx] = useState(0);

  useEffect(() => {
    fetchCars();
    fetchBanners();
  }, []);

  useEffect(() => {
    if (topBanners.length <= 1) return;
    const t = setInterval(
      () => setTopIdx((i) => (i + 1) % topBanners.length),
      4000,
    );
    return () => clearInterval(t);
  }, [topBanners]);

  useEffect(() => {
    if (bottomBanners.length <= 1) return;
    const t = setInterval(
      () => setBotIdx((i) => (i + 1) % bottomBanners.length),
      5000,
    );
    return () => clearInterval(t);
  }, [bottomBanners]);

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

  const fetchCars = async () => {
    try {
      setLoading(true);
      let url = "/api/cars?status=approved";
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (filters.brand) url += `&brand=${encodeURIComponent(filters.brand)}`;
      if (filters.year) url += `&year=${filters.year}`;
      if (filters.color) url += `&color=${encodeURIComponent(filters.color)}`;
      if (filters.maxKilometers)
        url += `&maxKilometers=${filters.maxKilometers}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCars(data.cars || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({ brand: "", year: "", color: "", maxKilometers: "" });
    setSearchQuery("");
    setShowFilters(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar style="dark" />

      <View
        style={{
          paddingTop: insets.top + 14,
          paddingHorizontal: 16,
          paddingBottom: 14,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <Text
          style={{
            fontSize: 26,
            fontWeight: "700",
            color: "#111827",
            marginBottom: 12,
            textAlign: "right",
          }}
        >
          🚗 سوق السيارات
        </Text>
        <View style={{ flexDirection: "row-reverse", gap: 8 }}>
          <View
            style={{
              flex: 1,
              flexDirection: "row-reverse",
              alignItems: "center",
              backgroundColor: "#F9FAFB",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={{
                flex: 1,
                fontSize: 14,
                color: "#111827",
                marginRight: 8,
                textAlign: "right",
              }}
              placeholder="ابحث عن ماركة، موديل..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={fetchCars}
              returnKeyType="search"
            />
          </View>
          <Pressable
            onPress={() => setShowFilters(!showFilters)}
            style={{
              backgroundColor: showFilters ? "#60A5FA" : "#F9FAFB",
              borderWidth: 1,
              borderColor: showFilters ? "#60A5FA" : "#E5E7EB",
              borderRadius: 10,
              padding: 10,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Filter size={18} color={showFilters ? "#FFF" : "#6B7280"} />
          </Pressable>
        </View>

        {showFilters && (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              backgroundColor: "#F9FAFB",
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              gap: 8,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#111827",
                textAlign: "right",
              }}
            >
              🔍 تصفية متقدمة
            </Text>
            {[
              { placeholder: "الماركة (تويوتا، هوندا...)", key: "brand" },
              { placeholder: "السنة (2020)", key: "year", numeric: true },
              { placeholder: "اللون (أبيض، أسود...)", key: "color" },
              {
                placeholder: "أقصى كيلومترات",
                key: "maxKilometers",
                numeric: true,
              },
            ].map((f) => (
              <TextInput
                key={f.key}
                style={{
                  backgroundColor: "#FFF",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  fontSize: 13,
                  textAlign: "right",
                }}
                placeholder={f.placeholder}
                placeholderTextColor="#9CA3AF"
                keyboardType={f.numeric ? "numeric" : "default"}
                value={filters[f.key]}
                onChangeText={(t) =>
                  setFilters((prev) => ({ ...prev, [f.key]: t }))
                }
              />
            ))}
            <View
              style={{ flexDirection: "row-reverse", gap: 8, marginTop: 2 }}
            >
              <Pressable
                onPress={fetchCars}
                style={{
                  flex: 1,
                  backgroundColor: "#60A5FA",
                  borderRadius: 8,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#FFF", fontSize: 13, fontWeight: "700" }}
                >
                  بحث
                </Text>
              </Pressable>
              <Pressable
                onPress={resetFilters}
                style={{
                  flex: 1,
                  backgroundColor: "#FFF",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 8,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#6B7280", fontSize: 13, fontWeight: "600" }}
                >
                  إعادة تعيين
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingVertical: 14,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* بانر علوي */}
        <BannerAd banners={topBanners} index={topIdx} />

        <View style={{ paddingHorizontal: 16 }}>
          {loading ? (
            <Text
              style={{ textAlign: "center", color: "#6B7280", marginTop: 40 }}
            >
              جاري التحميل...
            </Text>
          ) : cars.length === 0 ? (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Car size={64} color="#E5E7EB" />
              <Text
                style={{
                  color: "#6B7280",
                  fontSize: 16,
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                لا توجد سيارات متاحة حالياً
              </Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {cars.map((car, idx) => (
                <View key={car.id}>
                  <Pressable
                    onPress={() => router.push(`/car/${car.id}`)}
                    style={{
                      backgroundColor: "#FFF",
                      borderRadius: 14,
                      borderWidth: car.is_featured ? 2 : 1,
                      borderColor: car.is_featured ? "#F59E0B" : "#E5E7EB",
                      overflow: "hidden",
                    }}
                  >
                    {car.is_featured && (
                      <View
                        style={{
                          backgroundColor: "#FEF3C7",
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                          flexDirection: "row-reverse",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <Star size={12} color="#D97706" fill="#D97706" />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: "#D97706",
                          }}
                        >
                          إعلان مميز
                        </Text>
                      </View>
                    )}
                    {car.images && car.images.length > 0 ? (
                      <Image
                        source={{ uri: car.images[0] }}
                        style={{ width: "100%", height: 190 }}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: "100%",
                          height: 190,
                          backgroundColor: "#F3F4F6",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Car size={48} color="#E5E7EB" />
                      </View>
                    )}
                    <View style={{ padding: 12 }}>
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: "700",
                          color: "#111827",
                          textAlign: "right",
                          marginBottom: 8,
                        }}
                      >
                        {car.brand} {car.model}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row-reverse",
                          flexWrap: "wrap",
                          gap: 6,
                        }}
                      >
                        {[
                          car.year,
                          `${(car.kilometers || 0).toLocaleString()} كم`,
                          car.color,
                        ].map((tag, i) => (
                          <View
                            key={i}
                            style={{
                              backgroundColor: "#F3F4F6",
                              borderRadius: 999,
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                            }}
                          >
                            <Text style={{ fontSize: 12, color: "#6B7280" }}>
                              {tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                      {car.price && (
                        <Text
                          style={{
                            fontSize: 17,
                            fontWeight: "700",
                            color: "#60A5FA",
                            textAlign: "right",
                            marginTop: 8,
                          }}
                        >
                          {GULF_CURRENCIES[car.currency || "KWD"]?.flag}{" "}
                          {parseFloat(car.price).toLocaleString()}{" "}
                          {car.currency || "KWD"}
                        </Text>
                      )}
                    </View>
                  </Pressable>

                  {/* بانر سفلي كل 5 سيارات */}
                  {(idx + 1) % 5 === 0 && bottomBanners.length > 0 && (
                    <View style={{ marginTop: 14 }}>
                      <BannerAd banners={bottomBanners} index={botIdx} />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* بانر سفلي في نهاية القائمة */}
        {!loading && bottomBanners.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <BannerAd banners={bottomBanners} index={botIdx} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
