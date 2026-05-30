import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
// ✅ นำเข้าตัวจัดการขอบจอ
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

export default function AdminTabLayout() {
  const insets = useSafeAreaInsets(); // ✅ เรียกใช้งาน

  return (
    <Tabs
      screenOptions={{
        headerShown: false, 
        tabBarActiveTintColor: '#F28C28', 
        tabBarInactiveTintColor: '#9CA3AF', 
        tabBarStyle: [styles.tabBar, {
          // ✅ ดันขอบจออัตโนมัติ
          height: Platform.OS === 'ios' ? 85 : 65 + insets.bottom,
          paddingBottom: Platform.OS === 'ios' ? 25 : (insets.bottom > 0 ? insets.bottom : 20),
        }],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
      }}>
      
      <Tabs.Screen name="index" options={{ title: 'หน้าแรก', tabBarIcon: ({ color, focused }) => (<Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />) }} />
      <Tabs.Screen name="history" options={{ title: 'ประวัติ', tabBarIcon: ({ color, focused }) => (<Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={24} color={color} />) }} />
      <Tabs.Screen name="statistics" options={{ title: 'สถิติ', tabBarIcon: ({ color, focused }) => (<Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={24} color={color} />) }} />
      <Tabs.Screen name="review" options={{ title: 'ตรวจงาน', tabBarIcon: ({ color, focused }) => (<Ionicons name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'} size={24} color={color} />) }} />
      <Tabs.Screen name="settings" options={{ title: 'ตั้งค่า', tabBarIcon: ({ color, focused }) => (<Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />) }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8, 
  },
  tabBarLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  tabBarIcon: { justifyContent: 'center', alignItems: 'center' }
});