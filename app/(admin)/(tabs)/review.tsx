import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Image, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, ActivityIndicator, Alert,
} from 'react-native';

import { getAuth } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../constants/firebaseConfig'; 

const STATUS_TABS = ['ทั้งหมด', 'รอตรวจงาน', 'กำลังซ่อม', 'เสร็จสิ้น'];

const formatThaiDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear() + 543;
  return `${d} ${m} ${y}`;
};

export default function AdminReviewScreen() {
  const [activeTab, setActiveTab] = useState('รอตรวจงาน');
  const [tasks, setTasks] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  const [openDetail, setOpenDetail] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [techInfo, setTechInfo] = useState<any>(null); 

  const [unreadCount, setUnreadCount] = useState(0);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    let unsubTasks = () => {};
    let unsubUser = () => {};
    let unsubNotif = () => {};

    // 🛠️ แก้ไข: เพิ่ม "รอตรวจสอบ" และ "ซ่อมแซมเสร็จสิ้น" เข้าไปในการดึงข้อมูลจาก DB
    const q = query(collection(db, "Reports"), where("status", "in", ["กำลังดำเนินการ", "กำลังซ่อม", "รอตรวจงาน", "รอตรวจสอบ", "เสร็จสมบูรณ์", "เสร็จสิ้น", "ซ่อมแซมเสร็จสิ้น", "Approved"]));
    
    unsubTasks = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
      setTasks(data);
      setLoading(false);
    });

    unsubUser = onSnapshot(doc(db, "Users", user.uid), (docSnap) => {
      if (docSnap.exists()) setUserData(docSnap.data());
    });

    const qNotif = query(collection(db, "Notifications"), where("targetUid", "==", user.uid), where("isRead", "==", false));
    unsubNotif = onSnapshot(qNotif, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => { unsubTasks(); unsubUser(); unsubNotif(); };
  }, []);

  const handleOpenReview = async (task: any) => {
    setSelectedTask(task);
    setOpenDetail(true);
    setTechInfo(null);

    const tId = task.techId || task.technicianId || task.technician_id || task.workerId;
    if (tId) {
      try {
        const userSnap = await getDoc(doc(db, "Users", tId));
        if (userSnap.exists()) setTechInfo(userSnap.data()); 
      } catch (error) {
        console.error("Error fetching tech info:", error);
      }
    } else if (task.techName || task.technicianName) {
      setTechInfo({ fullName: task.techName || task.technicianName });
    }
  };

  const handleApproveWork = async () => {
    if (!selectedTask) return;
    
    Alert.alert("ยืนยันการอนุมัติ", "คุณต้องการอนุมัติและปิดงานนี้ใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      { 
        text: "อนุมัติ", 
        onPress: async () => {
          try {
            const reportRef = doc(db, "Reports", selectedTask.id);
            await updateDoc(reportRef, {
              status: "เสร็จสิ้น", 
              approvedAt: new Date().toISOString()
            });

            if (selectedTask.userId) {
                await addDoc(collection(db, "Notifications"), {
                    targetUid: selectedTask.userId,
                    title: "งานได้รับการอนุมัติเรียบร้อย ✅",
                    body: `แอดมินได้ตรวจสอบและอนุมัติงานซ่อม "${selectedTask.title}" แล้ว`,
                    isRead: false,
                    type: "status_update",
                    category: selectedTask.category,
                    jobId: selectedTask.id,
                    createdAt: serverTimestamp()
                });
            }

            setOpenDetail(false);
            Alert.alert("สำเร็จ", "อนุมัติและส่งแจ้งเตือนปิดงานเรียบร้อยแล้ว");
          } catch (error) {
            Alert.alert("ผิดพลาด", "ไม่สามารถอนุมัติงานได้");
          }
        }
      }
    ]);
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'ประปา': return { icon: 'water', color: '#0EA5E9', bg: '#E0F2FE' };
      case 'ไฟฟ้า': return { icon: 'flash', color: '#EAB308', bg: '#FEF9C3' };
      default: return { icon: 'build', color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'ทั้งหมด') return true;
    
    // 🛠️ แก้ไข: เพิ่ม "รอตรวจสอบ" และ "ซ่อมแซมเสร็จสิ้น" ใน Tab รอตรวจงาน
    if (activeTab === 'รอตรวจงาน') return task.status === 'เสร็จสมบูรณ์' || task.status === 'รอตรวจงาน' || task.status === 'รอตรวจสอบ' || task.status === 'ซ่อมแซมเสร็จสิ้น';
    
    if (activeTab === 'กำลังซ่อม') return task.status === 'กำลังดำเนินการ' || task.status === 'กำลังซ่อม';
    if (activeTab === 'เสร็จสิ้น') return task.status === 'เสร็จสิ้น' || task.status === 'Approved';
    return false;
  });

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
        <View style={styles.pageHeader}><Text style={styles.pageTitle}>ตรวจงาน</Text></View>
        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {STATUS_TABS.map((tab) => (
              <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.listContainer}>
          {loading ? <ActivityIndicator size="large" color="#F28C28" style={{marginTop: 40}} /> : 
           filteredTasks.length === 0 ? (
             <View style={{alignItems: 'center', marginTop: 60}}><Ionicons name="checkmark-done-circle-outline" size={60} color="#D1D5DB" /><Text style={{color: '#9CA3AF', marginTop: 10}}>ไม่มีรายการในหมวดหมู่นี้</Text></View>
           ) : filteredTasks.map((task) => {
            const config = getCategoryConfig(task.category);
            
            // 🛠️ แก้ไข: อัปเดตเงื่อนไข isWaiting ให้ตรงกับสถานะใหม่
            const isWaiting = task.status === 'เสร็จสมบูรณ์' || task.status === 'รอตรวจงาน' || task.status === 'รอตรวจสอบ' || task.status === 'ซ่อมแซมเสร็จสิ้น';

            return (
              <TouchableOpacity key={task.id} style={styles.ticketCard} onPress={() => handleOpenReview(task)}>
                <View style={[styles.urgencyIndicator, { backgroundColor: config.color }]} />
                <View style={styles.ticketContent}>
                  <View style={styles.ticketHeader}>
                    <Text style={styles.taskIdText}>หมายเลขซ่อม: {task.id.substring(0, 6).toUpperCase()}</Text>
                    {isWaiting && <View style={styles.reviewBadge}><Text style={styles.reviewBadgeText}>ตรวจสอบงาน</Text></View>}
                  </View>
                  <Text style={styles.locationTitle}>{task.dorm} ・ ห้อง {task.room}</Text>
                  <Text style={styles.issueTitle} numberOfLines={1}>{task.title}</Text>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeText}>อัปเดตเมื่อ {task.updatedAt || task.closedAt || task.finishedAt ? formatThaiDate(task.updatedAt || task.closedAt || task.finishedAt) : '-'}</Text>
                    <Text style={[styles.statusSuccessText, task.status !== 'เสร็จสิ้น' && {color: '#F59E0B'}]}>{task.status === 'กำลังดำเนินการ' ? 'กำลังซ่อม' : task.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal รายละเอียดงาน */}
      <Modal visible={openDetail} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.detailBox}>
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setOpenDetail(false)}><Ionicons name="chevron-back" size={26} color="#111827" /></TouchableOpacity>
              <Text style={styles.detailTitle}>ตรวจสอบงานซ่อม</Text>
              <View style={{width: 30}} />
            </View>

            {selectedTask && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.techInfoRow}>
                  <Image source={{ uri: techInfo?.avatar || `https://ui-avatars.com/api/?name=${techInfo?.fullName || techInfo?.name || 'T'}&background=F28C28&color=fff` }} style={styles.techAvatar} />
                  <View style={styles.techInfoTextGroup}>
                    <Text style={styles.techNameTitle}>ช่าง: {techInfo?.fullName || techInfo?.name || selectedTask.techName || 'ไม่ระบุชื่อ'}</Text>
                    <Text style={styles.techPhoneText}>เบอร์ติดต่อ {techInfo?.phone || '-'}</Text>
                  </View>
                </View>

                <View style={[styles.sectionBlock, {backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, marginBottom: 20}]}>
                    <Text style={[styles.sectionBlockTitle, {fontSize: 14}]}>📝 รายละเอียดปัญหา</Text>
                    <Text style={{fontSize: 14, color: '#374151'}}>{selectedTask.title}</Text>
                    <Text style={{fontSize: 12, color: '#6B7280', marginTop: 4}}>{selectedTask.detail || 'ไม่มีรายละเอียดเพิ่มเติม'}</Text>
                </View>

                <Text style={styles.sectionBlockTitle}>รูปภาพประกอบการซ่อม</Text>
                <View style={styles.imageComparisonContainer}>
                  <View style={styles.imageBox}>
                    <Text style={styles.imageSubTitle}>ก่อนซ่อม</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {selectedTask.images && selectedTask.images.length > 0 ? (
                            selectedTask.images.map((img: string, i: number) => (
                                <Image key={i} source={{ uri: img }} style={[styles.compareImage, {marginRight: 8, width: 140}]} />
                            ))
                        ) : (
                            <Image source={{ uri: 'https://via.placeholder.com/150' }} style={styles.compareImage} />
                        )}
                    </ScrollView>
                  </View>
                  <View style={styles.imageBox}>
                    <Text style={styles.imageSubTitle}>หลังซ่อม</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {selectedTask.afterImages && selectedTask.afterImages.length > 0 ? (
                            selectedTask.afterImages.map((img: string, i: number) => (
                                <Image key={i} source={{ uri: img }} style={[styles.compareImage, {marginRight: 8, width: 140, borderColor: '#10B981', borderWidth: 2}]} />
                            ))
                        ) : selectedTask.finishImage ? (
                            <Image source={{ uri: selectedTask.finishImage }} style={[styles.compareImage, {borderColor: '#10B981', borderWidth: 2}]} />
                        ) : (
                            <Image source={{ uri: 'https://via.placeholder.com/150' }} style={[styles.compareImage, {borderColor: '#10B981', borderWidth: 2}]} />
                        )}
                    </ScrollView>
                  </View>
                </View>

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionBlockTitle}>สรุปงานจากช่าง</Text>
                  <View style={styles.noteBox}>
                    <Text style={styles.noteText}>รายละเอียด: <Text style={{fontWeight: '500'}}>{selectedTask.closingDetail || selectedTask.finishDetail || selectedTask.action || 'ไม่มีการบันทึกรายละเอียด'}</Text></Text>
                    <View style={styles.dividerLine} />
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        <Text style={[styles.noteText, {color: '#6B7280'}]}>ค่าวัสดุอุปกรณ์:</Text>
                        <Text style={{fontSize: 16, fontWeight: '800', color: '#EF4444'}}>{selectedTask.materialCost || selectedTask.cost || '0'} บาท</Text>
                    </View>
                  </View>
                </View>

                {/* 🛠️ แก้ไข: อัปเดตเงื่อนไขปุ่มอนุมัติ */}
                {(selectedTask.status === 'เสร็จสมบูรณ์' || selectedTask.status === 'รอตรวจงาน' || selectedTask.status === 'รอตรวจสอบ' || selectedTask.status === 'ซ่อมแซมเสร็จสิ้น') && (
                  <TouchableOpacity style={styles.approveBtn} onPress={handleApproveWork}>
                    <Ionicons name="checkmark-done" size={20} color="#059669" style={{marginRight: 8}}/>
                    <Text style={styles.approveBtnText}>อนุมัติและปิดงาน</Text>
                  </TouchableOpacity>
                )}
                <View style={{height: 20}}/>
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
  appName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  appSubtitle: { fontSize: 11, fontWeight: '600', color: '#EF4444', marginTop: 2 },
  notificationBtn: { padding: 8, position: 'relative' },
  notificationBadge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, backgroundColor: '#EF4444', borderRadius: 9, borderWidth: 1.5, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 40 },
  pageHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  tabContainer: { marginBottom: 16 },
  tabScroll: { paddingHorizontal: 20, gap: 10 },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  tabBtnActive: { backgroundColor: '#F28C28', borderColor: '#E67E22' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#FFFFFF' },
  listContainer: { paddingHorizontal: 20 },
  ticketCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, elevation: 3, borderWidth: 1, borderColor: '#F3F4F6', overflow: 'hidden' },
  urgencyIndicator: { width: 6 },
  ticketContent: { flex: 1, padding: 16 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  taskIdText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  reviewBadge: { backgroundColor: '#FEF08A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  reviewBadgeText: { fontSize: 11, fontWeight: '800', color: '#B45309' },
  locationTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
  issueTitle: { fontSize: 14, color: '#6B7280', marginBottom: 10 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeText: { fontSize: 12, color: '#9CA3AF' },
  statusSuccessText: { fontSize: 13, fontWeight: '800', color: '#10B981' },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  detailBox: { width: "100%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, maxHeight: '90%' },
  detailHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  detailTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  techInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  techAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 16, backgroundColor: '#F28C28' },
  techInfoTextGroup: { flex: 1 },
  techNameTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
  techPhoneText: { fontSize: 13, color: '#6B7280' },
  imageComparisonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  imageBox: { width: '48%' },
  imageSubTitle: { fontSize: 13, color: '#6B7280', marginBottom: 8, fontWeight: '600' },
  compareImage: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#F3F4F6' },
  sectionBlock: { marginBottom: 20 },
  sectionBlockTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 10 },
  noteBox: { backgroundColor: '#FFF7ED', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FFEDD5' },
  noteText: { fontSize: 14, color: '#C2410C', lineHeight: 22 },
  dividerLine: { height: 1, backgroundColor: '#FED7AA', marginVertical: 12 },
  approveBtn: { flexDirection: 'row', backgroundColor: '#D1FAE5', paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  approveBtnText: { fontSize: 16, fontWeight: '800', color: '#059669' },
});