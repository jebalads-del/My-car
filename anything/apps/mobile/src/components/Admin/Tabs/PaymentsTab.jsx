import { View, Text } from "react-native";
import { CreditCard } from "lucide-react-native";
import { EmptyState } from "@/components/Admin/EmptyState";
import { PaymentCard } from "@/components/Admin/PaymentCard";

export function PaymentsTab({ paymentCars, onConfirm, onReject }) {
  return (
    <View style={{ gap: 12 }}>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: "#111827",
          textAlign: "right",
        }}
      >
        💳 طلبات الدفع المعلقة ({paymentCars.length})
      </Text>
      {paymentCars.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={56} color="#E5E7EB" />}
          text="لا توجد طلبات دفع معلقة ✅"
        />
      ) : (
        paymentCars.map((car) => (
          <PaymentCard
            key={car.id}
            car={car}
            onConfirm={() => onConfirm(car.id, true)}
            onReject={() => onConfirm(car.id, false)}
          />
        ))
      )}
    </View>
  );
}
