import { View, Text, Pressable, Switch } from "react-native";
import { Settings } from "lucide-react-native";
import { InfoRow } from "./InfoRow";

export function PaymentSettingCard({ setting, onEdit }) {
  return (
    <View
      style={{
        backgroundColor: "#FFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 14,
      }}
    >
      <View
        style={{
          flexDirection: "row-reverse",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#111827",
          }}
        >
          {setting.method === "paypal" ? "💳 باي بال" : "🏦 ويسترن يونيون"}
        </Text>
        <View
          style={{
            backgroundColor: setting.is_active ? "#D1FAE5" : "#FEE2E2",
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: setting.is_active ? "#065F46" : "#991B1B",
            }}
          >
            {setting.is_active ? "• مفعّل" : "• معطّل"}
          </Text>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <InfoRow
          label="بيانات الحساب"
          value={setting.account_info || "⚠️ غير محدد"}
        />
        <InfoRow
          label="التعليمات"
          value={setting.instructions || "⚠️ غير محدد"}
        />
        <InfoRow label="ملاحظات" value={setting.extra_info || "—"} />
      </View>
      <Pressable
        onPress={onEdit}
        style={{
          backgroundColor: "#60A5FA",
          borderRadius: 8,
          paddingVertical: 10,
          alignItems: "center",
          marginTop: 12,
          flexDirection: "row-reverse",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <Settings size={15} color="#FFF" />
        <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "700" }}>
          تعديل البيانات
        </Text>
      </Pressable>
    </View>
  );
}
