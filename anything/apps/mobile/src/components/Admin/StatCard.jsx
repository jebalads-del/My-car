import { View, Text, Pressable } from "react-native";

export function StatCard({ label, value, emoji, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: "47%",
        backgroundColor: "#FFF",
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}
    >
      <Text style={{ fontSize: 22, textAlign: "right" }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 26,
          fontWeight: "800",
          color: "#111827",
          textAlign: "right",
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: "#6B7280",
          textAlign: "right",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
