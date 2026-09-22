import { View, Text } from "react-native";

export function TagBadge({ text, highlight }) {
  return (
    <View
      style={{
        backgroundColor: highlight ? "#EDE9FE" : "#F3F4F6",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          color: highlight ? "#5B21B6" : "#6B7280",
          fontWeight: highlight ? "700" : "400",
        }}
      >
        {text}
      </Text>
    </View>
  );
}
