import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
// ✅ นำเข้าตัวจัดการขอบจอ
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

export default function TechnicianTabLayout() {
  const insets = useSafeAreaInsets(); // ✅ เรียกใช้งาน

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F28C28', 
        tabBarInactiveTintColor: '#9CA3AF', 
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          // ✅ ดันขอบจออัตโนมัติ
          height: Platform.OS === 'ios' ? 85 : 65 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : (insets.bottom > 0 ? insets.bottom : 20),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },
      }}>
      
      <Tabs.Screen name="index" options={{ title: 'หน้าแรก', tabBarIcon: ({ color, focused }) => (<Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />) }} />
      <Tabs.Screen name="tasks" options={{ title: 'งานของฉัน', tabBarIcon: ({ color, focused }) => (<Ionicons name={focused ? 'construct' : 'construct-outline'} size={24} color={color} />) }} />
      <Tabs.Screen name="history" options={{ title: 'ประวัติ', tabBarIcon: ({ color, focused }) => (<Ionicons name={focused ? 'time' : 'time-outline'} size={24} color={color} />) }} />
      <Tabs.Screen name="statistics" options={{ title: 'สถิติ', tabBarIcon: ({ color, focused }) => (<Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={24} color={color} />) }} />
      <Tabs.Screen name="settings" options={{ title: 'ตั้งค่า', tabBarIcon: ({ color, focused }) => (<Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />) }} />
    </Tabs>
  );
}