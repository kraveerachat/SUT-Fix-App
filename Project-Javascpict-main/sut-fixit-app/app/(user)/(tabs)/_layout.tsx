import { Tabs } from 'expo-router';
import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform } from 'react-native';
// ✅ 1. นำเข้าตัวจัดการขอบจอ
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

export default function TabLayout() {
  const insets = useSafeAreaInsets(); // ✅ 2. เรียกใช้งาน

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F28C28',
        tabBarInactiveTintColor: '#A9B3C1',
        tabBarStyle: {
          // ✅ 3. ให้มันบวกความสูงของปุ่มโฮมเครื่องนั้นๆ เข้าไปอัตโนมัติ
          height: Platform.OS === 'ios' ? 85 : 65 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 25 : (insets.bottom > 0 ? insets.bottom : 20),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'หน้าแรก',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'ประวัติ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notification"
        options={{
          title: 'การแจ้งเตือน',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'โปรไฟล์',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}