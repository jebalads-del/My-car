import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { CheckCircle, XCircle, Trash2 } from "lucide-react-native";
import { STATUS_MAP } from "@/utils/admin/constants";
import { TagBadge } from "./TagBadge";

export function BannerCard({ banner, onApprove, onReject, onDelete }) {
  const bStatus = STATUS_MAP[banner.status] || STATUS_MAP.pending;

  return (
    <View
      style={{
        backgroundColor: "#FFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
      }}
    >
      <Image
        source={{ uri: banner.image_url }}
        style={{ width: "100%", height: 130 }}
        contentFit="cover"
      />
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
                fontSize: 14,
                fontWeight: "700",
                color: "#111827",
                textAlign: "right",
              }}
            >
              {banner.title}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: "#6B7280",
                textAlign: "right",
              }}
            >
              {banner.user_name || banner.user_email}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: bStatus.bg,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: bStatus.text,
              }}
            >
              {bStatus.label}
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row-reverse",
            gap: 6,
            marginBottom: 10,
          }}
        >
          <TagBadge
            text={
              banner.position === "top" ? "📍 أعلى الصفحة" : "📍 أسفل الصفحة"
            }
          />
          {banner.payment_method && (
            <TagBadge
              text={
                banner.payment_method === "paypal"
                  ? "💳 باي بال"
                  : "🏦 ويسترن يونيون"
              }
            />
          )}
          {banner.payment_reference && (
            <TagBadge text={`مرجع: ${banner.payment_reference}`} highlight />
          )}
        </View>
        <View style={{ flexDirection: "row-reverse", gap: 8 }}>
          {banner.status !== "approved" && (
            <Pressable
              onPress={onApprove}
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
              <CheckCircle size={14} color="#10B981" />
              <Text
                style={{
                  color: "#065F46",
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                قبول
              </Text>
            </Pressable>
          )}
          {banner.status !== "rejected" && (
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
              <XCircle size={14} color="#EF4444" />
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
          )}
          <Pressable
            onPress={onDelete}
            style={{
              backgroundColor: "#F3F4F6",
              borderRadius: 8,
              paddingHorizontal: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Trash2 size={16} color="#6B7280" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
