import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
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

// 1. นำเข้าคำสั่ง Authentication ของ Firebase
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// 2. นำเข้าคำสั่ง Firestore (แก้ไขเพิ่ม query, where ให้ครบ)
import { collection, getDocs, query, where } from "firebase/firestore";

// 3. นำเข้าฐานข้อมูล db ของเรา (เช็ค path ให้ตรงด้วยนะครับ)
import { db } from '../constants/firebaseConfig'; 

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // ==========================================
  // ฟังก์ชันทดสอบดึงข้อมูลจาก Firebase (ทำงานตอนเปิดหน้าแอพ)
  // ==========================================
  const testFetchData = async () => {
    try {
      console.log("กำลังดึงข้อมูลจากกล่อง Users ทั้งหมด...");
      const querySnapshot = await getDocs(collection(db, "Users"));

      if (querySnapshot.empty) {
        console.log("❌ ไม่พบข้อมูลใดๆ ใน Collection 'Users'");
      } else {
        console.log(`🎉 ดึงข้อมูลสำเร็จ! เจอทั้งหมด ${querySnapshot.size} รายการ`);
        querySnapshot.forEach((doc) => {
          console.log(`- ID: ${doc.id} => ข้อมูลข้างในคือ:`, doc.data());
        });
      }
    } catch (error) {
      console.error("🚨 เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
    }
  };

  useEffect(() => {
    testFetchData();
  }, []);

  // ==========================================
  // ฟังก์ชันเข้าสู่ระบบ (รองรับทั้ง Email และ รหัสนักศึกษา)
  // ==========================================
  const handleLogin = async () => {
    try {
      const auth = getAuth();
      const inputUsername = username.trim(); 
      const pwd = password.trim();

      if (!inputUsername || !pwd) {
        alert("กรุณากรอกรหัสนักศึกษา/อีเมล และรหัสผ่าน");
        return;
      }

      let loginEmail = inputUsername;

      // 1. เช็คว่าสิ่งที่กรอกมาใช่ Email ไหม (โดยดูว่ามีตัว @ หรือเปล่า)
      if (!inputUsername.includes('@')) {
        console.log("ล็อกอินด้วยรหัสนักศึกษา กำลังค้นหาอีเมลที่ผูกไว้...");
        
        // ค้นหาใน Firestore ว่ารหัสนักศึกษานี้ (แปลงเป็นตัวพิมพ์ใหญ่เผื่อไว้) ตรงกับ Email อะไร
        const qId = query(collection(db, "Users"), where("studentId", "==", inputUsername.toUpperCase()));
        const querySnapshotId = await getDocs(qId);

        if (querySnapshotId.empty) {
          // ลองค้นหาแบบตัวพิมพ์เล็ก-ใหญ่ตามที่พิมพ์มาเป๊ะๆ อีกรอบเผื่อไว้
          const qIdExact = query(collection(db, "Users"), where("studentId", "==", inputUsername));
          const querySnapshotExact = await getDocs(qIdExact);
          
          if (querySnapshotExact.empty) {
            alert("ไม่พบข้อมูลรหัสนักศึกษานี้ในระบบ กรุณาสมัครสมาชิก");
            return;
          } else {
            loginEmail = querySnapshotExact.docs[0].data().email;
          }
        } else {
          loginEmail = querySnapshotId.docs[0].data().email;
        }
        
        console.log("พบอีเมลที่ผูกกับรหัสนักศึกษาคือ:", loginEmail);
      } else {
        // ถ้ามีตัว @ แสดงว่าพิมพ์ Email มาโดยตรง ให้ใช้ล็อกอินได้เลย
        loginEmail = inputUsername.toLowerCase();
      }

      console.log("กำลังล็อกอินเข้าสู่ระบบด้วยอีเมล:", loginEmail);
      
      // 2. ตรวจสอบกับ Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, pwd);
      console.log("ล็อกอินสำเร็จ! User ID:", userCredential.user.uid);

      // 3. ไปค้นหา Role ใน Firestore เพื่อส่งไปหน้าจอที่ถูกต้อง
      const qRole = query(collection(db, "Users"), where("email", "==", loginEmail));
      const querySnapshotRole = await getDocs(qRole);

      if (!querySnapshotRole.empty) {
        const userData = querySnapshotRole.docs[0].data();
        const role = userData.role; 
        
        console.log("สิทธิ์การใช้งาน (Role) คือ:", role);

        if (role === 'admin') {
          router.replace('/(admin)/(tabs)' as any);
        } else if (role === 'technician' || role === 'tech') {
          router.replace('/(technician)/(tabs)' as any);
        } else {
          router.replace('/(user)/(tabs)' as any);
        }
      } else {
        // ถ้าหา Role ไม่เจอ ให้เป็น User ธรรมดาไว้ก่อน
        router.replace('/(user)/(tabs)' as any);
      }

    } catch (error: any) {
      console.error("เข้าสู่ระบบล้มเหลว:", error.message);
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        alert("รหัสนักศึกษา หรือ รหัสผ่านไม่ถูกต้อง!");
      } else {
        alert("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      }
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
          {/* ========================================== */}
          {/* Header Section */}
          {/* ========================================== */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../assets/images/logo.png')}
                style={styles.logoImage} 
                resizeMode="contain" 
              />
            </View>
            <Text style={styles.welcomeText}>ยินดีต้อนรับสู่</Text>
            <Text style={styles.appNameText}>SUT FixIt</Text>
            <Text style={styles.subtitleText}>
              ระบบแจ้งซ่อมแซมและบำรุงรักษาหอพัก{'\n'}มหาวิทยาลัยเทคโนโลยีสุรนารี
            </Text>
          </View>

          {/* ========================================== */}
          {/* Form Container */}
          {/* ========================================== */}
          <View style={styles.formContainer}>
            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>รหัสนักศึกษา / Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={username} 
                  onChangeText={setUsername} 
                  placeholder="กรอกอีเมล หรือ รหัสนักศึกษา"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>รหัสผ่าน / Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  placeholder="กรอกรหัสผ่าน"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Forgot Password Link */}
<TouchableOpacity 
  style={styles.forgotPasswordBtn} 
  activeOpacity={0.7}
  onPress={() => router.push('/forgot-password')} // <--- เพิ่มบรรทัดนี้
>
  <Text style={styles.forgotPasswordText}>ลืมรหัสผ่าน?</Text>
</TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity style={styles.loginBtn} activeOpacity={0.8} onPress={handleLogin}>
              <Text style={styles.loginBtnText}>เข้าสู่ระบบ</Text>
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerHintRow}>
              <Text style={styles.registerHintText}>ยังไม่มีบัญชีใช่หรือไม่? </Text>
              <TouchableOpacity onPress={() => router.push('/register')} activeOpacity={0.7}>
                <Text style={styles.registerLinkText}>ลงทะเบียนที่นี่</Text>
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
  scrollContent: { flexGrow: 1, paddingBottom: 40, justifyContent: 'center' },
  
  // ปรับ marginBottom จาก 24 เป็น 40 เพื่อชดเชยพื้นที่กล่องสีฟ้าที่หายไป ให้ Layout ดูโปร่งและสมดุลขึ้น
  headerSection: { alignItems: 'center', marginTop: Platform.OS === 'ios' ? 60 : 40, marginBottom: 40, paddingHorizontal: 20 },
  
  logoContainer: { width: 110, height: 110, marginBottom: 16, justifyContent: 'center', alignItems: 'center' },
  logoImage: { width: '100%', height: '100%' },
  welcomeText: { fontSize: 16, fontWeight: '700', color: '#4B5563', marginBottom: 2 },
  appNameText: { fontSize: 34, fontWeight: '900', color: '#F28C28', marginBottom: 12 },
  subtitleText: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  
  // ส่วนของกล่องโหมดทดสอบถูกลบออกไปแล้ว
  
  formContainer: { paddingHorizontal: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827', height: '100%' },
  forgotPasswordBtn: { alignSelf: 'flex-end', marginBottom: 24, paddingVertical: 4 },
  forgotPasswordText: { fontSize: 13, fontWeight: '700', color: '#F28C28' },
  loginBtn: { backgroundColor: '#F28C28', height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: '#F28C28', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  registerHintRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  registerHintText: { fontSize: 14, color: '#6B7280' },
  registerLinkText: { fontSize: 14, fontWeight: '800', color: '#F28C28' },
});