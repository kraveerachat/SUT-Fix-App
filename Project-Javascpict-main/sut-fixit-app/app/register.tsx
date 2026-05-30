import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';

// 1. Import เครื่องมือสำหรับ Register จาก Firebase
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from '../constants/firebaseConfig'; // เช็ค Path ให้ถูกต้องด้วยนะครับ

export default function RegisterScreen() {
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ฟังก์ชันปุ่มย้อนกลับ
  const handleGoBack = () => {
    router.replace('/login');
  };

  // ==========================================
  // ฟังก์ชันสมัครสมาชิก
  // ==========================================
  const handleRegister = async () => {
    // 1. ตรวจสอบข้อมูลเบื้องต้น
    if (!studentId || !email || !phone || !password || !confirmPassword) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("แจ้งเตือน", "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (password.length < 6) {
      Alert.alert("แจ้งเตือน", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    try {
      console.log("กำลังสร้างบัญชีใหม่...");
      const auth = getAuth();
      const userEmail = email.toLowerCase().trim();

      // 2. สร้างบัญชีใน Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, userEmail, password);
      const user = userCredential.user;

      console.log("สร้างบัญชี Authentication สำเร็จ UID:", user.uid);

      // 3. บันทึกข้อมูลส่วนตัวลงใน Firestore
      // ใช้ UID ของ Auth เป็นชื่อ Document เพื่อให้เชื่อมโยงกัน
      await setDoc(doc(db, "Users", user.uid), {
        studentId: studentId.trim(),
        email: userEmail,
        phone: phone.trim(),
        role: "student", // กำหนดสิทธิ์เริ่มต้นเป็นนักศึกษา
        createdAt: new Date().toISOString()
      });

      console.log("บันทึกข้อมูลลง Firestore สำเร็จ!");
      
      Alert.alert(
        "สำเร็จ", 
        "สมัครสมาชิกเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ",
        [{ text: "ตกลง", onPress: () => router.replace('/login') }]
      );

    } catch (error: any) {
      console.error("เกิดข้อผิดพลาดในการสมัคร:", error);
      
      // จัดการ Error ข้อความจาก Firebase ให้เข้าใจง่ายขึ้น
      let errorMsg = "ไม่สามารถสมัครสมาชิกได้";
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = "อีเมลนี้มีผู้ใช้งานแล้ว";
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = "รูปแบบอีเมลไม่ถูกต้อง";
      }
      
      Alert.alert("ข้อผิดพลาด", errorMsg);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* Header & Back Button */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={handleGoBack} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={28} color="#F28C28" />
            </TouchableOpacity>
          </View>

          {/* Logo & Title */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Ionicons name="build" size={46} color="#F28C28" />
            </View>
            <Text style={styles.mainTitle}>Register</Text>
            <Text style={styles.subTitle}>สร้างบัญชีผู้ใช้งานเพื่อแจ้งซ่อม</Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            
            {/* รหัสนักศึกษา */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>รหัสนักศึกษา</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="id-card-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={studentId} 
                  onChangeText={setStudentId} 
                  placeholder="กรอกรหัสนักศึกษา (เช่น B6XXXXXX)"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* อีเมล */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>อีเมล</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={email} 
                  onChangeText={setEmail} 
                  placeholder="example@sut.ac.th"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* เบอร์โทรศัพท์ */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>เบอร์โทรศัพท์</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={phone} 
                  onChangeText={setPhone} 
                  placeholder="08X-XXX-XXXX"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* รหัสผ่าน */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>รหัสผ่าน</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  placeholder="ตั้งรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* ยืนยันรหัสผ่าน */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ยืนยันรหัสผ่าน</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Submit Button */}
            {/* *** แก้ไขปุ่มนี้ให้เรียกใช้ฟังก์ชัน handleRegister *** */}
            <TouchableOpacity style={styles.submitBtn} activeOpacity={0.8} onPress={handleRegister}>
              <Text style={styles.submitBtnText}>สมัครสมาชิก</Text>
            </TouchableOpacity>

            {/* Go to Login Link */}
            <View style={styles.loginHintRow}>
              <Text style={styles.loginHintText}>มีบัญชีผู้ใช้งานอยู่แล้ว? </Text>
              <TouchableOpacity onPress={handleGoBack} activeOpacity={0.7}>
                <Text style={styles.loginLinkText}>เข้าสู่ระบบ</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ==========================================
// Styles
// ==========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardAvoid: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 10, marginBottom: 10 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFF3E8', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F28C28', marginBottom: 16, shadowColor: '#F28C28', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  mainTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 6 },
  subTitle: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  formContainer: { paddingHorizontal: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827', height: '100%' },
  submitBtn: { backgroundColor: '#F28C28', height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 16, shadowColor: '#F28C28', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  loginHintRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  loginHintText: { fontSize: 14, color: '#6B7280' },
  loginLinkText: { fontSize: 14, fontWeight: '700', color: '#F28C28' },
});