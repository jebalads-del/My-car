import { View, Text, ScrollView, Pressable, Dimensions } from "react-native";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowRight,
  Car,
  Calendar,
  Palette,
  Gauge,
  User,
  Phone,
  Mail,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

const GULF_CURRENCIES = {
  KWD: { name: "دينار كويتي", flag: "🇰🇼" },
  SAR: { name: "ريال سعودي", flag: "🇸🇦" },
  AED: { name: "درهم إماراتي", flag: "🇦🇪" },
  QAR: { name: "ريال قطري", flag: "🇶🇦" },
  BHD: { name: "دينار بحريني", flag: "🇧🇭" },
  OMR: { name: "ريال عُماني", flag: "🇴🇲" },
};

export default function CarDetailPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchCarDetails();
  }, [id]);

  const fetchCarDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cars/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCar(data.car);
      }
    } catch (error) {
      console.error("Error fetching car details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFFFFF",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <StatusBar style="dark" />
        <Text style={{ color: "#6B7280" }}>جاري التحميل...</Text>
      </View>
    );
  }

  if (!car) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFFFFF",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <StatusBar style="dark" />
        <Car size={64} color="#E5E7EB" />
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: "#111827",
            marginTop: 16,
            textAlign: "center",
          }}
        >
          لم يتم العثور على السيارة
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            backgroundColor: "#60A5FA",
            borderRadius: 8,
            paddingHorizontal: 24,
            paddingVertical: 10,
            marginTop: 16,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
            العودة
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar style="dark" />

      {/* Back Button */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 12,
          right: 16,
          zIndex: 10,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderRadius: 999,
            width: 40,
            height: 40,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <ArrowRight size={20} color="#111827" />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Images Carousel */}
        {car.images && car.images.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentImageIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {car.images.map((img, index) => (
                <ExpoImage
                  key={index}
                  source={{ uri: img }}
                  style={{ width, height: 300 }}
                  contentFit="cover"
                />
              ))}
            </ScrollView>

            {/* Image Indicator */}
            <View
              style={{
                position: "absolute",
                bottom: 16,
                left: 0,
                right: 0,
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {car.images.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: currentImageIndex === index ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      currentImageIndex === index
                        ? "#60A5FA"
                        : "rgba(255, 255, 255, 0.6)",
                  }}
                />
              ))}
            </View>
          </View>
        ) : (
          <View
            style={{
              width,
              height: 300,
              backgroundColor: "#F9FAFB",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Car size={64} color="#E5E7EB" />
          </View>
        )}

        {/* Car Info */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          {/* Title and Price */}
          <View
            style={{
              flexDirection: "row-reverse",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "600",
                  color: "#111827",
                  textAlign: "right",
                  marginBottom: 4,
                }}
              >
                {car.brand} {car.model}
              </Text>
              <Text
                style={{ fontSize: 14, color: "#6B7280", textAlign: "right" }}
              >
                موديل {car.year}
              </Text>
            </View>
            {car.price && (
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{ fontSize: 24, fontWeight: "700", color: "#60A5FA" }}
                >
                  {parseFloat(car.price).toLocaleString()}{" "}
                  {car.currency || "KWD"}
                </Text>
                {car.currency && GULF_CURRENCIES[car.currency] && (
                  <Text
                    style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}
                  >
                    {GULF_CURRENCIES[car.currency].flag}{" "}
                    {GULF_CURRENCIES[car.currency].name}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Specs */}
          <View
            style={{
              backgroundColor: "#F9FAFB",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#111827",
                marginBottom: 12,
                textAlign: "right",
              }}
            >
              المواصفات
            </Text>

            <View style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 8,
                    padding: 8,
                  }}
                >
                  <Calendar size={20} color="#60A5FA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#6B7280",
                      textAlign: "right",
                    }}
                  >
                    السنة
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#111827",
                      textAlign: "right",
                    }}
                  >
                    {car.year}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 8,
                    padding: 8,
                  }}
                >
                  <Gauge size={20} color="#60A5FA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#6B7280",
                      textAlign: "right",
                    }}
                  >
                    الكيلومترات
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#111827",
                      textAlign: "right",
                    }}
                  >
                    {car.kilometers.toLocaleString("ar-EG")} كم
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 8,
                    padding: 8,
                  }}
                >
                  <Palette size={20} color="#60A5FA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#6B7280",
                      textAlign: "right",
                    }}
                  >
                    اللون
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#111827",
                      textAlign: "right",
                    }}
                  >
                    {car.color}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Description */}
          {car.description && (
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: 8,
                  textAlign: "right",
                }}
              >
                الوصف
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6B7280",
                  lineHeight: 22,
                  textAlign: "right",
                }}
              >
                {car.description}
              </Text>
            </View>
          )}

          {/* Seller Info */}
          <View
            style={{
              backgroundColor: "#F9FAFB",
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#111827",
                marginBottom: 12,
                textAlign: "right",
              }}
            >
              معلومات البائع
            </Text>

            <View style={{ gap: 10 }}>
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <User size={18} color="#6B7280" />
                <Text
                  style={{ fontSize: 14, color: "#111827", textAlign: "right" }}
                >
                  {car.user_name || "بدون اسم"}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Mail size={18} color="#6B7280" />
                <Text
                  style={{ fontSize: 14, color: "#60A5FA", textAlign: "right" }}
                >
                  {car.user_email}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
