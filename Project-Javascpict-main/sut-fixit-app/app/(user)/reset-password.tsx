
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// นำเข้า Firebase Auth
import { getAuth, sendPasswordResetEmail, signOut  } from "firebase/auth";

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ดึงอีเมลของคนที่ล็อกอินอยู่มาแสดงอัตโนมัติเมื่อเปิดหน้านี้
  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.email) {
      setEmail(currentUser.email);
    }
  }, []);

  // ฟังก์ชันส่งลิงก์เปลี่ยนรหัสผ่าน
  const handleSendResetLink = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('แจ้งเตือน', 'ไม่พบข้อมูลอีเมล กรุณาระบุอีเมล');
      return;
    }

    setIsSubmitting(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, trimmedEmail);
      
      Alert.alert(
        'ส่งลิงก์สำเร็จ!', 
        `ระบบได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปที่\n${trimmedEmail}\nกรุณาไปเปลี่ยนรหัสผ่านในอีเมล แล้วล็อกอินใหม่อีกครั้งนะครับ`,
        [
          { 
            text: 'ไปที่หน้าเข้าสู่ระบบ', 
            onPress: async () => {
              // เตะออกจากระบบ แล้วพาไปหน้า Login
              await signOut(auth);
              router.replace('/login' as any); 
            } 
          }
        ]
      );
    } catch (error: any) {
      console.error("Change Password Error:", error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งลิงก์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ========================================== */}
        {/* Header / Back Button  */}
        {/* ========================================== */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={28} color="#F28C28" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerSection}>
            <View style={styles.logoWrap}>
              <Ionicons name="lock-closed" size={48} color="#F28C28" />
            </View>
            <Text style={styles.title}>เปลี่ยนรหัสผ่าน</Text>
            <Text style={styles.subtitle}>ระบบจะส่งลิงก์ไปยังอีเมลของคุณ{'\n'}เพื่อความปลอดภัยในการตั้งรหัสผ่านใหม่</Text>
          </View>

          {/* ========================================== */}
          {/* Form Section */}
          {/* ========================================== */}
          <View style={styles.formCard}>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>อีเมลที่ใช้รับลิงก์ (Email)</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: '#F3F4F6', color: '#6B7280' }]} 
                value={email} 
                onChangeText={setEmail} 
                placeholder="ระบุอีเมลของคุณ"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={false} // ล็อกไว้ไม่ให้แก้ ป้องกันการส่งผิดเมล
              />
            </View>

          </View>

          {/* ========================================== */}
          {/* Submit Button */}
          {/* ========================================== */}
          <TouchableOpacity 
            style={[styles.primaryButton, isSubmitting && { backgroundColor: '#FDBA74' }]} 
            activeOpacity={0.8}
            onPress={handleSendResetLink}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งลิงก์เปลี่ยนรหัสผ่าน'}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ==========================================
// Styles
// ==========================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB', 
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 10,
    backgroundColor: 'transparent',
    zIndex: 10, 
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  logoWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFF3E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F0E4D8',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  primaryButton: {
    marginTop: 30,
    backgroundColor: '#F28C28',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F28C28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});