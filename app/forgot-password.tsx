import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
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
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

// ✅ 1. นำเข้า Firestore เพื่อใช้เช็คอีเมลในฐานข้อมูล
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from '../constants/firebaseConfig'; // เช็ค path ให้ตรงกับไฟล์ของคุณด้วยนะครับ

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ฟังก์ชันขอรีเซ็ตรหัสผ่าน
  const handleResetPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกอีเมลที่ใช้ลงทะเบียน');
      return;
    }

    setIsSubmitting(true);
    try {
      // ✅ 2. เช็คใน Firestore ก่อนว่ามีอีเมลนี้ในระบบหรือไม่
      const q = query(collection(db, "Users"), where("email", "==", trimmedEmail.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // ถ้าหาไม่เจอ ให้เด้งเตือนและหยุดการทำงานทันที
        Alert.alert('ข้อผิดพลาด', 'ไม่พบอีเมลนี้ในระบบ กรุณาตรวจสอบให้ถูกต้อง หรือสมัครสมาชิกใหม่');
        setIsSubmitting(false);
        return;
      }

      // ✅ 3. ถ้าเจออีเมลในฐานข้อมูล ค่อยส่งลิงก์รีเซ็ต
      const auth = getAuth();
      await sendPasswordResetEmail(auth, trimmedEmail);
      
      Alert.alert(
        'ส่งลิงก์สำเร็จ!', 
        `ระบบได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปที่อีเมล\n${trimmedEmail}\nกรุณาตรวจสอบกล่องจดหมายของคุณ`,
        [{ text: 'กลับไปหน้าเข้าสู่ระบบ', onPress: () => router.replace('/login') }]
      );

    } catch (error: any) {
      console.error("Reset Password Error:", error);
      if (error.code === 'auth/user-not-found') {
        Alert.alert('ข้อผิดพลาด', 'ไม่พบอีเมลนี้ในระบบบัญชีผู้ใช้');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('ข้อผิดพลาด', 'รูปแบบอีเมลไม่ถูกต้อง');
      } else {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งลิงก์ได้ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* ปุ่มย้อนกลับ */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={28} color="#F28C28" />
            </TouchableOpacity>
          </View>

          {/* ไอคอนและข้อความอธิบาย */}
          <View style={styles.logoSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={46} color="#F28C28" />
            </View>
            <Text style={styles.mainTitle}>ลืมรหัสผ่าน?</Text>
            <Text style={styles.subTitle}>
              ไม่ต้องกังวล! กรุณากรอกอีเมลของคุณด้านล่าง{'\n'}เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้
            </Text>
          </View>

          {/* ฟอร์มกรอกอีเมล */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>อีเมล (Email)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={email} 
                  onChangeText={setEmail} 
                  placeholder="กรอกอีเมลของคุณ"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* ปุ่มส่งข้อมูล */}
            <TouchableOpacity 
              style={[styles.submitBtn, isSubmitting && { backgroundColor: '#FDBA74' }]} 
              activeOpacity={0.8} 
              onPress={handleResetPassword}
              disabled={isSubmitting}
            >
              <Text style={styles.submitBtnText}>
                {isSubmitting ? 'กำลังตรวจสอบและส่งลิงก์...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardAvoid: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 10, marginBottom: 20 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  logoSection: { alignItems: 'center', marginBottom: 32, paddingHorizontal: 20 },
  iconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFF3E8', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F28C28', marginBottom: 16 },
  mainTitle: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 10 },
  subTitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  formContainer: { paddingHorizontal: 24 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827', height: '100%' },
  submitBtn: { backgroundColor: '#F28C28', height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: '#F28C28', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});