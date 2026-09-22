import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import {
  CheckCircle,
  XCircle,
  Star,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { STATUS_MAP } from "@/utils/admin/constants";
import { TagBadge } from "./TagBadge";
import { InfoRow } from "./InfoRow";

export function CarCard({
  car,
  expanded,
  onExpand,
  onApprove,
  onReject,
  onDelete,
  onFeature,
  onView,
  showStatus,
}) {
  const s = STATUS_MAP[car.status] || STATUS_MAP.pending;
  return (
    <View
      style={{
        backgroundColor: "#FFF",
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: car.is_featured ? "#F59E0B" : "#E5E7EB",
        overflow: "hidden",
      }}
    >
      {car.is_featured && (
        <View
          style={{
            backgroundColor: "#FEF3C7",
            paddingHorizontal: 12,
            paddingVertical: 5,
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Star size={12} color="#D97706" fill="#D97706" />
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#D97706" }}>
            إعلان مميز
          </Text>
        </View>
      )}
      {car.images?.[0] && (
        <Image
          source={{ uri: car.images[0] }}
          style={{ width: "100%", height: 140 }}
          contentFit="cover"
        />
      )}
      <View style={{ padding: 12 }}>
        <View
          style={{
            flexDirection: "row-reverse",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 8,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#111827",
                textAlign: "right",
              }}
            >
              {car.brand} {car.model}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: "#6B7280",
                textAlign: "right",
                marginTop: 2,
              }}
            >
              {car.user_name || car.user_email}
            </Text>
          </View>
          {showStatus && (
            <View
              style={{
                backgroundColor: s.bg,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: s.text }}>
                {s.label}
              </Text>
            </View>
          )}
        </View>
        <View
          style={{
            flexDirection: "row-reverse",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 8,
          }}
        >
          {[
            car.year,
            `${(car.kilometers || 0).toLocaleString()} كم`,
            car.color,
            car.price
              ? `${parseFloat(car.price).toLocaleString()} ${car.currency || "KWD"}`
              : null,
          ]
            .filter(Boolean)
            .map((t, i) => (
              <TagBadge key={i} text={String(t)} />
            ))}
        </View>
        <Pressable
          onPress={onExpand}
          style={{
            flexDirection: "row-reverse",
            justifyContent: "center",
            alignItems: "center",
            gap: 4,
            paddingVertical: 6,
          }}
        >
          <Text style={{ fontSize: 12, color: "#60A5FA", fontWeight: "600" }}>
            {expanded ? "إخفاء" : "تفاصيل أكثر"}
          </Text>
          {expanded ? (
            <ChevronUp size={13} color="#60A5FA" />
          ) : (
            <ChevronDown size={13} color="#60A5FA" />
          )}
        </Pressable>
        {expanded && (
          <View
            style={{
              backgroundColor: "#F9FAFB",
              borderRadius: 8,
              padding: 10,
              marginBottom: 10,
              gap: 5,
            }}
          >
            {car.description ? (
              <InfoRow label="الوصف" value={car.description} />
            ) : null}
            <InfoRow
              label="تاريخ الإضافة"
              value={new Date(car.created_at).toLocaleDateString("ar-EG")}
            />
            {car.payment_method ? (
              <InfoRow
                label="طريقة الدفع"
                value={
                  car.payment_method === "paypal"
                    ? "💳 باي بال"
                    : "🏦 ويسترن يونيون"
                }
              />
            ) : null}
            {car.payment_reference ? (
              <InfoRow
                label="مرجع الدفع"
                value={car.payment_reference}
                highlight
              />
            ) : null}
          </View>
        )}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row-reverse", gap: 8 }}>
            <Pressable
              onPress={onApprove}
              style={{
                flex: 1,
                backgroundColor: "#D1FAE5",
                borderRadius: 8,
                paddingVertical: 10,
                flexDirection: "row-reverse",
                justifyContent: "center",
                alignItems: "center",
                gap: 4,
              }}
            >
              <CheckCircle size={14} color="#10B981" />
              <Text
                style={{ color: "#065F46", fontSize: 13, fontWeight: "700" }}
              >
                قبول
              </Text>
            </Pressable>
            <Pressable
              onPress={onReject}
              style={{
                flex: 1,
                backgroundColor: "#FEE2E2",
                borderRadius: 8,
                paddingVertical: 10,
                flexDirection: "row-reverse",
                justifyContent: "center",
                alignItems: "center",
                gap: 4,
              }}
            >
              <XCircle size={14} color="#EF4444" />
              <Text
                style={{ color: "#991B1B", fontSize: 13, fontWeight: "700" }}
              >
                رفض
              </Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row-reverse", gap: 8 }}>
            <Pressable
              onPress={onFeature}
              style={{
                flex: 1,
                backgroundColor: car.is_featured ? "#FEF3C7" : "#FFF7ED",
                borderWidth: 1,
                borderColor: "#FDE68A",
                borderRadius: 8,
                paddingVertical: 10,
                flexDirection: "row-reverse",
                justifyContent: "center",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Star
                size={14}
                color="#D97706"
                fill={car.is_featured ? "#D97706" : "none"}
              />
              <Text
                style={{ color: "#D97706", fontSize: 13, fontWeight: "700" }}
              >
                {car.is_featured ? "إلغاء تمييز" : "تمييز ⭐"}
              </Text>
            </Pressable>
            <Pressable
              onPress={onView}
              style={{
                backgroundColor: "#EFF6FF",
                borderRadius: 8,
                paddingHorizontal: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Eye size={15} color="#3B82F6" />
            </Pressable>
            <Pressable
              onPress={onDelete}
              style={{
                backgroundColor: "#FEE2E2",
                borderRadius: 8,
                paddingHorizontal: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash2 size={15} color="#EF4444" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
