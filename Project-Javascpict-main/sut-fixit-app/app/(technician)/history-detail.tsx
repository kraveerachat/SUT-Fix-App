import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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

// 1. เชื่อมต่อ Firebase
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from '../../constants/firebaseConfig'; 

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams(); 
  const [job, setJob] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 2. ดึงข้อมูลใบงานและข้อมูลผู้แจ้งจริงจาก Database
  useEffect(() => {
    if (!id) return;
    const docRef = doc(db, "Reports", id as string);
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const jobData = docSnap.data();
        setJob(jobData);
        
        const userRef = doc(db, "Users", jobData.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) setUserData(userSnap.data());
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons 
            key={star} 
            name={star <= rating ? "star" : "star-outline"} 
            size={18} 
            color={star <= rating ? "#F59E0B" : "#D1D5DB"} 
          />
        ))}
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#F28C28" /></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={28} color="#F28C28" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>รายละเอียดงาน (เสร็จสิ้น)</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.statusBanner}>
          <Ionicons name="checkmark-circle" size={28} color="#10B981" />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusMainText}>งานนี้เสร็จสมบูรณ์แล้ว</Text>
            <Text style={styles.statusSubText}>
                ดำเนินการเสร็จเมื่อ: {job?.closedAt || job?.approvedAt ? new Date(job.closedAt || job.approvedAt).toLocaleString('th-TH') : '-'}
            </Text>
          </View>
        </View>

        <View style={styles.infoBlock}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>หมายเลขแจ้งซ่อม</Text>
            <Text style={styles.infoValue}>#{(id as string).substring(0, 8).toUpperCase()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ประเภทงาน</Text>
            <Text style={styles.infoValue}>{job?.category}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>สถานที่</Text>
            <Text style={styles.infoValue}>{job?.dorm}, ห้อง {job?.room}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ผู้แจ้ง (เบอร์โทร)</Text>
            <Text style={styles.infoValue}>{userData?.phone || 'ไม่ระบุ'}</Text>
          </View>
        </View>

        {/* ประเมินความพึงพอใจ */}
        {(job?.rating || job?.isReviewed) && (
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.sectionTitle}>ประเมินความพึงพอใจจากผู้แจ้ง</Text>
            <View style={styles.ratingCard}>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>คุณภาพการซ่อมแซม</Text>
                {renderStars(job?.rating?.quality || job?.rating?.satisfaction || job?.qualityRating || 0)}
              </View>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>ความรวดเร็วในการบริการ</Text>
                {renderStars(job?.rating?.speed || job?.speedRating || 0)}
              </View>
              
              {(job?.rating?.comment || job?.reviewComment) && (
                <View style={styles.commentBox}>
                  <Text style={styles.commentText}>"{job.rating?.comment || job.reviewComment}"</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ⭐️ แกลเลอรี่ภาพแบบ Grid ที่แก้ไขเรื่องภาพแฟบแล้ว */}
        
        {/* รูปก่อนซ่อม */}
        <Text style={styles.sectionTitle}>ภาพประกอบ (ก่อนซ่อม)</Text>
        {job?.images && job.images.length > 0 ? (
            <View style={styles.imageGrid}>
              {job.images.map((uri: string, idx: number) => (
                  <Image key={`before-${idx}`} source={{ uri }} style={styles.gridImage} />
              ))}
            </View>
        ) : (
            <View style={styles.noImagePlaceholder}>
              <Ionicons name="image-outline" size={24} color="#9CA3AF" />
              <Text style={styles.noImageText}>ไม่มีภาพประกอบก่อนซ่อม</Text>
            </View>
        )}

        {/* รูปหลังซ่อม */}
        <Text style={styles.sectionTitle}>ส่งงานภาพ (หลังซ่อม)</Text>
        {(job?.afterImages && job.afterImages.length > 0) || job?.afterImage ? (
            <View style={styles.imageGrid}>
              {(job.afterImages || [job.afterImage]).map((uri: string, idx: number) => (
                  <Image key={`after-${idx}`} source={{ uri }} style={styles.gridImage} />
              ))}
            </View>
        ) : (
            <View style={styles.noImagePlaceholder}>
              <Ionicons name="image-outline" size={24} color="#9CA3AF" />
              <Text style={styles.noImageText}>ไม่มีภาพประกอบหลังซ่อม</Text>
            </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>บันทึกรายละเอียดการทำงาน</Text>
        <View style={styles.readOnlyBox}>
          <Text style={styles.readOnlyText}>{job?.closingDetail || job?.action || 'ไม่มีบันทึกรายละเอียด'}</Text>
        </View>

        <Text style={styles.sectionTitle}>สรุปค่าใช้จ่าย</Text>
        <View style={styles.costBox}>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>ค่าวัสดุอุปกรณ์</Text>
            <Text style={styles.costValue}>{job?.materialCost || job?.cost || '0'} บาท</Text>
          </View>
          <View style={[styles.costRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12, marginTop: 12 }]}>
            <Text style={styles.totalLabel}>ยอดรวมสุทธิ</Text>
            <Text style={styles.totalValue}>{job?.materialCost || job?.cost || '0'} บาท</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const DARK_TEXT = '#111827';
const GRAY_TEXT = '#6B7280';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 15, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: DARK_TEXT },
  headerRight: { width: 44 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#A7F3D0' },
  statusTextContainer: { marginLeft: 12, flex: 1 },
  statusMainText: { fontSize: 16, fontWeight: '800', color: '#065F46', marginBottom: 2 },
  statusSubText: { fontSize: 13, color: '#047857' },
  infoBlock: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: 14, color: GRAY_TEXT, fontWeight: '500' },
  infoValue: { fontSize: 15, fontWeight: '700', color: DARK_TEXT },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: DARK_TEXT, marginBottom: 12, marginLeft: 4 },
  
  ratingCard: { backgroundColor: '#FFFBEB', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FEF3C7' },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  ratingLabel: { fontSize: 14, color: '#4B5563', fontWeight: '700' },
  starRow: { flexDirection: 'row', gap: 4 },
  commentBox: { marginTop: 12, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A' },
  commentText: { fontSize: 14, color: '#D97706', fontStyle: 'italic', lineHeight: 22 },

  // ⭐️ แก้ไขให้แสดงผลชัวร์ 100% ไม่มีแฟบ
  imageGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', // ใช้ตัวนี้ดันรูปซ้าย-ขวา แทน gap
    marginBottom: 24 
  },
  gridImage: { 
    width: '48%', 
    height: 160, // ล็อกความสูงตายตัว ป้องกันรูปแฟบ
    marginBottom: 12, // ระยะห่างบรรทัดล่าง แทน gap
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6'
  },
  noImagePlaceholder: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F9FAFB', 
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    borderStyle: 'dashed', 
    marginBottom: 24 
  },
  noImageText: { fontSize: 14, color: '#9CA3AF', marginLeft: 8 },

  readOnlyBox: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, marginBottom: 24 },
  readOnlyText: { fontSize: 15, color: '#4B5563', lineHeight: 24 },
  costBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F3F4F6' },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costLabel: { fontSize: 15, color: GRAY_TEXT },
  costValue: { fontSize: 15, fontWeight: '600', color: DARK_TEXT },
  totalLabel: { fontSize: 16, fontWeight: '800', color: DARK_TEXT },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#EF4444' },
});