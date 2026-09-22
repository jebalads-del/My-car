import { View, Text } from "react-native";
import { Shield } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";

export function UnauthorizedView() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFF",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
      }}
    >
      <StatusBar style="dark" />
      <Shield size={64} color="#E5E7EB" />
      <Text
        style={{
          fontSize: 22,
          fontWeight: "700",
          color: "#111827",
          marginTop: 16,
          textAlign: "center",
        }}
      >
        وصول محظور
      </Text>
    </View>
  );
}
