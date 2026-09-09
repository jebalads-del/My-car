import { View, Text, ScrollView, Pressable } from "react-native";
import { RefreshCw } from "lucide-react-native";

const TABS = [
  { key: "overview", label: "📊 نظرة عامة" },
  { key: "pending", label: "⏳ معلقة" },
  { key: "all_listings", label: "🚗 الإعلانات" },
  { key: "banners", label: "📢 البانرات" },
  { key: "payments", label: "💳 المدفوعات" },
  { key: "users", label: "👥 المستخدمين" },
  { key: "settings", label: "⚙️ إعدادات الدفع" },
];

export function AdminHeader({
  activeTab,
  stats,
  onTabChange,
  onRefresh,
  topInset,
}) {
  return (
    <View
      style={{
        paddingTop: topInset + 10,
        backgroundColor: "#1E3A5F",
        paddingBottom: 0,
      }}
    >
      <View
        style={{
          flexDirection: "row-reverse",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          marginBottom: 10,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#FFF" }}>
          لوحة الإدارة
        </Text>
        <Pressable
          onPress={onRefresh}
          style={{
            backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius: 8,
            padding: 8,
          }}
        >
          <RefreshCw size={18} color="#FFF" />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 8, gap: 0 }}
      >
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 10,
              borderBottomWidth: 2.5,
              borderColor: activeTab === tab.key ? "#60A5FA" : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: activeTab === tab.key ? "#FFF" : "rgba(255,255,255,0.5)",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
              {tab.key === "pending" && stats.pending > 0
                ? ` (${stats.pending})`
                : ""}
              {tab.key === "payments" && stats.paymentsWaiting > 0
                ? ` (${stats.paymentsWaiting})`
                : ""}
              {tab.key === "banners" && stats.bannersWaiting > 0
                ? ` (${stats.bannersWaiting})`
                : ""}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
