import { View, Text, Pressable } from "react-native";
import { Shield } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";

export function UnauthenticatedView({ onSignIn }) {
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
        مطلوب تسجيل الدخول
      </Text>
      <Pressable
        onPress={onSignIn}
        style={{
          backgroundColor: "#60A5FA",
          borderRadius: 10,
          paddingHorizontal: 32,
          paddingVertical: 14,
          marginTop: 20,
        }}
      >
        <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>
          تسجيل الدخول
        </Text>
      </Pressable>
    </View>
  );
}
