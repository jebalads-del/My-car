import { View, Text, TextInput, Pressable, Modal, Alert } from "react-native";
import { useState } from "react";
import { PaymentSettingCard } from "@/components/Admin/PaymentSettingCard";
import { DollarSign, ChevronDown } from "lucide-react-native";

const GULF_CURRENCIES = [
  { code: "KWD", flag: "🇰🇼", name: "دينار كويتي" },
  { code: "SAR", flag: "🇸🇦", name: "ريال سعودي" },
  { code: "AED", flag: "🇦🇪", name: "درهم إماراتي" },
  { code: "QAR", flag: "🇶🇦", name: "ريال قطري" },
  { code: "BHD", flag: "🇧🇭", name: "دينار بحريني" },
  { code: "OMR", flag: "🇴🇲", name: "ريال عُماني" },
];

export function SettingsTab({
  paymentSettings,
  onEdit,
  pricing,
  onSavePricing,
}) {
  const [localPricing, setLocalPricing] = useState(
    pricing || {
      banner_price: "9",
      banner_currency: "KWD",
      featured_price: "5",
      featured_currency: "KWD",
    },
  );
  const [currencyModal, setCurrencyModal] = useState({
    visible: false,
    field: null,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!localPricing.banner_price || !localPricing.featured_price) {
      Alert.alert("خطأ", "أدخل الأسعار صحيحة");
      return;
    }
    setSaving(true);
    await onSavePricing(localPricing);
    setSaving(false);
  };

  const selectedBannerCurr = GULF_CURRENCIES.find(
    (c) => c.code === localPricing.banner_currency,
  );
  const selectedFeaturedCurr = GULF_CURRENCIES.find(
    (c) => c.code === localPricing.featured_currency,
  );

  return (
    <View style={{ gap: 12 }}>
      {/* قسم إعداد الأسعار */}
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: "#111827",
          textAlign: "right",
        }}
      >
        💰 إعداد الأسعار
      </Text>

      <View
        style={{
          backgroundColor: "#FFF",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          padding: 16,
          gap: 16,
        }}
      >
        {/* سعر الإعلان المميز */}
        <View>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: "#374151",
              textAlign: "right",
              marginBottom: 6,
            }}
          >
            ⭐ سعر الإعلان المميز
          </Text>
          <View style={{ flexDirection: "row-reverse", gap: 8 }}>
            <Pressable
              onPress={() =>
                setCurrencyModal({ visible: true, field: "featured_currency" })
              }
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
                minWidth: 110,
              }}
            >
              <ChevronDown size={13} color="#6B7280" />
              <Text
                style={{ fontSize: 13, fontWeight: "700", color: "#111827" }}
              >
                {selectedFeaturedCurr?.flag} {localPricing.featured_currency}
              </Text>
            </Pressable>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 11,
                fontSize: 16,
                fontWeight: "700",
                textAlign: "right",
                color: "#111827",
              }}
              placeholder="مثال: 5"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={localPricing.featured_price}
              onChangeText={(t) =>
                setLocalPricing((prev) => ({ ...prev, featured_price: t }))
              }
            />
          </View>
          <Text
            style={{
              fontSize: 11,
              color: "#9CA3AF",
              textAlign: "right",
              marginTop: 4,
            }}
          >
            {selectedFeaturedCurr?.flag} {selectedFeaturedCurr?.name} — يظهر هذا
            للمستخدم عند اختيار الإعلان المميز
          </Text>
        </View>

        {/* فاصل */}
        <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />

        {/* سعر البانر الإعلاني */}
        <View>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: "#374151",
              textAlign: "right",
              marginBottom: 6,
            }}
          >
            📢 سعر البانر الإعلاني
          </Text>
          <View style={{ flexDirection: "row-reverse", gap: 8 }}>
            <Pressable
              onPress={() =>
                setCurrencyModal({ visible: true, field: "banner_currency" })
              }
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
                minWidth: 110,
              }}
            >
              <ChevronDown size={13} color="#6B7280" />
              <Text
                style={{ fontSize: 13, fontWeight: "700", color: "#111827" }}
              >
                {selectedBannerCurr?.flag} {localPricing.banner_currency}
              </Text>
            </Pressable>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 11,
                fontSize: 16,
                fontWeight: "700",
                textAlign: "right",
                color: "#111827",
              }}
              placeholder="مثال: 9"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={localPricing.banner_price}
              onChangeText={(t) =>
                setLocalPricing((prev) => ({ ...prev, banner_price: t }))
              }
            />
          </View>
          <Text
            style={{
              fontSize: 11,
              color: "#9CA3AF",
              textAlign: "right",
              marginTop: 4,
            }}
          >
            {selectedBannerCurr?.flag} {selectedBannerCurr?.name} — يظهر هذا
            للمستخدم عند طلب بانر إعلاني
          </Text>
        </View>

        {/* زر الحفظ */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: saving ? "#9CA3AF" : "#1E3A5F",
            borderRadius: 10,
            paddingVertical: 13,
            alignItems: "center",
            flexDirection: "row-reverse",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <DollarSign size={16} color="#FFF" />
          <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "700" }}>
            {saving ? "جاري الحفظ..." : "حفظ الأسعار"}
          </Text>
        </Pressable>
      </View>

      {/* فاصل */}
      <View style={{ height: 8 }} />

      {/* قسم طرق الدفع */}
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: "#111827",
          textAlign: "right",
        }}
      >
        ⚙️ إعدادات طرق الدفع
      </Text>
      <View
        style={{
          backgroundColor: "#EFF6FF",
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: "#BFDBFE",
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: "#1D4ED8",
            textAlign: "right",
            lineHeight: 20,
          }}
        >
          💡 أدخل بيانات حساباتك هنا. ستظهر هذه البيانات للمستخدمين عند اختيار
          الإعلان المميز أو طلب بانر إعلاني.
        </Text>
      </View>
      {paymentSettings.map((setting) => (
        <PaymentSettingCard
          key={setting.method}
          setting={setting}
          onEdit={() => onEdit(setting)}
        />
      ))}

      {/* Modal اختيار العملة */}
      <Modal visible={currencyModal.visible} transparent animationType="slide">
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
                اختر العملة 💱
              </Text>
            </View>
            {GULF_CURRENCIES.map((curr) => {
              const selected = localPricing[currencyModal.field] === curr.code;
              return (
                <Pressable
                  key={curr.code}
                  onPress={() => {
                    setLocalPricing((prev) => ({
                      ...prev,
                      [currencyModal.field]: curr.code,
                    }));
                    setCurrencyModal({ visible: false, field: null });
                  }}
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderColor: "#F3F4F6",
                    backgroundColor: selected ? "#EFF6FF" : "#FFF",
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
                          color: selected ? "#2563EB" : "#111827",
                          textAlign: "right",
                        }}
                      >
                        {curr.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>
                        {curr.code}
                      </Text>
                    </View>
                  </View>
                  {selected && (
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: "#2563EB",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFF",
                          fontSize: 14,
                          fontWeight: "700",
                        }}
                      >
                        ✓
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setCurrencyModal({ visible: false, field: null })}
              style={{
                margin: 16,
                backgroundColor: "#F3F4F6",
                borderRadius: 10,
                paddingVertical: 13,
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: "#6B7280", fontSize: 15, fontWeight: "600" }}
              >
                إغلاق
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
