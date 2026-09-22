import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function SettingsModal({
  visible,
  setting,
  onFieldChange,
  onSave,
  onCancel,
}) {
  const insets = useSafeAreaInsets();

  if (!setting) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <ScrollView
          style={{
            backgroundColor: "#FFF",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
          contentContainerStyle={{
            padding: 24,
            paddingBottom: insets.bottom + 24,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: "#111827",
              textAlign: "right",
              marginBottom: 20,
            }}
          >
            تعديل{" "}
            {setting.method === "paypal" ? "💳 باي بال" : "🏦 ويسترن يونيون"}
          </Text>
          {[
            {
              label:
                setting.method === "paypal"
                  ? "إيميل باي بال"
                  : "بيانات ويسترن يونيون (الاسم، الدولة، المدينة)",
              key: "account_info",
              placeholder:
                setting.method === "paypal"
                  ? "example@paypal.com"
                  : "الاسم الكامل - الدولة - المدينة",
            },
            {
              label: "تعليمات الدفع للمستخدم",
              key: "instructions",
              placeholder: "أرسل المبلغ إلى الحساب التالي...",
            },
            {
              label: "ملاحظات إضافية",
              key: "extra_info",
              placeholder: "مثال: أرسل رقم العملية بعد التحويل",
            },
          ].map((field) => (
            <View key={field.key} style={{ marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#374151",
                  textAlign: "right",
                  marginBottom: 6,
                }}
              >
                {field.label}
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 13,
                  textAlign: "right",
                  minHeight: 44,
                  backgroundColor: "#F9FAFB",
                }}
                value={setting[field.key] || ""}
                placeholder={field.placeholder}
                placeholderTextColor="#9CA3AF"
                multiline
                onChangeText={(text) => onFieldChange(field.key, text)}
              />
            </View>
          ))}
          <View
            style={{
              flexDirection: "row-reverse",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              backgroundColor: "#F9FAFB",
              borderRadius: 10,
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>
              تفعيل طريقة الدفع
            </Text>
            <Switch
              value={setting.is_active}
              onValueChange={(value) => onFieldChange("is_active", value)}
              trackColor={{ false: "#D1D5DB", true: "#60A5FA" }}
            />
          </View>
          <View style={{ flexDirection: "row-reverse", gap: 10 }}>
            <Pressable
              onPress={onSave}
              style={{
                flex: 1,
                backgroundColor: "#60A5FA",
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "700" }}>
                حفظ
              </Text>
            </Pressable>
            <Pressable
              onPress={onCancel}
              style={{
                flex: 1,
                backgroundColor: "#F3F4F6",
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#6B7280",
                  fontSize: 15,
                  fontWeight: "700",
                }}
              >
                إلغاء
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
