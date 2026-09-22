import { View, Text, Modal, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function FeaturedModal({
  visible,
  isFeatured,
  days,
  onDaysChange,
  onConfirm,
  onCancel,
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide">
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
              marginBottom: 16,
            }}
          >
            {isFeatured ? "إلغاء الإعلان المميز" : "⭐ تفعيل الإعلان المميز"}
          </Text>
          {!isFeatured && (
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 13,
                  color: "#6B7280",
                  textAlign: "right",
                  marginBottom: 8,
                }}
              >
                مدة التمييز (أيام)
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  textAlign: "center",
                }}
                value={days}
                keyboardType="numeric"
                onChangeText={onDaysChange}
              />
            </View>
          )}
          <View style={{ flexDirection: "row-reverse", gap: 10 }}>
            <Pressable
              onPress={onConfirm}
              style={{
                flex: 1,
                backgroundColor: "#60A5FA",
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "700" }}>
                {isFeatured ? "إلغاء التمييز" : "تفعيل"}
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
        </View>
      </View>
    </Modal>
  );
}
