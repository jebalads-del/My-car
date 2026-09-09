import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Animated,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/utils/auth/useAuth";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import useUpload from "@/utils/useUpload";
import { Image } from "expo-image";
import { X, Upload, Info, ArrowRight } from "lucide-react-native";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

export default function RequestBannerPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth, signIn } = useAuth();
  const [upload, { loading: uploadLoading }] = useUpload();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [position, setPosition] = useState("top");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentSettings, setPaymentSettings] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [bannerPrice, setBannerPrice] = useState(null);
  const [bannerCurrency, setBannerCurrency] = useState("KWD");

  const paddingAnimation = useRef(
    new Animated.Value(insets.bottom + 12),
  ).current;
  const animateTo = (v) =>
    Animated.timing(paddingAnimation, {
      toValue: v,
      duration: 200,
      useNativeDriver: false,
    }).start();

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) =>
        setPaymentSettings((d.settings || []).filter((s) => s.is_active)),
      )
      .catch(() => {});

    fetch("/api/admin/pricing")
      .then((r) => r.json())
      .then((d) => {
        setBannerPrice(d.banner_price);
        setBannerCurrency(d.banner_currency || "KWD");
      })
      .catch(() => {});
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      const { url, error } = await upload({
        reactNativeAsset: result.assets[0],
      });
      if (url) setImageUrl(url);
      else console.error("Upload error:", error);
    }
  };

  const handleSubmit = async () => {
    if (!auth) {
      signIn();
      return;
    }
    if (!title || !imageUrl) {
      Alert.alert("خطأ", "العنوان والصورة مطلوبان");
      return;
    }
    if (!selectedPayment) {
      Alert.alert("خطأ", "اختر طريقة الدفع");
      return;
    }
    if (!paymentReference) {
      Alert.alert("خطأ", "أدخل رقم مرجع الدفع");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          image_url: imageUrl,
          link_url: linkUrl,
          position,
          payment_method: selectedPayment,
          payment_reference: paymentReference,
          price: bannerPrice,
        }),
      });
      if (res.ok) {
        Alert.alert(
          "✅ تم الإرسال!",
          "تم إرسال طلب البانر! سيتم مراجعته من الإدارة وتفعيله بعد تأكيد الدفع.",
          [{ text: "حسناً", onPress: () => router.back() }],
        );
      } else {
        Alert.alert("خطأ", "فشل إرسال الطلب");
      }
    } catch {
      Alert.alert("خطأ", "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  };

  if (!auth) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFF",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <StatusBar style="dark" />
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: "#111827",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          تسجيل الدخول مطلوب
        </Text>
        <Pressable
          onPress={signIn}
          style={{
            backgroundColor: "#60A5FA",
            borderRadius: 10,
            paddingHorizontal: 32,
            paddingVertical: 14,
          }}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>
            تسجيل الدخول
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
      <View style={{ flex: 1, backgroundColor: "#FFF" }}>
        <StatusBar style="dark" />
        <View
          style={{
            paddingTop: insets.top + 14,
            paddingHorizontal: 16,
            paddingBottom: 14,
            backgroundColor: "#FFF",
            borderBottomWidth: 1,
            borderColor: "#E5E7EB",
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Pressable onPress={() => router.back()}>
            <ArrowRight size={22} color="#111827" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#111827",
                textAlign: "right",
              }}
            >
              📢 طلب بانر إعلاني
            </Text>
            <Text
              style={{ fontSize: 12, color: "#6B7280", textAlign: "right" }}
            >
              {bannerPrice !== null
                ? `سعر البانر: ${bannerPrice} ${bannerCurrency} لمدة 30 يوم`
                : "جاري تحميل السعر..."}
            </Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* صورة البانر */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#374151",
                marginBottom: 8,
                textAlign: "right",
              }}
            >
              🖼️ صورة البانر الإعلاني *
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: "#6B7280",
                textAlign: "right",
                marginBottom: 10,
              }}
            >
              يُنصح بأبعاد 800×200 بكسل أو نسبة 4:1
            </Text>
            {imageUrl ? (
              <View
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: "100%", height: 90 }}
                  contentFit="cover"
                />
                <Pressable
                  onPress={() => setImageUrl("")}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    backgroundColor: "#EF4444",
                    borderRadius: 999,
                    width: 24,
                    height: 24,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <X size={15} color="#FFF" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={pickImage}
                disabled={uploadLoading}
                style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1.5,
                  borderColor: "#D1D5DB",
                  borderRadius: 12,
                  padding: 28,
                  alignItems: "center",
                  borderStyle: "dashed",
                }}
              >
                <Upload size={28} color="#9CA3AF" />
                <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 8 }}>
                  {uploadLoading ? "جاري الرفع..." : "اضغط لرفع صورة البانر"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* بيانات البانر */}
          <View style={{ gap: 13, marginBottom: 18 }}>
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 5,
                  textAlign: "right",
                }}
              >
                عنوان الإعلان *
              </Text>
              <TextInput
                style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  fontSize: 14,
                  textAlign: "right",
                  color: "#111827",
                }}
                placeholder="مثال: تخفيضات حصرية على السيارات..."
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
                onFocus={() => animateTo(12)}
                onBlur={() => animateTo(insets.bottom + 12)}
              />
            </View>
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 5,
                  textAlign: "right",
                }}
              >
                وصف الإعلان (اختياري)
              </Text>
              <TextInput
                style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  fontSize: 14,
                  textAlign: "right",
                  minHeight: 70,
                  color: "#111827",
                }}
                placeholder="تفاصيل إضافية عن الإعلان..."
                placeholderTextColor="#9CA3AF"
                multiline
                value={description}
                onChangeText={setDescription}
                onFocus={() => animateTo(12)}
                onBlur={() => animateTo(insets.bottom + 12)}
              />
            </View>
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 5,
                  textAlign: "right",
                }}
              >
                رابط الموقع / واتساب (اختياري)
              </Text>
              <TextInput
                style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  fontSize: 14,
                  textAlign: "right",
                  color: "#111827",
                }}
                placeholder="https://example.com أو رقم واتساب"
                placeholderTextColor="#9CA3AF"
                value={linkUrl}
                onChangeText={setLinkUrl}
                onFocus={() => animateTo(12)}
                onBlur={() => animateTo(insets.bottom + 12)}
              />
            </View>

            {/* موقع البانر */}
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 8,
                  textAlign: "right",
                }}
              >
                موقع البانر
              </Text>
              <View style={{ flexDirection: "row-reverse", gap: 10 }}>
                {[
                  { key: "top", label: "📍 أعلى الصفحة" },
                  { key: "bottom", label: "📍 أسفل الصفحة" },
                ].map((p) => (
                  <Pressable
                    key={p.key}
                    onPress={() => setPosition(p.key)}
                    style={{
                      flex: 1,
                      backgroundColor:
                        position === p.key ? "#EFF6FF" : "#F9FAFB",
                      borderWidth: 2,
                      borderColor: position === p.key ? "#60A5FA" : "#E5E7EB",
                      borderRadius: 10,
                      paddingVertical: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: position === p.key ? "#2563EB" : "#6B7280",
                      }}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* الدفع */}
          <View
            style={{
              marginBottom: 24,
              backgroundColor: "#F9FAFB",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 14,
              padding: 16,
              gap: 14,
            }}
          >
            <View style={{ flexDirection: "row-reverse", gap: 8 }}>
              <Info size={15} color="#6B7280" />
              <Text
                style={{
                  fontSize: 12,
                  color: "#6B7280",
                  flex: 1,
                  textAlign: "right",
                  lineHeight: 18,
                }}
              >
                أرسل{" "}
                {bannerPrice !== null
                  ? `${bannerPrice} ${bannerCurrency}`
                  : "المبلغ"}{" "}
                عبر إحدى الطرق أدناه، ثم أدخل رقم المرجع. سيُفعَّل البانر بعد
                مراجعة الإدارة وتأكيد الدفع.
              </Text>
            </View>

            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#374151",
                textAlign: "right",
              }}
            >
              اختر طريقة الدفع *
            </Text>

            {paymentSettings.length === 0 ? (
              <View
                style={{
                  backgroundColor: "#FEF2F2",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <Text
                  style={{ fontSize: 12, color: "#EF4444", textAlign: "right" }}
                >
                  ⚠️ لم يتم إعداد طرق الدفع. تواصل مع الإدارة.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {paymentSettings.map((method) => {
                  const isPayPal = method.method === "paypal";
                  const color = isPayPal ? "#0070E0" : "#F5A623";
                  const bg = isPayPal ? "#EFF8FF" : "#FFFBEB";
                  const label = isPayPal ? "💳 باي بال" : "🏦 ويسترن يونيون";
                  const selected = selectedPayment === method.method;
                  return (
                    <Pressable
                      key={method.method}
                      onPress={() => setSelectedPayment(method.method)}
                      style={{
                        backgroundColor: selected ? bg : "#FFF",
                        borderWidth: 2,
                        borderColor: selected ? color : "#E5E7EB",
                        borderRadius: 12,
                        padding: 14,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row-reverse",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <Text
                          style={{ fontSize: 15, fontWeight: "700", color }}
                        >
                          {label}
                        </Text>
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: selected ? color : "#D1D5DB",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          {selected && (
                            <View
                              style={{
                                width: 11,
                                height: 11,
                                borderRadius: 6,
                                backgroundColor: color,
                              }}
                            />
                          )}
                        </View>
                      </View>
                      {method.instructions ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#374151",
                            textAlign: "right",
                            marginBottom: 6,
                          }}
                        >
                          {method.instructions}
                        </Text>
                      ) : null}
                      {method.account_info ? (
                        <View
                          style={{
                            backgroundColor: selected ? "#FFF" : "#F9FAFB",
                            borderRadius: 8,
                            padding: 10,
                            borderWidth: 1,
                            borderColor: selected ? color : "#E5E7EB",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              color,
                              fontWeight: "700",
                              textAlign: "right",
                            }}
                          >
                            {method.account_info}
                          </Text>
                        </View>
                      ) : null}
                      {method.extra_info ? (
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#9CA3AF",
                            textAlign: "right",
                            marginTop: 5,
                          }}
                        >
                          * {method.extra_info}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: "#374151",
                  marginBottom: 8,
                  textAlign: "right",
                }}
              >
                رقم مرجع الدفع / Transaction ID *
              </Text>
              <TextInput
                style={{
                  backgroundColor: "#FFF",
                  borderWidth: 1.5,
                  borderColor: "#60A5FA",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  textAlign: "right",
                  color: "#111827",
                }}
                placeholder="أدخل رقم المرجع من إيصال الدفع"
                placeholderTextColor="#9CA3AF"
                value={paymentReference}
                onChangeText={setPaymentReference}
                onFocus={() => animateTo(12)}
                onBlur={() => animateTo(insets.bottom + 12)}
              />
            </View>
          </View>

          <Animated.View style={{ paddingBottom: paddingAnimation }}>
            <Pressable
              onPress={handleSubmit}
              disabled={submitting || uploadLoading}
              style={{
                backgroundColor:
                  submitting || uploadLoading ? "#9CA3AF" : "#60A5FA",
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "700" }}>
                {submitting
                  ? "جاري الإرسال..."
                  : bannerPrice !== null
                    ? `إرسال طلب البانر — ${bannerPrice} ${bannerCurrency}`
                    : "إرسال طلب البانر"}
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
