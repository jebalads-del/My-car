import { View, Text, ScrollView, Pressable } from "react-native";
import { Car } from "lucide-react-native";
import { EmptyState } from "@/components/Admin/EmptyState";
import { CarCard } from "@/components/Admin/CarCard";
import { STATUS_MAP } from "@/utils/admin/constants";

export function AllListingsTab({
  allCars,
  filterStatus,
  onFilterChange,
  loading,
  expandedCard,
  onExpand,
  onApprove,
  onReject,
  onDelete,
  onFeature,
  onView,
}) {
  const filteredCars =
    filterStatus === "all"
      ? allCars
      : allCars.filter((c) => c.status === filterStatus);

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
        🚗 جميع الإعلانات ({filteredCars.length})
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {["all", "pending", "approved", "rejected"].map((s) => (
          <Pressable
            key={s}
            onPress={() => onFilterChange(s)}
            style={{
              backgroundColor: filterStatus === s ? "#1E3A5F" : "#FFF",
              borderWidth: 1,
              borderColor: filterStatus === s ? "#1E3A5F" : "#E5E7EB",
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: filterStatus === s ? "#FFF" : "#6B7280",
              }}
            >
              {s === "all"
                ? `الكل (${allCars.length})`
                : `${STATUS_MAP[s]?.label} (${allCars.filter((c) => c.status === s).length})`}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading ? (
        <Text style={{ textAlign: "center", color: "#6B7280" }}>
          جاري التحميل...
        </Text>
      ) : filteredCars.length === 0 ? (
        <EmptyState
          icon={<Car size={56} color="#E5E7EB" />}
          text="لا توجد إعلانات"
        />
      ) : (
        filteredCars.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            showStatus
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
