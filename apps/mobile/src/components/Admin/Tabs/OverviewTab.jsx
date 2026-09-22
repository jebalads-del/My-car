import { View, Text, Pressable } from "react-native";
import { StatCard } from "@/components/Admin/StatCard";

export function OverviewTab({ stats, onNavigate }) {
  return (
    <View style={{ gap: 12 }}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: "#111827",
          textAlign: "right",
        }}
      >
        إحصائيات التطبيق
      </Text>
      <View
        style={{
          flexDirection: "row-reverse",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        {[
          {
            label: "قيد المراجعة",
            value: stats.pending,
            emoji: "⏳",
            onPress: () => onNavigate("pending"),
          },
          { label: "مقبولة", value: stats.approved, emoji: "✅" },
          { label: "مرفوضة", value: stats.rejected, emoji: "❌" },
          { label: "مميزة", value: stats.featured, emoji: "⭐" },
          {
            label: "مستخدمين",
            value: stats.users,
            emoji: "👥",
            onPress: () => onNavigate("users"),
          },
          {
            label: "دفعات معلقة",
            value: stats.paymentsWaiting,
            emoji: "💳",
            onPress: () => onNavigate("payments"),
          },
          {
            label: "بانرات معلقة",
            value: stats.bannersWaiting,
            emoji: "📢",
            onPress: () => onNavigate("banners"),
          },
        ].map((s, i) => (
          <StatCard
            key={i}
            label={s.label}
            value={s.value}
            emoji={s.emoji}
            onPress={s.onPress}
          />
        ))}
      </View>
      {stats.pending > 0 && (
        <Pressable
          onPress={() => onNavigate("pending")}
          style={{
            backgroundColor: "#FEF3C7",
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: "#FDE68A",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#92400E",
              textAlign: "right",
            }}
          >
            ⏳ {stats.pending} إعلان بانتظار مراجعتك — اضغط للمراجعة
          </Text>
        </Pressable>
      )}
      {stats.bannersWaiting > 0 && (
        <Pressable
          onPress={() => onNavigate("banners")}
          style={{
            backgroundColor: "#FCE7F3",
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: "#F9A8D4",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#831843",
              textAlign: "right",
            }}
          >
            📢 {stats.bannersWaiting} بانر إعلاني بانتظار الموافقة — اضغط
            للمراجعة
          </Text>
        </Pressable>
      )}
    </View>
  );
}
