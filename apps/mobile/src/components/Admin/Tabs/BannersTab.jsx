import { View, Text } from "react-native";
import { Megaphone } from "lucide-react-native";
import { EmptyState } from "@/components/Admin/EmptyState";
import { BannerCard } from "@/components/Admin/BannerCard";

export function BannersTab({ banners, onApprove, onReject, onDelete }) {
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
        📢 إدارة البانرات الإعلانية ({banners.length})
      </Text>
      {banners.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={56} color="#E5E7EB" />}
          text="لا توجد بانرات بعد"
        />
      ) : (
        banners.map((banner) => (
          <BannerCard
            key={banner.id}
            banner={banner}
            onApprove={() => onApprove(banner.id)}
            onReject={() => onReject(banner.id)}
            onDelete={() => onDelete(banner.id)}
          />
        ))
      )}
    </View>
  );
}
