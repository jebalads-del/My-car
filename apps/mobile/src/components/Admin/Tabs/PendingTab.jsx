import { View, Text, Pressable } from "react-native";
import { CheckCircle } from "lucide-react-native";
import { EmptyState } from "@/components/Admin/EmptyState";
import { CarCard } from "@/components/Admin/CarCard";

export function PendingTab({
  pendingCars,
  loading,
  expandedCard,
  onExpand,
  onApprove,
  onReject,
  onDelete,
  onFeature,
  onView,
}) {
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
        ⏳ إعلانات بانتظار المراجعة ({pendingCars.length})
      </Text>
      {loading ? (
        <Text style={{ textAlign: "center", color: "#6B7280" }}>
          جاري التحميل...
        </Text>
      ) : pendingCars.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={56} color="#D1FAE5" />}
          text="لا توجد إعلانات معلقة 🎉"
        />
      ) : (
        pendingCars.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            expanded={expandedCard === car.id}
            onExpand={() => onExpand(car.id)}
            onApprove={() => onApprove(car.id)}
            onReject={() => onReject(car.id)}
            onDelete={() => onDelete(car.id)}
            onFeature={() => onFeature(car.id, car.is_featured)}
            onView={() => onView(car.id)}
          />
        ))
      )}
    </View>
  );
}
