import { View, Text } from "react-native";

export function EmptyState({ icon, text }) {
  return (
    <View style={{ alignItems: "center", marginTop: 50 }}>
      {icon}
      <Text
        style={{
          color: "#6B7280",
          fontSize: 15,
          marginTop: 16,
          textAlign: "center",
        }}
      >
        {text}
      </Text>
    </View>
  );
}
