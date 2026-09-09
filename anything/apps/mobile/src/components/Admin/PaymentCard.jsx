import { View, Text, Pressable } from "react-native";
import { CheckCircle, XCircle } from "lucide-react-native";
import { InfoRow } from "./InfoRow";

export function PaymentCard({ car, onConfirm, onReject }) {
  return (
    <View
      style={{
        backgroundColor: "#FFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#DDD6FE",
        padding: 14,
      }}
    >
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: "#111827",
          textAlign: "right",
        }}
      >
        {car.brand} {car.model} ({car.year})
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: "#6B7280",
          textAlign: "right",
          marginTop: 2,
          marginBottom: 10,
        }}
      >
        {car.user_name || car.user_email}
      </Text>
      <View style={{ gap: 6, marginBottom: 12 }}>
        <InfoRow
          label="طريقة الدفع"
          value={
            car.payment_method === "paypal" ? "💳 باي بال" : "🏦 ويسترن يونيون"
          }
        />
        {car.payment_reference && (
          <InfoRow label="رقم المرجع" value={car.payment_reference} highlight />
        )}
        {car.featured_price && (
          <InfoRow
            label="المبلغ"
            value={`${car.featured_price} ${car.currency || "KWD"}`}
          />
        )}
      </View>
      <View style={{ flexDirection: "row-reverse", gap: 8 }}>
        <Pressable
          onPress={onConfirm}
          style={{
            flex: 1,
            backgroundColor: "#D1FAE5",
            borderRadius: 8,
            paddingVertical: 10,
            alignItems: "center",
            flexDirection: "row-reverse",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <CheckCircle size={15} color="#10B981" />
          <Text
            style={{
              color: "#065F46",
              fontSize: 13,
              fontWeight: "700",
            }}
          >
            تأكيد الدفع
          </Text>
        </Pressable>
        <Pressable
          onPress={onReject}
          style={{
            flex: 1,
            backgroundColor: "#FEE2E2",
            borderRadius: 8,
            paddingVertical: 10,
            alignItems: "center",
            flexDirection: "row-reverse",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <XCircle size={15} color="#EF4444" />
          <Text
            style={{
              color: "#991B1B",
              fontSize: 13,
              fontWeight: "700",
            }}
          >
            رفض
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
