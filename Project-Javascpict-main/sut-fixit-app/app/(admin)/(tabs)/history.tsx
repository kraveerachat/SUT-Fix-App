import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  FlatList, Image, Modal, Platform, SafeAreaView, ScrollView,
  StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Alert
} from 'react-native';

import { getAuth } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../constants/firebaseConfig'; 

const formatThaiDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear() + 543;
  return `${d} ${m} ${y}`;
};

export default function AdminHistoryScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<any>(null);
  const [reporterInfo, setReporterInfo] = useState<any>(null);
  const [techInfo, setTechInfo] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const qTasks = query(collection(db, "Reports"), where("status", "in", ["เสร็จสิ้น", "เสร็จสมบูรณ์", "Approved"]));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => {
          const timeA = a.closedAt || a.createdAt ? new Date(a.closedAt || a.createdAt).getTime() : 0;
          const timeB = b.closedAt || b.createdAt ? new Date(b.closedAt || b.createdAt).getTime() : 0;
          return timeB - timeA;
      });
      setTasks(data);
      setLoading(false);
    });

    const unsubUser = onSnapshot(doc(db, "Users", user.uid), (docSnap) => {
      if (docSnap.exists()) setUserData(docSnap.data());
    });

    const qNotif = query(collection(db, "Notifications"), where("targetUid", "==", user.uid), where("isRead", "==", false));
    const unsubNotif = onSnapshot(qNotif, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => { unsubTasks(); unsubUser(); unsubNotif(); };
  }, []);

  const handleOpenDetail = async (task: any) => {
    setSelectedRepair(task);
    setOpenDetail(true);
    setReporterInfo(null);
    setTechInfo(null);

    try {
      if (task.userId) {
        const uSnap = await getDoc(doc(db, "Users", task.userId));
        if (uSnap.exists()) setReporterInfo(uSnap.data());
      }
      const technicianId = task.techId || task.technicianId || task.workerId; 
      if (technicianId) {
        const tSnap = await getDoc(doc(db, "Users", technicianId));
        if (tSnap.exists()) setTechInfo(tSnap.data());
      }
    } catch (error) {
      console.error("Error fetching detail info:", error);
    }
  };

  // 🚀 ฟังก์ชันลบคอมเมนต์ และสั่งซ่อนงานจากฝั่งช่าง
  const handleDeleteComment = (jobId: string) => {
    Alert.alert("ยืนยันการลบและการซ่อน", "ลบคอมเมนต์นี้และซ่อนประวัตินี้จากหน้าจอของช่างใช่หรือไม่? (แอดมินยังเห็นอยู่)", [
      { text: "ยกเลิก", style: "cancel" },
      { 
        text: "ลบและซ่อน", 
        style: "destructive", 
        onPress: async () => {
          try {
            const jobRef = doc(db, "Reports", jobId);
            await updateDoc(jobRef, {
              "rating.comment": "",
              "reviewComment": "",
              "hideFromTech": true // ✅ เพิ่มคำสั่งซ่อนจากช่างตรงนี้
            });
            
            setSelectedRepair((prev: any) => ({
                ...prev,
                reviewComment: "",
                rating: { ...prev.rating, comment: "" },
                hideFromTech: true
            }));
            
            Alert.alert("สำเร็จ", "ลบคอมเมนต์และซ่อนประวัติจากช่างเรียบร้อยแล้ว");
          } catch (error) {
            Alert.alert("ผิดพลาด", "ไม่สามารถดำเนินการได้");
          }
        }
      }
    ]);
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'ประปา': return { icon: 'water', color: '#0EA5E9', bg: '#E0F2FE' };
      case 'ไฟฟ้า': return { icon: 'flash', color: '#EAB308', bg: '#FEF9C3' };
      case 'แอร์': return { icon: 'snow', color: '#06B6D4', bg: '#CFFAFE' };
      case 'เฟอร์นิเจอร์': return { icon: 'bed', color: '#8B5CF6', bg: '#EDE9FE' };
      default: return { icon: 'build', color: '#F28C28', bg: '#FFF3E8' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image source={require('../../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
          <View>
            <Text style={styles.appName}>SUT FixIt</Text>
            <Text style={styles.appSubtitle}>ผู้ดูแลระบบ (Admin)</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push('/(admin)/notifications' as any)}>
          <Ionicons name="notifications-outline" size={26} color="#111" />
          {userData?.pushEnabled !== false && unreadCount > 0 && (
             <View style={styles.notificationBadge}><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}><Text style={styles.pageTitle}>ประวัติการซ่อมทั้งหมด</Text></View>
        <View style={styles.listContainer}>
          {loading ? <ActivityIndicator size="large" color="#F28C28" style={{marginTop: 50}} /> : tasks.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Ionicons name="documents-outline" size={60} color="#D1D5DB" />
                <Text style={styles.emptyText}>ไม่มีประวัติการแจ้งซ่อม</Text>
            </View>
          ) : tasks.map((task) => {
            const config = getCategoryConfig(task.category);
            return (
              <TouchableOpacity key={task.id} style={styles.historyCard} onPress={() => handleOpenDetail(task)}>
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: config.bg }]}><Ionicons name={config.icon as any} size={14} color={config.color} /><Text style={[styles.badgeTextCategory, { color: config.color }]}>{task.category}</Text></View>
                  <Text style={styles.dateText}>{task.createdAt ? formatThaiDate(task.createdAt) : '-'}</Text>
                </View>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.locationText}>{task.dorm} ・ ห้อง {task.room}</Text>
                <View style={styles.cardFooter}>
                  <View style={styles.statusBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.statusText}>เสร็จสิ้น</Text>
                  </View>
                  {(task.isReviewed || task.rating) && (
                    <View style={{flexDirection: 'row', alignItems: 'center', marginLeft: 10}}>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={{fontSize: 12, color: '#F59E0B', marginLeft: 4, fontWeight: '700'}}>รีวิวแล้ว</Text>
                    </View>
                  )}
                  {/* ✅ แจ้งเตือนแอดมินว่างานนี้ถูกซ่อนจากช่างแล้ว */}
                  {task.hideFromTech && (
                    <View style={{flexDirection: 'row', alignItems: 'center', marginLeft: 10}}>
                        <Ionicons name="eye-off" size={14} color="#EF4444" />
                        <Text style={{fontSize: 12, color: '#EF4444', marginLeft: 4, fontWeight: '700'}}>ซ่อนจากช่างแล้ว</Text>
                    </View>
                  )}
                  <View style={{flex: 1}}/>
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={openDetail} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.detailBox}>
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setOpenDetail(false)}><Ionicons name="close" size={28} color="#6B7280" /></TouchableOpacity>
              <Text style={styles.detailTitle}>รายละเอียดการแจ้งซ่อม</Text>
              <View style={{width: 28}} />
            </View>

            {selectedRepair && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={styles.detailIssueTitle}>{selectedRepair.title}</Text>
                <View style={styles.detailInfoBox}>
                  <Text style={styles.infoLabel}>ผู้แจ้ง: <Text style={styles.infoValue}>{reporterInfo?.fullName || reporterInfo?.name || selectedRepair.name || '-'}</Text></Text>
                  <Text style={styles.infoLabel}>รหัสนักศึกษา: <Text style={styles.infoValue}>{reporterInfo?.studentId || selectedRepair.studentId || '-'}</Text></Text>
                  <Text style={styles.infoLabel}>เบอร์ผู้แจ้ง: <Text style={styles.infoValue}>{reporterInfo?.phone || selectedRepair.phone || '-'}</Text></Text>
                  <Text style={styles.infoLabel}>สถานที่: <Text style={styles.infoValue}>{selectedRepair.dorm} / {selectedRepair.room}</Text></Text>
                  <View style={styles.detailDivider} />
                  <Text style={styles.infoLabel}>ช่างผู้ซ่อม: <Text style={styles.infoValue}>{techInfo?.fullName || techInfo?.name || '-'}</Text></Text>
                  <Text style={styles.infoLabel}>รายละเอียดการซ่อม: <Text style={styles.infoValue}>{selectedRepair.action || selectedRepair.closingDetail || '-'}</Text></Text>
                  <Text style={styles.infoLabel}>ค่าวัสดุอุปกรณ์: <Text style={[styles.infoValue, {color: '#EF4444'}]}>{selectedRepair.cost || selectedRepair.materialCost || '0'} บาท</Text></Text>
                </View>

                {(selectedRepair.rating || selectedRepair.isReviewed) && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={styles.sectionLabel}>ผลการประเมินจากผู้แจ้ง</Text>
                    <View style={styles.ratingCard}>
                      <View style={styles.ratingRow}>
                        <Text style={styles.ratingLabel}>คุณภาพการซ่อมแซม</Text>
                        <View style={styles.starRow}>
                          {[1, 2, 3, 4, 5].map((star) => {
                            const score = selectedRepair.rating?.quality || selectedRepair.rating?.satisfaction || selectedRepair.qualityRating || 0;
                            return <Ionicons key={star} name={star <= score ? "star" : "star-outline"} size={16} color={star <= score ? "#F59E0B" : "#D1D5DB"} />;
                          })}
                        </View>
                      </View>
                      <View style={styles.ratingRow}>
                        <Text style={styles.ratingLabel}>ความรวดเร็วในการบริการ</Text>
                        <View style={styles.starRow}>
                          {[1, 2, 3, 4, 5].map((star) => {
                            const score = selectedRepair.rating?.speed || selectedRepair.speedRating || 0;
                            return <Ionicons key={star} name={star <= score ? "star" : "star-outline"} size={16} color={star <= score ? "#F59E0B" : "#D1D5DB"} />;
                          })}
                        </View>
                      </View>
                      
                      {(selectedRepair.rating?.comment || selectedRepair.reviewComment) ? (
                        <View style={styles.commentBox}>
                          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                            <Text style={styles.commentText}>"{selectedRepair.rating?.comment || selectedRepair.reviewComment}"</Text>
                            <TouchableOpacity 
                                style={styles.deleteCommentBtn} 
                                onPress={() => handleDeleteComment(selectedRepair.id)}
                            >
                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </View>
                )}

                <Text style={styles.sectionLabel}>ภาพประกอบ (ก่อนซ่อม)</Text>
                {selectedRepair.images && selectedRepair.images.length > 0 ? (
                    <View style={styles.imageGrid}>
                      {selectedRepair.images.map((uri: string, idx: number) => (
                          <Image key={`before-${idx}`} source={{ uri }} style={styles.gridImage} />
                      ))}
                    </View>
                ) : (
                    <View style={styles.noImagePlaceholder}><Ionicons name="image-outline" size={24} color="#9CA3AF" /><Text style={styles.noImageText}>ไม่มีภาพประกอบก่อนซ่อม</Text></View>
                )}

                <Text style={styles.sectionLabel}>ส่งงานภาพ (หลังซ่อม)</Text>
                {(selectedRepair.afterImages && selectedRepair.afterImages.length > 0) || selectedRepair.afterImage ? (
                    <View style={styles.imageGrid}>
                      {(selectedRepair.afterImages || [selectedRepair.afterImage]).map((uri: string, idx: number) => (
                          <Image key={`after-${idx}`} source={{ uri }} style={styles.gridImage} />
                      ))}
                    </View>
                ) : (
                    <View style={styles.noImagePlaceholder}><Ionicons name="image-outline" size={24} color="#9CA3AF" /><Text style={styles.noImageText}>ไม่มีภาพประกอบหลังซ่อม</Text></View>
                )}

                <View style={styles.timeFooter}>
                  <Text style={styles.timeLabel}>ดำเนินการสำเร็จเมื่อ: {selectedRepair.closedAt || selectedRepair.approvedAt ? formatThaiDate(selectedRepair.closedAt || selectedRepair.approvedAt) : '-'}</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 15, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { width: 44, height: 44, borderRadius: 10, marginRight: 12 },
  appName: { fontSize: 18, fontWeight: '800' },
  appSubtitle: { fontSize: 11, fontWeight: '600', color: '#EF4444', marginTop: 2 },
  notificationBtn: { padding: 8, position: 'relative' },
  notificationBadge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, backgroundColor: '#EF4444', borderRadius: 9, borderWidth: 1.5, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 30 },
  pageHeader: { padding: 20 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  listContainer: { paddingHorizontal: 20 },
  historyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 },
  badgeTextCategory: { fontSize: 12, fontWeight: '700' },
  dateText: { fontSize: 12, color: '#9CA3AF' },
  taskTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  locationText: { fontSize: 14, color: '#4B5563', marginBottom: 15 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 14, fontWeight: '700', color: '#10B981' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, fontSize: 16, color: '#9CA3AF' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  detailBox: { width: '90%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, maxHeight: '85%', elevation: 10 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  detailTitle: { fontSize: 18, fontWeight: '800' },
  detailIssueTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 15 },
  detailInfoBox: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, gap: 10, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  infoLabel: { fontWeight: '700', color: '#6B7280', fontSize: 14 },
  infoValue: { fontWeight: '400', color: '#111827' },
  detailDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  sectionLabel: { fontSize: 16, fontWeight: '800', marginBottom: 14, color: '#111827' },
  ratingCard: { backgroundColor: '#FFFBEB', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FEF3C7' },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ratingLabel: { fontSize: 14, color: '#4B5563', fontWeight: '600' },
  starRow: { flexDirection: 'row', gap: 2 },
  commentBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#FDE68A' },
  commentText: { fontSize: 14, color: '#D97706', fontStyle: 'italic', lineHeight: 22, flex: 1, marginRight: 10 },
  deleteCommentBtn: { padding: 4, backgroundColor: '#FEE2E2', borderRadius: 6 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  gridImage: { width: '48%', height: 140, marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F3F4F6' },
  noImagePlaceholder: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', marginBottom: 20 },
  noImageText: { fontSize: 14, color: '#9CA3AF', marginLeft: 8 },
  timeFooter: { marginTop: 10, alignItems: 'center' },
  timeLabel: { fontSize: 12, color: '#9CA3AF' }
});