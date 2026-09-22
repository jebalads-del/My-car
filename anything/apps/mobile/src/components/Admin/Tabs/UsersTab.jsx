import { View, Text } from "react-native";
import { UserCard } from "@/components/Admin/UserCard";

export function UsersTab({ users, onToggleRole, onDelete }) {
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
        👥 إدارة المستخدمين ({users.length})
      </Text>
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          onToggleRole={() => onToggleRole(user.id, user.role)}
          onDelete={() => onDelete(user.id)}
        />
      ))}
    </View>
  );
}
