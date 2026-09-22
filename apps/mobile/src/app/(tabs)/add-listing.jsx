import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Animated,
  Modal,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/utils/auth/useAuth";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import useUpload from "@/utils/useUpload";
import { Image } from "expo-image";
import { X, Upload, Star, Info, ChevronDown } from "lucide-react-native";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

const GULF_CURRENCIES = [
  { code: "KWD", name: "دينار كويتي", flag: "🇰🇼", country: "الكويت" },
  { code: "SAR", name: "ريال سعودي", flag: "🇸🇦", country: "السعودية" },
  { code: "AED", name: "درهم إماراتي", flag: "🇦🇪", country: "الإمارات" },
  { code: "QAR", name: "ريال قطري", flag: "🇶🇦", country: "قطر" },
  { code: "BHD", name: "دينار بحريني", flag: "🇧🇭", country: "البحرين" },
  { code: "OMR", name: "ريال عُماني", flag: "🇴🇲", country: "عُمان" },
];

export default function AddListingPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth, signIn } = useAuth();
  const [upload, { loading: uploadLoading }] = useUpload();

  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    year: "",
    color: "",
    kilometers: "",
    description: "",
    price: "",
  });
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentSettings, setPaymentSettings] = useState([]);
  const [featuredPrice, setFeaturedPrice] = useState(null);
  const [featuredCurrency, setFeaturedCurrency] = useState("KWD");
  const [currency, setCurrency] = useState("KWD");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

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
        setFeaturedPrice(d.featured_price);
        setFeaturedCurrency(d.featured_currency || "KWD");
      })
      .catch(() => {});
  }, []);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const urls = [];
      for (const asset of result.assets) {
        const { url, error } = await upload({ reactNativeAsset: asset });
        if (url) urls.push(url);
        else console.error("Upload error:", error);
      }
      setImages((prev) => [...prev, ...urls]);
    }
  };

  const handleSubmit = async () => {
    if (!auth) {
      signIn();
      return;
    }
    if (
      !formData.brand ||
      !formData.model ||
      !formData.year ||
      !formData.color ||
      !formData.kilometers
    ) {
      Alert.alert("خطأ", "الرجاء ملء جميع الحقول المطلوبة *");
      return;
    }
    if (isFeatured && !selectedPayment) {
      Alert.alert("خطأ", "اختر طريقة الدفع للإعلان المميز");
      return;
    }
    if (isFeatured && !paymentReference) {
      Alert.alert("خطأ", "أدخل رقم مرجع الدفع بعد إرسال المبلغ");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          year: parseInt(formData.year),
          kilometers: parseInt(formData.kilometers),
          price: formData.price ? parseFloat(formData.price) : null,
          currency,
          images,
          is_featured: isFeatured,
          payment_method: isFeatured ? selectedPayment : null,
          payment_reference: isFeatured ? paymentReference : null,
          featured_price: isFeatured ? featuredPrice : null,
        }),
      });
      if (res.ok) {
        Alert.alert(
          "✅ تم الإرسال!",
          isFeatured
            ? "تم إرسال إعلانك! بعد مراجعة الإدارة وتأكيد الدفع سيُفعَّل الإعلان المميز."
            : "تم إرسال إعلانك! سيتم مراجعته قريباً.",
          [
            {
              text: "حسناً",
              onPress: () => {
                setFormData({
                  brand: "",
                  model: "",
                  year: "",
                  color: "",
                  kilometers: "",
                  description: "",
                  price: "",
                });
                setImages([]);
                setIsFeatured(false);
                setSelectedPayment(null);
                setPaymentReference("");
                router.push("/(tabs)/profile");
              },
            },
          ],
        );
      } else {
        Alert.alert("خطأ", "فشل إرسال الإعلان");
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
        <Text
          style={{
            fontSize: 14,
            color: "#6B7280",
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          سجل الدخول لإضافة إعلان مجاني
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
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: "#111827",
              textAlign: "right",
            }}
          >
            إضافة إعلان جديد
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#6B7280",
              marginTop: 4,
              textAlign: "right",
            }}
          >
            الإعلان العادي مجاني تماماً 🎉
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* صور */}
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
              📷 صور السيارة
            </Text>
            <Pressable
              onPress={pickImages}
              disabled={uploadLoading}
              style={{
                backgroundColor: "#F9FAFB",
                borderWidth: 1.5,
                borderColor: "#D1D5DB",
                borderRadius: 12,
                padding: 22,
                alignItems: "center",
                borderStyle: "dashed",
              }}
            >
              <Upload size={26} color="#9CA3AF" />
              <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 8 }}>
                {uploadLoading
                  ? "جاري رفع الصور..."
                  : "اضغط لإضافة صور (متعددة)"}
              </Text>
            </Pressable>
            {images.length > 0 && (
              <View
                style={{
                  flexDirection: "row-reverse",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                {images.map((img, i) => (
                  <View
                    key={i}
                    style={{ position: "relative", width: 82, height: 82 }}
                  >
                    <Image
                      source={{ uri: img }}
                      style={{ width: "100%", height: "100%", borderRadius: 8 }}
                      contentFit="cover"
                    />
                    <Pressable
                      onPress={() =>
                        setImages(images.filter((_, j) => j !== i))
                      }
                      style={{
                        position: "absolute",
                        top: 3,
                        right: 3,
                        backgroundColor: "#EF4444",
                        borderRadius: 999,
                        width: 20,
                        height: 20,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <X size={13} color="#FFF" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* بيانات السيارة */}
          <View style={{ gap: 13, marginBottom: 18 }}>
            {[
              {
                label: "الماركة *",
                key: "brand",
                placeholder: "مثال: تويوتا، هوندا، BMW",
              },
              {
                label: "الموديل *",
                key: "model",
                placeholder: "مثال: كامري، سيفيك، X5",
              },
              {
                label: "سنة الصنع *",
                key: "year",
                placeholder: "مثال: 2021",
                numeric: true,
              },
              {
                label: "اللون *",
                key: "color",
                placeholder: "مثال: أبيض، أسود، فضي",
              },
              {
                label: "عدد الكيلومترات *",
                key: "kilometers",
                placeholder: "مثال: 45000",
                numeric: true,
              },
            ].map((field) => (
              <View key={field.key}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: 5,
                    textAlign: "right",
                  }}
                >
                  {field.label}
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
                  placeholder={field.placeholder}
                  placeholderTextColor="#9CA3AF"
                  keyboardType={field.numeric ? "numeric" : "default"}
                  value={formData[field.key]}
                  onChangeText={(t) =>
                    setFormData((prev) => ({ ...prev, [field.key]: t }))
                  }
                  onFocus={() => animateTo(12)}
                  onBlur={() => animateTo(insets.bottom + 12)}
                />
              </View>
            ))}
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
                وصف السيارة (اختياري)
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
                  minHeight: 90,
                  color: "#111827",
                }}
                placeholder="الحالة، المواصفات، أسباب البيع..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={formData.description}
                onChangeText={(t) =>
                  setFormData((prev) => ({ ...prev, description: t }))
                }
                onFocus={() => animateTo(12)}
                onBlur={() => animateTo(insets.bottom + 12)}
              />
            </View>
          </View>

          {/* السعر والعملة */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#374151",
                marginBottom: 5,
                textAlign: "right",
              }}
            >
              السعر والعملة (اختياري)
            </Text>
            <View style={{ flexDirection: "row-reverse", gap: 8 }}>
              {/* منتقي العملة */}
              <Pressable
                onPress={() => setShowCurrencyPicker(true)}
                style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 6,
                  minWidth: 120,
                }}
              >
                <ChevronDown size={14} color="#6B7280" />
                <Text
                  style={{
                    fontSize: 13,
                    color: "#111827",
                    fontWeight: "700",
                  }}
                >
                  {GULF_CURRENCIES.find((c) => c.code === currency)?.flag}{" "}
                  {currency}
                </Text>
              </Pressable>
              {/* حقل السعر */}
              <TextInput
                style={{
                  flex: 1,
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
                placeholder="مثال: 3500"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={formData.price}
                onChangeText={(t) =>
                  setFormData((prev) => ({ ...prev, price: t }))
                }
                onFocus={() => animateTo(12)}
                onBlur={() => animateTo(insets.bottom + 12)}
              />
            </View>
            <Text
              style={{
                fontSize: 11,
                color: "#9CA3AF",
                textAlign: "right",
                marginTop: 5,
              }}
            >
              {GULF_CURRENCIES.find((c) => c.code === currency)?.flag}{" "}
              {GULF_CURRENCIES.find((c) => c.code === currency)?.name} —{" "}
              {GULF_CURRENCIES.find((c) => c.code === currency)?.country}
            </Text>
          </View>

          {/* Modal اختيار العملة */}
          <Modal visible={showCurrencyPicker} transparent animationType="slide">
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.5)",
                justifyContent: "flex-end",
              }}
            >
              <View
                style={{
                  backgroundColor: "#FFF",
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  paddingBottom: insets.bottom + 16,
                }}
              >
                <View
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: "700",
                      color: "#111827",
                      textAlign: "right",
                    }}
                  >
                    اختر عملة الدفع 💱
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#6B7280",
                      textAlign: "right",
                      marginTop: 2,
                    }}
                  >
                    جميع العملات الخليجية
                  </Text>
                </View>
                {GULF_CURRENCIES.map((curr) => (
                  <Pressable
                    key={curr.code}
                    onPress={() => {
                      setCurrency(curr.code);
                      setShowCurrencyPicker(false);
                    }}
                    style={{
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderColor: "#F3F4F6",
                      backgroundColor:
                        currency === curr.code ? "#EFF6FF" : "#FFF",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Text style={{ fontSize: 26 }}>{curr.flag}</Text>
                      <View>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "700",
                            color:
                              currency === curr.code ? "#2563EB" : "#111827",
                            textAlign: "right",
                          }}
                        >
                          {curr.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#6B7280",
                            textAlign: "right",
                          }}
                        >
                          {curr.country}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: "#6B7280",
                        }}
                      >
                        {curr.code}
                      </Text>
                      {currency === curr.code && (
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: "#2563EB",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: "#FFF",
                              fontSize: 13,
                              fontWeight: "700",
                            }}
                          >
                            ✓
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setShowCurrencyPicker(false)}
                  style={{
                    margin: 16,
                    backgroundColor: "#F3F4F6",
                    borderRadius: 10,
                    paddingVertical: 13,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#6B7280",
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    إغلاق
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          {/* الإعلان المميز */}
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                backgroundColor: "#FFF7ED",
                borderWidth: 1.5,
                borderColor: "#FDE68A",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <Pressable
                onPress={() => setIsFeatured(!isFeatured)}
                style={{
                  padding: 14,
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    gap: 10,
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: "#FEF3C7",
                      borderRadius: 8,
                      padding: 8,
                    }}
                  >
                    <Star
                      size={20}
                      color="#D97706"
                      fill={isFeatured ? "#D97706" : "none"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: "#92400E",
                        textAlign: "right",
                      }}
                    >
                      إعلان مميز ⭐
                      {featuredPrice !== null
                        ? ` — ${featuredPrice} ${featuredCurrency}`
                        : ""}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#B45309",
                        textAlign: "right",
                        marginTop: 2,
                      }}
                    >
                      يظهر في أعلى النتائج بشارة ذهبية
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    width: 46,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: isFeatured ? "#60A5FA" : "#D1D5DB",
                    justifyContent: "center",
                    paddingHorizontal: 2,
                    marginRight: 8,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: "#FFF",
                      alignSelf: isFeatured ? "flex-end" : "flex-start",
                    }}
                  />
                </View>
              </Pressable>

              {isFeatured && (
                <View
                  style={{ paddingHorizontal: 14, paddingBottom: 16, gap: 14 }}
                >
                  <View
                    style={{
                      backgroundColor: "#FFFBEB",
                      borderRadius: 10,
                      padding: 12,
                      flexDirection: "row-reverse",
                      gap: 8,
                    }}
                  >
                    <Info size={14} color="#B45309" />
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#B45309",
                        flex: 1,
                        textAlign: "right",
                        lineHeight: 18,
                      }}
                    >
                      {featuredPrice !== null
                        ? `أرسل ${featuredPrice} ${featuredCurrency} عبر الطريقة أدناه، ثم أدخل رقم المرجع. سيُفعَّل إعلانك بعد تأكيد الإدارة.`
                        : "أرسل المبلغ المطلوب عبر الطريقة أدناه، ثم أدخل رقم المرجع. سيُفعَّل إعلانك بعد تأكيد الإدارة."}
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
                    اختر طريقة الدفع:
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
                        style={{
                          fontSize: 12,
                          color: "#EF4444",
                          textAlign: "right",
                        }}
                      >
                        ⚠️ لم يتم إعداد طرق الدفع بعد. تواصل مع الإدارة.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {paymentSettings.map((method) => {
                        const isPayPal = method.method === "paypal";
                        const color = isPayPal ? "#0070E0" : "#F5A623";
                        const bg = isPayPal ? "#EFF8FF" : "#FFFBEB";
                        const label = isPayPal
                          ? "💳 باي بال"
                          : "🏦 ويسترن يونيون";
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
                                marginBottom: 8,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 15,
                                  fontWeight: "700",
                                  color,
                                }}
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
                                  fontWeight: "600",
                                }}
                              >
                                {method.instructions}
                              </Text>
                            ) : null}
                            {method.account_info ? (
                              <View
                                style={{
                                  backgroundColor: selected
                                    ? "#FFF"
                                    : "#F9FAFB",
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
                                  marginTop: 6,
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
                        borderColor: "#FDE68A",
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
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#B45309",
                        textAlign: "right",
                        marginTop: 5,
                      }}
                    >
                      * ستجده في إيصال الدفع أو تأكيد التحويل
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          <Animated.View style={{ paddingBottom: paddingAnimation }}>
            <Pressable
              onPress={handleSubmit}
              disabled={submitting || uploadLoading}
              style={{
                backgroundColor:
                  submitting || uploadLoading
                    ? "#9CA3AF"
                    : isFeatured
                      ? "#D97706"
                      : "#60A5FA",
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
                flexDirection: "row-reverse",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {isFeatured && !submitting && (
                <Star size={18} color="#FFF" fill="#FFF" />
              )}
              <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "700" }}>
                {submitting
                  ? "جاري الإرسال..."
                  : isFeatured
                    ? featuredPrice !== null
                      ? `إرسال إعلان مميز — ${featuredPrice} ${featuredCurrency}`
                      : "إرسال إعلان مميز ⭐"
                    : "إرسال الإعلان مجاناً 🎉"}
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
