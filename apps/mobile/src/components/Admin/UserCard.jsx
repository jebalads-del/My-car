import { View, Text, Pressable } from "react-native";
import { Trash2 } from "lucide-react-native";

export function UserCard({ user, onToggleRole, onDelete }) {
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
          marginBottom: 10,
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
            {user.name || "بدون اسم"}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: "#6B7280",
              textAlign: "right",
            }}
          >
            {user.email}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: user.role === "admin" ? "#DBEAFE" : "#F3F4F6",
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: user.role === "admin" ? "#1D4ED8" : "#6B7280",
            }}
          >
            {user.role === "admin" ? "👑 مدير" : "مستخدم"}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row-reverse", gap: 8 }}>
        <Pressable
          onPress={onToggleRole}
          style={{
            flex: 1,
            backgroundColor: "#EFF6FF",
            borderRadius: 8,
            paddingVertical: 10,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#1D4ED8",
              fontSize: 13,
              fontWeight: "700",
            }}
          >
            {user.role === "admin" ? "إزالة المدير" : "ترقية لمدير 👑"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          style={{
            backgroundColor: "#FEE2E2",
            borderRadius: 8,
            paddingVertical: 10,
            paddingHorizontal: 14,
            alignItems: "center",
          }}
        >
          <Trash2 size={16} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  );
}
