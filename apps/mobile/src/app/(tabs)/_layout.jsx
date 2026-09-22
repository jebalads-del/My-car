import { Tabs } from "expo-router";
import { Home, PlusCircle, User, Shield } from "lucide-react-native";
import { useEffect, useState } from "react";

export default function TabLayout() {
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.user?.role);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderColor: "#E5E7EB",
          paddingTop: 4,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: "#60A5FA",
        tabBarInactiveTintColor: "#6B7280",
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "Inter",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color, size }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="add-listing"
        options={{
          title: "إضافة إعلان",
          tabBarIcon: ({ color, size }) => (
            <PlusCircle color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "حسابي",
          tabBarIcon: ({ color, size }) => <User color={color} size={24} />,
        }}
      />
      {userRole === "admin" && (
        <Tabs.Screen
          name="admin"
          options={{
            title: "الإدارة",
            tabBarIcon: ({ color, size }) => <Shield color={color} size={24} />,
          }}
        />
      )}
    </Tabs>
  );
}
