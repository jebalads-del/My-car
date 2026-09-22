import { View, Text } from "react-native";

export function InfoRow({ label, value, highlight }) {
  return (
    <View
      style={{ flexDirection: "row-reverse", gap: 8, alignItems: "flex-start" }}
    >
      <Text
        style={{
          fontSize: 12,
          color: "#6B7280",
          fontWeight: "600",
          minWidth: 90,
          textAlign: "right",
        }}
      >
        {label}:
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: highlight ? "#5B21B6" : "#374151",
          flex: 1,
          textAlign: "left",
          fontWeight: highlight ? "700" : "400",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
