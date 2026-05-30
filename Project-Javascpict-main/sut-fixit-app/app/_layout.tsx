import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
        {/* กลุ่มนี้อยู่ด้านนอก (app/...) ถูกต้องแล้ว */}
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />

        {/* กลุ่มนี้ต้องเติม (user)/ เข้าไปข้างหน้า เพราะไฟล์อยู่ในโฟลเดอร์ (user) */}
        <Stack.Screen name="(user)/reset-password" />
        <Stack.Screen name="(user)/report" />
        <Stack.Screen name="(user)/select-location" />
        
        {/* (tabs) ก็อยู่ใน (user) ใช่ไหมครับ? ถ้าใช่ต้องแก้เป็น: */}
        <Stack.Screen name="(user)/(tabs)" />
        
        <Stack.Screen
          name="(user)/modal" 
          options={{ presentation: 'modal', title: 'Modal' }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}