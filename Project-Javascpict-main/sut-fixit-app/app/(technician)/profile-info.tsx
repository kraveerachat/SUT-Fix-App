import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';

// ✅ Import Firebase 
import { doc, onSnapshot } from 'firebase/firestore'; // เปลี่ยน getDoc เป็น onSnapshot เพื่อความ Real-time
import { getAuth } from 'firebase/auth';
import { db } from '../../constants/firebaseConfig';

export default function TechProfileInfoScreen() {
  const [techData, setTechData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    const user = auth.currentUser;
    
    // 🔍 เช็คใน Terminal/Console ว่า UID ที่ Login อยู่คืออะไร
    console.log("Current User UID:", user?.uid);

    if (!user) {
      setLoading(false);
      return;
    }

    // ✅ ใช้ onSnapshot เพื่อดึงข้อมูลล่าสุดจาก Database เสมอ
    const docRef = doc(db, "Users", user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        console.log("Database Data Found:", docSnap.data()); // เช็คข้อมูลที่ดึงได้จาก DB
        setTechData(docSnap.data());
      } else {
        console.log("No such document in 'Users' collection for this UID!");
        setTechData(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firebase Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F28C28" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ข้อมูลส่วนตัว</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <Image 
              source={{ uri: `https://ui-avatars.com/api/?name=${techData?.fullName || 'T'}&background=F28C28&color=fff&size=128` }} 
              style={styles.avatarImage} 
            />
          </View>
          {/* ✅ แสดงผลข้อมูล ถ้าใน DB ไม่มีให้แสดง "กำลังโหลดข้อมูล..." หรือ "-" */}
          <Text style={styles.techName}>{techData?.fullName || 'กำลังโหลดข้อมูล...'}</Text>
          <Text style={styles.techRole}>{techData?.techType || '-'}</Text>
        </View>

        <View style={styles.infoContainer}>
          <InfoItem label="ประเภทช่าง" value={techData?.techType || '-'} icon="hammer-outline" />
          <InfoItem label="เบอร์โทรศัพท์" value={techData?.phone || '-'} icon="call-outline" />
          <InfoItem label="อีเมล" value={techData?.email || auth.currentUser?.email || '-'} icon="mail-outline" />
          <InfoItem label="สถานะการทำงาน" value={techData?.isActive ? 'พร้อมทำงาน' : 'พักงาน'} icon="checkmark-circle-outline" />
          <InfoItem label="งานที่ทำสำเร็จแล้ว" value={`${techData?.totalJobsCompleted || 0} งาน`} icon="briefcase-outline" />
          <InfoItem label="คะแนนเฉลี่ย" value={`${techData?.ratingAverage || 0} คะแนน`} icon="star-outline" />
        </View>

        <Text style={styles.footerNote}>* ข้อมูลนี้ดึงมาจากระบบกลาง หากต้องการแก้ไขกรุณาติดต่อ Admin</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ... ส่วน InfoItem และ styles เหมือนเดิม ...
function InfoItem({ label, value, icon }: { label: string; value: string; icon: any }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={20} color="#F28C28" />
      </View>
      <View style={styles.infoTextGroup}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  scrollContent: { paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#F9FAFB' },
  avatarWrapper: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E5E7EB', borderWidth: 4, borderColor: '#FFFFFF', elevation: 4, marginBottom: 16, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  techName: { fontSize: 20, fontWeight: '800', color: '#111827' },
  techRole: { fontSize: 14, color: '#F28C28', fontWeight: '600', marginTop: 4 },
  infoContainer: { paddingHorizontal: 20, paddingTop: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFF3E8', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoTextGroup: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2, fontWeight: '500' },
  infoValue: { fontSize: 15, color: '#111827', fontWeight: '600' },
  footerNote: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 30, fontStyle: 'italic', paddingHorizontal: 20 },
});