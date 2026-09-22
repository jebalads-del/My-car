import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/utils/auth/useAuth";
import {
  LogOut,
  Car,
  Clock,
  CheckCircle,
  XCircle,
  Megaphone,
} from "lucide-react-native";
import { useRouter } from "expo-router";

const GULF_CURRENCIES = {
  KWD: { name: "دينار كويتي", flag: "🇰🇼" },
  SAR: { name: "ريال سعودي", flag: "🇸🇦" },
  AED: { name: "درهم إماراتي", flag: "🇦🇪" },
  QAR: { name: "ريال قطري", flag: "🇶🇦" },
  BHD: { name: "دينار بحريني", flag: "🇧🇭" },
  OMR: { name: "ريال عُماني", flag: "🇴🇲" },
};

export default function ProfilePage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth, signIn, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth) {
      fetchProfile();
      fetchMyListings();
    } else {
      setLoading(false);
    }
  }, [auth]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cars/my-listings");
      if (res.ok) {
        const data = await res.json();
        setMyListings(data.cars || []);
      }
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert("تسجيل الخروج", "هل أنت متأكد من تسجيل الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تسجيل الخروج",
        onPress: async () => {
          await signOut();
          setProfile(null);
          setMyListings([]);
        },
      },
    ]);
  };

  const handleDeleteListing = async (id) => {
    Alert.alert("حذف الإعلان", "هل أنت متأكد من حذف هذا الإعلان؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`/api/cars/${id}`, { method: "DELETE" });
            if (res.ok) {
              Alert.alert("نجح", "تم حذف الإعلان بنجاح");
              fetchMyListings();
            }
          } catch (error) {
            console.error("Error deleting:", error);
          }
        },
      },
    ]);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
        return <CheckCircle size={16} color="#10B981" />;
      case "rejected":
        return <XCircle size={16} color="#EF4444" />;
      default:
        return <Clock size={16} color="#F59E0B" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "approved":
        return "مقبول";
      case "rejected":
        return "مرفوض";
      default:
        return "قيد المراجعة";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "#D1FAE5";
      case "rejected":
        return "#FEE2E2";
      default:
        return "#FEF3C7";
    }
  };

  if (!auth) {
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
        <Text
          style={{
            fontSize: 24,
            fontWeight: "600",
            color: "#111827",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          مرحباً بك
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#6B7280",
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          سجل الدخول لعرض ملفك الشخصي وإعلاناتك
        </Text>
        <Pressable
          onPress={signIn}
          style={{
            backgroundColor: "#60A5FA",
            borderRadius: 8,
            paddingHorizontal: 32,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
            تسجيل الدخول
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <View
          style={{
            flexDirection: "row-reverse",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "600",
                color: "#111827",
                textAlign: "right",
              }}
            >
              {profile?.name || "المستخدم"}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#6B7280",
                marginTop: 2,
                textAlign: "right",
              }}
            >
              {profile?.email}
            </Text>
            {profile?.role === "admin" && (
              <View
                style={{
                  backgroundColor: "#DBEAFE",
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  marginTop: 8,
                  alignSelf: "flex-end",
                }}
              >
                <Text
                  style={{ fontSize: 12, color: "#2563EB", fontWeight: "600" }}
                >
                  مدير
                </Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={handleSignOut}
            style={{ backgroundColor: "#FEE2E2", borderRadius: 8, padding: 10 }}
          >
            <LogOut size={20} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      {/* زر طلب البانر الإعلاني */}
      <Pressable
        onPress={() => router.push("/request-banner")}
        style={{
          marginHorizontal: 16,
          marginTop: 14,
          marginBottom: 4,
          backgroundColor: "#EFF6FF",
          borderWidth: 1,
          borderColor: "#BFDBFE",
          borderRadius: 12,
          padding: 14,
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View
          style={{ backgroundColor: "#DBEAFE", borderRadius: 8, padding: 8 }}
        >
          <Megaphone size={20} color="#2563EB" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#1D4ED8",
              textAlign: "right",
            }}
          >
            📢 طلب بانر إعلاني
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: "#3B82F6",
              textAlign: "right",
              marginTop: 2,
            }}
          >
            أعلن عن نشاطك في أعلى وأسفل التطبيق
          </Text>
        </View>
      </Pressable>

      {/* My Listings */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 16,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: "#111827",
            marginBottom: 12,
            textAlign: "right",
          }}
        >
          إعلاناتي ({myListings.length})
        </Text>

        {loading ? (
          <Text
            style={{ textAlign: "center", color: "#6B7280", marginTop: 20 }}
          >
            جاري التحميل...
          </Text>
        ) : myListings.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Car size={64} color="#E5E7EB" />
            <Text
              style={{
                color: "#6B7280",
                fontSize: 16,
                marginTop: 16,
                textAlign: "center",
              }}
            >
              لا توجد إعلانات بعد
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/add-listing")}
              style={{
                backgroundColor: "#60A5FA",
                borderRadius: 8,
                paddingHorizontal: 24,
                paddingVertical: 10,
                marginTop: 16,
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}
              >
                أضف إعلانك الأول
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {myListings.map((car) => (
              <Pressable
                key={car.id}
                onPress={() => router.push(`/car/${car.id}`)}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  padding: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row-reverse",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#111827",
                      textAlign: "right",
                      flex: 1,
                    }}
                  >
                    {car.brand} {car.model}
                  </Text>
                  <View
                    style={{
                      backgroundColor: getStatusColor(car.status),
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {getStatusIcon(car.status)}
                    <Text style={{ fontSize: 12, fontWeight: "500" }}>
                      {getStatusText(car.status)}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: "row-reverse",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: "#F9FAFB",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>
                      {car.year}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: "#F9FAFB",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>
                      {car.kilometers.toLocaleString("ar-EG")} كم
                    </Text>
                  </View>
                </View>

                {car.price && (
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: "#60A5FA",
                      textAlign: "right",
                      marginBottom: 4,
                    }}
                  >
                    {GULF_CURRENCIES[car.currency || "KWD"]?.flag}{" "}
                    {parseFloat(car.price).toLocaleString()}{" "}
                    {car.currency || "KWD"}
                  </Text>
                )}

                <Pressable
                  onPress={() => handleDeleteListing(car.id)}
                  style={{
                    backgroundColor: "#FEE2E2",
                    borderRadius: 8,
                    paddingVertical: 8,
                    alignItems: "center",
                    marginTop: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#EF4444",
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    حذف الإعلان
                  </Text>
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
