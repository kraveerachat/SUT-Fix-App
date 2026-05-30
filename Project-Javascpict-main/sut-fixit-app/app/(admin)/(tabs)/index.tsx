import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';

import { getAuth } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../constants/firebaseConfig';
import { API_URL } from '../../../constants/api';

const STATUS_TABS      = ['ทั้งหมด', 'รอดำเนินการ', 'กำลังซ่อม', 'รอตรวจสอบ', 'เสร็จสิ้น'];
const DATE_OPTIONS     = ['ทั้งหมด', 'วันนี้', 'เมื่อวาน', '7 วันที่แล้ว', 'เดือนนี้'];
const CATEGORY_OPTIONS = ['ทั้งหมด', 'ประปา', 'ไฟฟ้า', 'เฟอร์นิเจอร์', 'เครื่องใช้ไฟฟ้า', 'อื่นๆ'];
const SORT_OPTIONS     = ['ใหม่ล่าสุด', 'เก่าที่สุด'];

const FEMALE_DORMS = ['สุรนิเวศ 1', 'สุรนิเวศ 2', 'สุรนิเวศ 3', 'สุรนิเวศ 4', 'สุรนิเวศ 5', 'สุรนิเวศ 6', 'สุรนิเวศ 14', 'สุรนิเวศ 15', 'สุรนิเวศ 16'];
const MALE_DORMS   = ['สุรนิเวศ 7', 'สุรนิเวศ 8', 'สุรนิเวศ 9', 'สุรนิเวศ 10', 'สุรนิเวศ 11', 'สุรนิเวศ 12', 'สุรนิเวศ 13', 'สุรนิเวศ 17'];
const DORM_SECTIONS = [
  { title: '🏠 หอพักหญิง', data: FEMALE_DORMS },
  { title: '🏠 หอพักชาย',  data: MALE_DORMS   },
];

const matchesDateFilter = (createdAt: string, filter: string): boolean => {
  if (!createdAt || filter === 'ทั้งหมด' || filter === 'วันที่') return true;
  const taskDate     = new Date(createdAt);
  const now          = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filter === 'วันนี้') return taskDate >= startOfToday;
  if (filter === 'เมื่อวาน') {
    const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    return taskDate >= startOfYesterday && taskDate < startOfToday;
  }
  if (filter === '7 วันที่แล้ว') {
    const sevenDaysAgo = new Date(startOfToday); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return taskDate >= sevenDaysAgo;
  }
  if (filter === 'เดือนนี้') {
    return taskDate >= new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return true;
};

const formatThaiDate = (dateString: string) => {
  if (!dateString) return '-';
  const date   = new Date(dateString);
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
};

export default function AdminDashboardScreen() {
  const [activeTab,  setActiveTab]  = useState('ทั้งหมด');
  const [tasks,      setTasks]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedDate,     setSelectedDate]     = useState('วันที่');
  const [selectedDorm,     setSelectedDorm]     = useState('หอพัก');
  const [selectedCategory, setSelectedCategory] = useState('ประเภท');
  const [sortOption,       setSortOption]       = useState('ใหม่ล่าสุด');

  const [dateModalVisible,   setDateModalVisible]   = useState(false);
  const [sortModalVisible,   setSortModalVisible]   = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterType, setFilterType] = useState<'dorm' | 'category'>('dorm');

  const [openDetail,    setOpenDetail]    = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<any>(null);
  const [reporterInfo,  setReporterInfo]  = useState<any>(null);

  const [imageViewer,   setImageViewer]   = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [userData,    setUserData]    = useState<any>(null);

  const auth = getAuth();

  const fetchTasks = async () => {
    try {
      const timestamp = new Date().getTime();
      const response  = await fetch(`${API_URL}/reports?t=${timestamp}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error("Fetch API Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchTasks(); }, []));
  const onRefresh = useCallback(() => { setRefreshing(true); fetchTasks(); }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubUser  = onSnapshot(doc(db, "Users", user.uid), (snap) => { if (snap.exists()) setUserData(snap.data()); });
    const qNotif     = query(collection(db, "Notifications"), where("targetUid", "==", user.uid), where("isRead", "==", false));
    const unsubNotif = onSnapshot(qNotif, (snap) => { setUnreadCount(snap.size); });

    return () => { unsubUser(); unsubNotif(); };
  }, []);

  const handleOpenDetail = async (task: any) => {
    setOpenDetail(true);
    setSelectedRepair(task);
    setReporterInfo(null);
    const uid = task.userId || task.uid;
    if (uid) {
      try {
        const snap = await getDoc(doc(db, "Users", uid));
        setReporterInfo(snap.exists() ? snap.data() : { fullName: task.fullName || task.name || "ไม่ระบุชื่อ", studentId: task.studentId || "-" });
      } catch {
        setReporterInfo({ fullName: "เกิดข้อผิดพลาดในการโหลด" });
      }
    } else {
      setReporterInfo({ fullName: task.fullName || task.name || "ไม่ระบุชื่อ", studentId: task.studentId || "-" });
    }
  };

  const handleApproveJob = async (jobId: string) => {
    Alert.alert("ยืนยันการอนุมัติ", "ตรวจสอบงานเรียบร้อยและต้องการปิดงานนี้ใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "อนุมัติจบงาน", onPress: async () => {
        try {
          const res = await fetch(`${API_URL}/reports/${jobId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: "เสร็จสิ้น", approvedAt: new Date().toISOString(), adminId: auth.currentUser?.uid })
          });
          if (!res.ok) throw new Error();
          const techId = selectedRepair?.techId || selectedRepair?.technicianId;
          if (techId) {
            await fetch(`${API_URL}/notifications`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ targetUid: techId, title: "แอดมินอนุมัติงานแล้ว ✅", body: `งานซ่อม "${selectedRepair.title}" ได้รับการอนุมัติและปิดจ๊อบเรียบร้อย`, isRead: false, type: "admin_approved", category: selectedRepair.category, jobId: selectedRepair.id, createdAt: new Date().toISOString() })
            });
          }
          Alert.alert("สำเร็จ", "อนุมัติงานเสร็จสิ้นเรียบร้อยแล้ว");
          setOpenDetail(false); fetchTasks();
        } catch { Alert.alert("ผิดพลาด", "ไม่สามารถเชื่อมต่อ API เพื่ออนุมัติงานได้"); }
      }}
    ]);
  };

  const handleDeleteJob = async (jobId: string) => {
    Alert.alert("ยืนยันการลบ", "คุณแน่ใจหรือไม่ว่าต้องการลบทิ้ง? (ข้อมูลจะหายไปถาวร)", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบทิ้ง", style: "destructive", onPress: async () => {
        try {
          setLoading(true);
          const res = await fetch(`${API_URL}/reports/${jobId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error();
          Alert.alert("สำเร็จ", "ลบข้อมูลใบแจ้งซ่อมผ่าน API เรียบร้อยแล้ว");
          setOpenDetail(false); fetchTasks();
        } catch { Alert.alert("ผิดพลาด", "ไม่สามารถเชื่อมต่อ API เพื่อลบงานได้");
        } finally { setLoading(false); }
      }}
    ]);
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'ประปา':         return { icon: 'water', color: '#0EA5E9', bg: '#E0F2FE' };
      case 'ไฟฟ้า':         return { icon: 'flash', color: '#EAB308', bg: '#FEF9C3' };
      case 'เฟอร์นิเจอร์':  return { icon: 'bed',   color: '#8B5CF6', bg: '#EDE9FE' };
      case 'เครื่องใช้ไฟฟ้า': return { icon: 'tv',  color: '#EC4899', bg: '#FCE7F3' };
      default:              return { icon: 'build',  color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  const filteredTasks = Array.isArray(tasks) ? tasks
    .filter(task => {
      let matchStatus = activeTab === 'ทั้งหมด';
      if (activeTab === 'รอดำเนินการ') matchStatus = task.status === 'รอดำเนินการ';
      if (activeTab === 'กำลังซ่อม')  matchStatus = task.status === 'กำลังดำเนินการ' || task.status === 'กำลังซ่อม';
      if (activeTab === 'รอตรวจสอบ')  matchStatus = task.status === 'รอตรวจสอบ';
      if (activeTab === 'เสร็จสิ้น')  matchStatus = task.status === 'เสร็จสิ้น' || task.status === 'เสร็จสมบูรณ์';

      const matchDate = matchesDateFilter(task.createdAt, selectedDate);
      const matchDorm = selectedDorm === 'หอพัก' || selectedDorm === 'ทั้งหมด' || task.dorm === selectedDorm;
      const matchCat  = selectedCategory === 'ประเภท' || selectedCategory === 'ทั้งหมด' || task.category === selectedCategory;

      return matchStatus && matchDate && matchDorm && matchCat;
    })
    .sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return sortOption === 'ใหม่ล่าสุด' ? tB - tA : tA - tB;
    }) : [];

  const isDateActive     = selectedDate     !== 'วันที่';
  const isDormActive     = selectedDorm     !== 'หอพัก';
  const isCategoryActive = selectedCategory !== 'ประเภท';
  const isSortActive     = sortOption       !== 'ใหม่ล่าสุด';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
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
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F28C28']} />}
      >
        <View style={styles.pageHeader}><Text style={styles.pageTitle}>จัดการคำร้องแจ้งซ่อม</Text></View>

        {/* Status Tabs */}
        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {STATUS_TABS.map((tab) => (
              <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Filter Row (4 Dropdowns) ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {/* วันที่ */}
          <TouchableOpacity style={[styles.filterDropdown, isDateActive && styles.filterDropdownActive]} onPress={() => setDateModalVisible(true)}>
            <Ionicons name="calendar-outline" size={13} color={isDateActive ? '#F28C28' : '#6B7280'} />
            <Text style={[styles.filterText, isDateActive && styles.filterTextActive]} numberOfLines={1}>{selectedDate}</Text>
            <Ionicons name="chevron-down" size={13} color={isDateActive ? '#F28C28' : '#6B7280'} />
          </TouchableOpacity>

          {/* หอพัก */}
          <TouchableOpacity style={[styles.filterDropdown, isDormActive && styles.filterDropdownActive]} onPress={() => { setFilterType('dorm'); setFilterModalVisible(true); }}>
            <Ionicons name="business-outline" size={13} color={isDormActive ? '#F28C28' : '#6B7280'} />
            <Text style={[styles.filterText, isDormActive && styles.filterTextActive]} numberOfLines={1}>{selectedDorm}</Text>
            <Ionicons name="chevron-down" size={13} color={isDormActive ? '#F28C28' : '#6B7280'} />
          </TouchableOpacity>

          {/* ประเภท */}
          <TouchableOpacity style={[styles.filterDropdown, isCategoryActive && styles.filterDropdownActive]} onPress={() => { setFilterType('category'); setFilterModalVisible(true); }}>
            <Ionicons name="grid-outline" size={13} color={isCategoryActive ? '#F28C28' : '#6B7280'} />
            <Text style={[styles.filterText, isCategoryActive && styles.filterTextActive]} numberOfLines={1}>{selectedCategory}</Text>
            <Ionicons name="chevron-down" size={13} color={isCategoryActive ? '#F28C28' : '#6B7280'} />
          </TouchableOpacity>

          {/* เรียงลำดับ */}
          <TouchableOpacity style={[styles.filterDropdown, isSortActive && styles.filterDropdownActive]} onPress={() => setSortModalVisible(true)}>
            <Ionicons name="swap-vertical-outline" size={13} color={isSortActive ? '#F28C28' : '#6B7280'} />
            <Text style={[styles.filterText, isSortActive && styles.filterTextActive]} numberOfLines={1}>{sortOption}</Text>
            <Ionicons name="chevron-down" size={13} color={isSortActive ? '#F28C28' : '#6B7280'} />
          </TouchableOpacity>
        </ScrollView>

        {/* Result count */}
        <View style={styles.resultRow}>
          <Text style={styles.resultText}>พบ {filteredTasks.length} รายการ</Text>
        </View>

        {/* Task List */}
        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#F28C28" style={{ marginTop: 50 }} />
          ) : filteredTasks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>ไม่พบรายการ</Text>
            </View>
          ) : filteredTasks.map((task) => {
            const config = getCategoryConfig(task.category);
            let statusColor = '#F59E0B';
            if (task.status === 'กำลังดำเนินการ' || task.status === 'กำลังซ่อม') statusColor = '#3B82F6';
            if (task.status === 'รอตรวจสอบ')  statusColor = '#8B5CF6';
            if (task.status === 'เสร็จสิ้น' || task.status === 'เสร็จสมบูรณ์') statusColor = '#10B981';

            return (
              <TouchableOpacity key={task.id} style={styles.ticketCard} onPress={() => handleOpenDetail(task)}>
                <View style={[styles.urgencyIndicator, { backgroundColor: config.color }]} />
                <View style={styles.ticketContent}>
                  <View style={styles.ticketHeader}>
                    <View style={[styles.badge, { backgroundColor: config.bg }]}>
                      <Ionicons name={config.icon as any} size={14} color={config.color} />
                      <Text style={[styles.badgeText, { color: config.color }]}>{task.category}</Text>
                    </View>
                    <Text style={styles.timeText}>{task.createdAt ? formatThaiDate(task.createdAt) : '-'}</Text>
                  </View>
                  <Text style={styles.issueTitle} numberOfLines={1}>{task.title}</Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={14} color="#9CA3AF" />
                    <Text style={styles.locationText}>{task.dorm} ・ ห้อง {task.room}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.ticketFooter}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      สถานะ: {task.status === 'กำลังดำเนินการ' ? 'กำลังซ่อม' : task.status}
                    </Text>
                    <View style={styles.actionBtn}>
                      <Text style={styles.actionText}>ดูรายละเอียด</Text>
                      <Ionicons name="arrow-forward" size={16} color="#F28C28" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* ─── Modal รายละเอียด ─── */}
      <Modal visible={openDetail} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.detailBox}>
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setOpenDetail(false)}><Ionicons name="close" size={28} color="#6B7280" /></TouchableOpacity>
              <Text style={styles.detailTitle}>รายละเอียดแจ้งซ่อม</Text>
              <View style={{ width: 28 }} />
            </View>

            {selectedRepair && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailCategoryRow}>
                  <View style={[styles.badge, { backgroundColor: getCategoryConfig(selectedRepair.category).bg, padding: 8 }]}>
                    <Ionicons name={getCategoryConfig(selectedRepair.category).icon as any} size={16} color={getCategoryConfig(selectedRepair.category).color} />
                    <Text style={[styles.badgeText, { color: getCategoryConfig(selectedRepair.category).color }]}>{selectedRepair.category}</Text>
                  </View>
                  <Text style={{ fontWeight: '800', color: (selectedRepair.status === 'เสร็จสิ้น' || selectedRepair.status === 'เสร็จสมบูรณ์') ? '#10B981' : selectedRepair.status === 'รอตรวจสอบ' ? '#8B5CF6' : selectedRepair.status === 'กำลังดำเนินการ' ? '#3B82F6' : '#F59E0B' }}>
                    {selectedRepair.status === 'กำลังดำเนินการ' ? 'กำลังซ่อม' : selectedRepair.status}
                  </Text>
                </View>

                <Text style={styles.detailIssueTitle}>{selectedRepair.title}</Text>

                <View style={styles.detailInfoBox}>
                  <View style={styles.detailInfoRow}>
                    <Ionicons name="location-outline" size={20} color="#6B7280" />
                    <View style={styles.detailInfoTextGroup}><Text style={styles.detailInfoLabel}>สถานที่</Text><Text style={styles.detailInfoValue}>{selectedRepair.dorm} / {selectedRepair.room}</Text></View>
                  </View>
                  <View style={styles.detailInfoDivider} />
                  <View style={styles.detailInfoRow}>
                    <Ionicons name="person-outline" size={20} color="#6B7280" />
                    <View style={styles.detailInfoTextGroup}><Text style={styles.detailInfoLabel}>ผู้แจ้ง</Text><Text style={styles.detailInfoValue}>{reporterInfo ? (reporterInfo.fullName || reporterInfo.name || "ไม่ระบุชื่อ") : "กำลังโหลด..."}</Text></View>
                  </View>
                  <View style={styles.detailInfoDivider} />
                  <View style={styles.detailInfoRow}>
                    <Ionicons name="card-outline" size={20} color="#6B7280" />
                    <View style={styles.detailInfoTextGroup}><Text style={styles.detailInfoLabel}>รหัสนักศึกษา</Text><Text style={styles.detailInfoValue}>{reporterInfo ? (reporterInfo.studentId || "-") : "กำลังโหลด..."}</Text></View>
                  </View>
                  <View style={styles.detailInfoDivider} />
                  <View style={styles.detailInfoRow}>
                    <Ionicons name="call-outline" size={20} color="#6B7280" />
                    <View style={styles.detailInfoTextGroup}><Text style={styles.detailInfoLabel}>เบอร์โทรศัพท์</Text><Text style={styles.detailInfoValue}>{reporterInfo?.phone || selectedRepair.phone || '-'}</Text></View>
                  </View>
                </View>

                <Text style={styles.detailSectionTitle}>รูปภาพก่อนซ่อม</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginBottom: 20 }}>
                  {selectedRepair.images?.length > 0 ? selectedRepair.images.map((img: string, i: number) => (
                    <TouchableOpacity key={i} onPress={() => { setSelectedImage(img); setImageViewer(true); }}>
                      <Image source={{ uri: img }} style={styles.galleryImage} />
                    </TouchableOpacity>
                  )) : selectedRepair.image ? (
                    <TouchableOpacity onPress={() => { setSelectedImage(selectedRepair.image); setImageViewer(true); }}>
                      <Image source={{ uri: selectedRepair.image }} style={styles.galleryImage} />
                    </TouchableOpacity>
                  ) : <Text style={{ color: '#9CA3AF', fontSize: 12, marginLeft: 10 }}>ไม่มีรูปภาพก่อนซ่อม</Text>}
                </ScrollView>

                {(selectedRepair.status === 'รอตรวจสอบ' || selectedRepair.status === 'เสร็จสิ้น') && (
                  <View style={{ marginTop: 10, padding: 15, backgroundColor: '#F0FDF4', borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#10B981' }}>
                    <Text style={[styles.detailSectionTitle, { color: '#166534', marginTop: 0 }]}>🛠️ รายละเอียดหลังซ่อมเสร็จ</Text>
                    <Text style={{ fontSize: 14, color: '#374151', marginBottom: 8 }}>{selectedRepair.closingDetail || 'ไม่มีรายละเอียดการซ่อม'}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444', marginBottom: 12 }}>ค่าวัสดุ: {selectedRepair.materialCost || 0} บาท</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#166534', marginBottom: 8 }}>รูปภาพหลังซ่อม:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                      {selectedRepair.afterImages?.length > 0 ? selectedRepair.afterImages.map((img: string, i: number) => (
                        <TouchableOpacity key={i} onPress={() => { setSelectedImage(img); setImageViewer(true); }}>
                          <Image source={{ uri: img }} style={[styles.galleryImage, { borderColor: '#10B981', borderWidth: 2 }]} />
                        </TouchableOpacity>
                      )) : <Text style={{ color: '#9CA3AF', fontSize: 12 }}>ไม่มีรูปภาพหลังซ่อม</Text>}
                    </ScrollView>
                  </View>
                )}

                {selectedRepair.status === 'รอตรวจสอบ' && (
                  <TouchableOpacity style={styles.approveButton} onPress={() => handleApproveJob(selectedRepair.id)}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.approveButtonText}>อนุมัติจบงาน (เสร็จสิ้น)</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.approveButton, { backgroundColor: '#EF4444', shadowColor: '#EF4444', marginTop: 10 }]} onPress={() => handleDeleteJob(selectedRepair.id)}>
                  <Ionicons name="trash-bin" size={20} color="#FFF" />
                  <Text style={styles.approveButtonText}>ลบข้อมูลแจ้งซ่อม (Delete)</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Modal วันที่ ─── */}
      <Modal visible={dateModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlayFilter} activeOpacity={1} onPress={() => setDateModalVisible(false)}>
          <View style={styles.modalContentFilter}>
            <Text style={styles.modalTitleFilter}>เลือกช่วงเวลา</Text>
            {DATE_OPTIONS.map((item) => (
              <TouchableOpacity key={item} style={[styles.modalItemFilter, selectedDate === item && styles.modalItemFilterActive]} onPress={() => { setSelectedDate(item); setDateModalVisible(false); }}>
                <Text style={[styles.modalItemTextFilter, selectedDate === item && styles.modalItemTextFilterActive]}>{item}</Text>
                {selectedDate === item && <Ionicons name="checkmark" size={18} color="#F28C28" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Modal เรียงลำดับ ─── */}
      <Modal visible={sortModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlayFilter} activeOpacity={1} onPress={() => setSortModalVisible(false)}>
          <View style={styles.modalContentFilter}>
            <Text style={styles.modalTitleFilter}>เรียงลำดับ</Text>
            {SORT_OPTIONS.map((item) => (
              <TouchableOpacity key={item} style={[styles.modalItemFilter, sortOption === item && styles.modalItemFilterActive]} onPress={() => { setSortOption(item); setSortModalVisible(false); }}>
                <Text style={[styles.modalItemTextFilter, sortOption === item && styles.modalItemTextFilterActive]}>{item}</Text>
                {sortOption === item && <Ionicons name="checkmark" size={18} color="#F28C28" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Modal หอพัก / ประเภท ─── */}
      <Modal visible={filterModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlayFilter} activeOpacity={1} onPress={() => setFilterModalVisible(false)}>
          <View style={styles.modalContentFilter}>
            <Text style={styles.modalTitleFilter}>{filterType === 'dorm' ? 'เลือกหอพัก' : 'เลือกประเภท'}</Text>
            {filterType === 'dorm' ? (
              <SectionList
                sections={DORM_SECTIONS}
                keyExtractor={(item) => item}
                stickySectionHeadersEnabled={false}
                ListHeaderComponent={
                  <TouchableOpacity style={[styles.modalItemFilter, selectedDorm === 'ทั้งหมด' && styles.modalItemFilterActive]} onPress={() => { setSelectedDorm('ทั้งหมด'); setFilterModalVisible(false); }}>
                    <Text style={[styles.modalItemTextFilter, selectedDorm === 'ทั้งหมด' && styles.modalItemTextFilterActive]}>ทั้งหมด</Text>
                    {selectedDorm === 'ทั้งหมด' && <Ionicons name="checkmark" size={18} color="#F28C28" />}
                  </TouchableOpacity>
                }
                renderSectionHeader={({ section: { title } }) => (
                  <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>{title}</Text></View>
                )}
                renderItem={({ item }) => (
                  <TouchableOpacity style={[styles.modalItemFilter, selectedDorm === item && styles.modalItemFilterActive]} onPress={() => { setSelectedDorm(item); setFilterModalVisible(false); }}>
                    <Text style={[styles.modalItemTextFilter, selectedDorm === item && styles.modalItemTextFilterActive]}>{item}</Text>
                    {selectedDorm === item && <Ionicons name="checkmark" size={18} color="#F28C28" />}
                  </TouchableOpacity>
                )}
              />
            ) : (
              <FlatList
                data={CATEGORY_OPTIONS}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity style={[styles.modalItemFilter, selectedCategory === item && styles.modalItemFilterActive]} onPress={() => { setSelectedCategory(item); setFilterModalVisible(false); }}>
                    <Text style={[styles.modalItemTextFilter, selectedCategory === item && styles.modalItemTextFilterActive]}>{item}</Text>
                    {selectedCategory === item && <Ionicons name="checkmark" size={18} color="#F28C28" />}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Image Viewer */}
      <Modal visible={imageViewer} transparent={true} animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center' }} onPress={() => setImageViewer(false)}>
          <Image source={{ uri: selectedImage || '' }} style={{ width: '100%', height: '70%', resizeMode: 'contain' }} />
        </TouchableOpacity>
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
  pageHeader: { padding: 20 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  tabContainer: { marginBottom: 16 },
  tabScroll: { paddingHorizontal: 20, gap: 10 },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  tabBtnActive: { backgroundColor: '#F28C28', borderColor: '#E67E22' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#FFFFFF' },

  filterRow: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  filterDropdown: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 5, minWidth: 100 },
  filterDropdownActive: { borderColor: '#F28C28', backgroundColor: '#FFF8F0' },
  filterText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  filterTextActive: { color: '#F28C28' },

  resultRow: { paddingHorizontal: 20, marginBottom: 8 },
  resultText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },

  listContainer: { paddingHorizontal: 20 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 15, color: '#9CA3AF', fontWeight: '600' },
  ticketCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, elevation: 3, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' },
  urgencyIndicator: { width: 6 },
  ticketContent: { flex: 1, padding: 16 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 },
  timeText: { fontSize: 12, color: '#9CA3AF' },
  issueTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 13, color: '#4B5563' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusText: { fontSize: 13, fontWeight: '700' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 14, fontWeight: '700', color: '#F28C28' },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  detailBox: { width: "95%", backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20, maxHeight: '90%' },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  detailTitle: { fontSize: 18, fontWeight: "800" },
  detailCategoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailIssueTitle: { fontSize: 22, fontWeight: '800', marginBottom: 20 },
  detailInfoBox: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 24 },
  detailInfoRow: { flexDirection: 'row', alignItems: 'center' },
  detailInfoTextGroup: { marginLeft: 12, flex: 1 },
  detailInfoLabel: { fontSize: 11, color: '#6B7280' },
  detailInfoValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  detailInfoDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  galleryImage: { width: 120, height: 120, borderRadius: 12 },
  approveButton: { backgroundColor: '#10B981', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 14, marginTop: 24, marginBottom: 10, gap: 8, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  approveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  modalOverlayFilter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContentFilter: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '65%' },
  modalTitleFilter: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 15, color: '#111827' },
  modalItemFilter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalItemFilterActive: { backgroundColor: '#FFF8F0', borderRadius: 10 },
  modalItemTextFilter: { fontSize: 16, color: '#374151' },
  modalItemTextFilterActive: { color: '#F28C28', fontWeight: '700' },

  sectionHeader: { backgroundColor: '#FFF3E8', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginVertical: 6 },
  sectionHeaderText: { fontSize: 13, fontWeight: '800', color: '#F28C28' },
  detailSectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
});