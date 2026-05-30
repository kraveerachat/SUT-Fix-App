import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
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
} from 'react-native';

import { getAuth } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../constants/firebaseConfig';

const CATEGORIES = [
  { id: 'all',        label: 'ทั้งหมด',       icon: 'apps-outline'      },
  { id: 'plumbing',   label: 'ประปา',          icon: 'water-outline'     },
  { id: 'electrical', label: 'ไฟฟ้า',          icon: 'flash-outline'     },
  { id: 'furniture',  label: 'เฟอร์นิเจอร์',   icon: 'bed-outline'       },
  { id: 'appliances', label: 'เครื่องใช้ไฟฟ้า', icon: 'tv-outline'        },
];

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

const formatThaiDateTime = (dateString: string) => {
  if (!dateString) return '-';
  const date    = new Date(dateString);
  const months  = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const d       = date.getDate();
  const m       = months[date.getMonth()];
  const y       = date.getFullYear() + 543;
  const hh      = String(date.getHours()).padStart(2, '0');
  const mm      = String(date.getMinutes()).padStart(2, '0');
  return `${d} ${m} ${y}  ${hh}:${mm} น.`;
};

export default function TechDashboardScreen() {
  const [tasks,       setTasks]       = useState<any[]>([]);
  const [hiddenTasks, setHiddenTasks] = useState<string[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userData,    setUserData]    = useState<any>(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedDate,     setSelectedDate]     = useState('วันที่');
  const [selectedDorm,     setSelectedDorm]     = useState('หอพัก');
  const [selectedCategory, setSelectedCategory] = useState('ประเภท');
  const [sortOption,       setSortOption]       = useState('ใหม่ล่าสุด');

  const [dateModalVisible, setDateModalVisible]   = useState(false);
  const [sortModalVisible, setSortModalVisible]   = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterType, setFilterType] = useState<'dorm' | 'category'>('dorm');

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const qReports  = query(collection(db, "Reports"), where("status", "==", "รอดำเนินการ"));
    const unsubReports = onSnapshot(qReports, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasks(data);
      setLoading(false);
    });

    const unsubUser = onSnapshot(doc(db, "Users", user.uid), (docSnap) => {
      if (docSnap.exists()) setUserData(docSnap.data());
    });

    const qNotif    = query(collection(db, "Notifications"), where("targetUid", "==", user.uid), where("isRead", "==", false));
    const unsubNotif = onSnapshot(qNotif, (snapshot) => { setUnreadCount(snapshot.size); });

    return () => { unsubReports(); unsubUser(); unsubNotif(); };
  }, []);

  const handleAcceptJob = async (jobId: string) => {
    Alert.alert("ยืนยันการรับงาน", "รับใบแจ้งซ่อมนี้เข้าสู่คลังงานของคุณใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "รับงาน", onPress: async () => {
        try {
          await updateDoc(doc(db, "Reports", jobId), { status: "กำลังดำเนินการ", acceptedAt: new Date().toISOString() });
          Alert.alert("สำเร็จ", "รับงานเรียบร้อยแล้ว รายการจะย้ายไปที่เมนูงานของฉัน");
        } catch {
          Alert.alert("ผิดพลาด", "ไม่สามารถรับงานได้");
        }
      }}
    ]);
  };

  const handleRejectJob = (jobId: string) => {
    Alert.alert("ไม่รับงาน", "ซ่อนงานนี้จากรายการของคุณ? (ช่างท่านอื่นยังเห็นงานนี้ปกติ)", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ซ่อนงาน", style: "destructive", onPress: () => setHiddenTasks(prev => [...prev, jobId]) }
    ]);
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'ประปา':         return { icon: 'water', color: '#3B82F6', bg: '#DBEAFE' };
      case 'ไฟฟ้า':         return { icon: 'flash', color: '#EAB308', bg: '#FEF9C3' };
      case 'เฟอร์นิเจอร์':  return { icon: 'bed',   color: '#8B5CF6', bg: '#EDE9FE' };
      case 'เครื่องใช้ไฟฟ้า': return { icon: 'tv',  color: '#EC4899', bg: '#FCE7F3' };
      default:              return { icon: 'build',  color: '#F28C28', bg: '#FFF3E8' };
    }
  };

  // ── Apply all filters + sort ──────────────────────────────────────────────
  const filteredTasks = tasks
    .filter(t => {
      if (hiddenTasks.includes(t.id)) return false;
      const matchDate = matchesDateFilter(t.createdAt, selectedDate);
      const matchDorm = selectedDorm === 'หอพัก' || selectedDorm === 'ทั้งหมด' || t.dorm === selectedDorm;
      const matchCat  = selectedCategory === 'ประเภท' || selectedCategory === 'ทั้งหมด' || t.category === selectedCategory;
      return matchDate && matchDorm && matchCat;
    })
    .sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return sortOption === 'ใหม่ล่าสุด' ? tB - tA : tA - tB;
    });

  const isDateActive     = selectedDate     !== 'วันที่';
  const isDormActive     = selectedDorm     !== 'หอพัก';
  const isCategoryActive = selectedCategory !== 'ประเภท';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image source={require('../../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
          <View>
            <Text style={styles.appName}>SUT FixIt</Text>
            <Text style={styles.appSubtitle}>ช่างเทคนิค (Technician)</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push('/(technician)/notification' as any)}>
          <Ionicons name="notifications-outline" size={26} color="#111" />
          {userData?.pushEnabled !== false && unreadCount > 0 && (
            <View style={styles.notificationBadge}><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>งานเข้าใหม่</Text>
        </View>

        {userData?.isAvailable === false ? (
          <View style={styles.offlineContainer}>
            <Ionicons name="power" size={80} color="#D1D5DB" />
            <Text style={styles.offlineTitle}>คุณกำลังออฟไลน์</Text>
            <Text style={styles.offlineDesc}>คุณได้ปิดสถานะการรับงานไว้ หากต้องการเริ่มงาน กรุณาเปิดสถานะที่หน้าการตั้งค่า</Text>
          </View>
        ) : (
          <>
            {/* Category Tabs */}
            <View style={styles.categoryContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryBtn, selectedCategory === cat.label && styles.categoryBtnActive]}
                    onPress={() => setSelectedCategory(cat.label === 'ทั้งหมด' ? 'ประเภท' : cat.label)}
                  >
                    <Ionicons name={cat.icon as any} size={18} color={selectedCategory === cat.label ? '#FFF' : '#6B7280'} />
                    <Text style={[styles.categoryText, selectedCategory === cat.label && styles.categoryTextActive]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* ── Filter Row ── */}
            <View style={styles.filterRow}>
              {/* วันที่ */}
              <TouchableOpacity
                style={[styles.filterDropdown, isDateActive && styles.filterDropdownActive]}
                onPress={() => setDateModalVisible(true)}
              >
                <Ionicons name="calendar-outline" size={13} color={isDateActive ? '#F28C28' : '#6B7280'} />
                <Text style={[styles.filterText, isDateActive && styles.filterTextActive]} numberOfLines={1}>
                  {selectedDate}
                </Text>
                <Ionicons name="chevron-down" size={13} color={isDateActive ? '#F28C28' : '#6B7280'} />
              </TouchableOpacity>

              {/* หอพัก */}
              <TouchableOpacity
                style={[styles.filterDropdown, isDormActive && styles.filterDropdownActive]}
                onPress={() => { setFilterType('dorm'); setFilterModalVisible(true); }}
              >
                <Ionicons name="business-outline" size={13} color={isDormActive ? '#F28C28' : '#6B7280'} />
                <Text style={[styles.filterText, isDormActive && styles.filterTextActive]} numberOfLines={1}>
                  {selectedDorm}
                </Text>
                <Ionicons name="chevron-down" size={13} color={isDormActive ? '#F28C28' : '#6B7280'} />
              </TouchableOpacity>

              {/* เรียงลำดับ */}
              <TouchableOpacity
                style={[styles.filterDropdown, sortOption !== 'ใหม่ล่าสุด' && styles.filterDropdownActive]}
                onPress={() => setSortModalVisible(true)}
              >
                <Ionicons name="swap-vertical-outline" size={13} color={sortOption !== 'ใหม่ล่าสุด' ? '#F28C28' : '#6B7280'} />
                <Text style={[styles.filterText, sortOption !== 'ใหม่ล่าสุด' && styles.filterTextActive]} numberOfLines={1}>
                  {sortOption}
                </Text>
                <Ionicons name="chevron-down" size={13} color={sortOption !== 'ใหม่ล่าสุด' ? '#F28C28' : '#6B7280'} />
              </TouchableOpacity>
            </View>

            {/* Result count */}
            <View style={styles.resultRow}>
              <Text style={styles.resultText}>พบ {filteredTasks.length} รายการ</Text>
            </View>

            {/* List */}
            {loading ? (
              <ActivityIndicator size="large" color="#F28C28" style={{ marginTop: 20 }} />
            ) : filteredTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>ไม่มีงานใหม่ในขณะนี้</Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {filteredTasks.map((task) => {
                  const catConfig = getCategoryConfig(task.category);
                  return (
                    <TouchableOpacity
                      key={task.id}
                      style={styles.ticketCard}
                      activeOpacity={0.8}
                      onPress={() => router.push({ pathname: '/(technician)/job-request-detail', params: { id: task.id } } as any)}
                    >
                      <View style={[styles.urgencyIndicator, { backgroundColor: catConfig.color }]} />
                      <View style={styles.ticketContent}>
                        {/* Header */}
                        <View style={styles.ticketHeader}>
                          <View style={[styles.badge, { backgroundColor: catConfig.bg }]}>
                            <Ionicons name={catConfig.icon as any} size={14} color={catConfig.color} />
                            <Text style={[styles.badgeTextCategory, { color: catConfig.color }]}>{task.category}</Text>
                          </View>
                          <Text style={styles.timeText}>{task.createdAt ? formatThaiDateTime(task.createdAt) : '-'}</Text>
                        </View>

                        {/* Preview row */}
                        <View style={styles.previewRow}>
                          {task.images && task.images.length > 0 ? (
                            <Image source={{ uri: task.images[0] }} style={styles.thumbnailImage} resizeMode="cover" />
                          ) : (
                            <View style={styles.placeholderImage}>
                              <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                            </View>
                          )}
                          <View style={styles.infoCol}>
                            <Text style={styles.issueTitle} numberOfLines={2}>{task.title}</Text>
                            <View style={styles.locationRow}>
                              <Ionicons name="location" size={14} color="#9CA3AF" />
                              <Text style={styles.locationText}>{task.dorm} ・ ห้อง {task.room}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Footer buttons */}
                        <View style={styles.ticketFooter}>
                          <TouchableOpacity
                            style={styles.rejectButton}
                            onPress={() => handleRejectJob(task.id)}
                          >
                            <Text style={styles.rejectButtonText}>ไม่รับงาน</Text>
                            <Ionicons name="close-circle" size={16} color="#EF4444" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={() => handleAcceptJob(task.id)}
                          >
                            <Text style={styles.acceptButtonText}>กดรับงาน</Text>
                            <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ─── Modal วันที่ ─── */}
      <Modal visible={dateModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDateModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>เลือกช่วงเวลา</Text>
            {DATE_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.modalItem, selectedDate === item && styles.modalItemActive]}
                onPress={() => { setSelectedDate(item); setDateModalVisible(false); }}
              >
                <Text style={[styles.modalItemText, selectedDate === item && styles.modalItemTextActive]}>{item}</Text>
                {selectedDate === item && <Ionicons name="checkmark" size={18} color="#F28C28" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Modal หอพัก (SectionList) / ประเภท ─── */}
      <Modal visible={filterModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{filterType === 'dorm' ? 'เลือกหอพัก' : 'เลือกประเภท'}</Text>

            {filterType === 'dorm' ? (
              <SectionList
                sections={DORM_SECTIONS}
                keyExtractor={(item) => item}
                stickySectionHeadersEnabled={false}
                ListHeaderComponent={
                  <TouchableOpacity
                    style={[styles.modalItem, selectedDorm === 'ทั้งหมด' && styles.modalItemActive]}
                    onPress={() => { setSelectedDorm('ทั้งหมด'); setFilterModalVisible(false); }}
                  >
                    <Text style={[styles.modalItemText, selectedDorm === 'ทั้งหมด' && styles.modalItemTextActive]}>ทั้งหมด</Text>
                    {selectedDorm === 'ทั้งหมด' && <Ionicons name="checkmark" size={18} color="#F28C28" />}
                  </TouchableOpacity>
                }
                renderSectionHeader={({ section: { title } }) => (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>{title}</Text>
                  </View>
                )}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, selectedDorm === item && styles.modalItemActive]}
                    onPress={() => { setSelectedDorm(item); setFilterModalVisible(false); }}
                  >
                    <Text style={[styles.modalItemText, selectedDorm === item && styles.modalItemTextActive]}>{item}</Text>
                    {selectedDorm === item && <Ionicons name="checkmark" size={18} color="#F28C28" />}
                  </TouchableOpacity>
                )}
              />
            ) : (
              <FlatList
                data={CATEGORY_OPTIONS}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, selectedCategory === item && styles.modalItemActive]}
                    onPress={() => { setSelectedCategory(item); setFilterModalVisible(false); }}
                  >
                    <Text style={[styles.modalItemText, selectedCategory === item && styles.modalItemTextActive]}>{item}</Text>
                    {selectedCategory === item && <Ionicons name="checkmark" size={18} color="#F28C28" />}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Modal เรียงลำดับ ─── */}
      <Modal visible={sortModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>เรียงลำดับ</Text>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.modalItem, sortOption === option && styles.modalItemActive]}
                onPress={() => { setSortOption(option); setSortModalVisible(false); }}
              >
                <Text style={[styles.modalItemText, sortOption === option && styles.modalItemTextActive]}>{option}</Text>
                {sortOption === option && <Ionicons name="checkmark" size={18} color="#F28C28" />}
              </TouchableOpacity>
            ))}
          </View>
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
  appSubtitle: { fontSize: 11, fontWeight: '600', color: '#F28C28' },
  notificationBtn: { padding: 8, position: 'relative' },
  notificationBadge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, backgroundColor: '#EF4444', borderRadius: 9, borderWidth: 1.5, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 40 },
  pageHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  offlineContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
  offlineTitle: { fontSize: 20, fontWeight: '800', color: '#374151', marginTop: 16 },
  offlineDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 22 },

  categoryContainer: { marginBottom: 12 },
  categoryScroll: { paddingHorizontal: 20, gap: 10 },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', gap: 6 },
  categoryBtnActive: { backgroundColor: '#F28C28', borderColor: '#E67E22' },
  categoryText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  categoryTextActive: { color: '#FFFFFF' },

  // Filter Row
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 8, gap: 8 },
  filterDropdown: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 4 },
  filterDropdownActive: { borderColor: '#F28C28', backgroundColor: '#FFF8F0' },
  filterText: { fontSize: 11, fontWeight: '600', color: '#4B5563', flex: 1 },
  filterTextActive: { color: '#F28C28' },

  resultRow: { paddingHorizontal: 20, marginBottom: 12 },
  resultText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },

  listContainer: { paddingHorizontal: 20 },
  ticketCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, borderWidth: 1, borderColor: '#F3F4F6', overflow: 'hidden' },
  urgencyIndicator: { width: 6 },
  ticketContent: { flex: 1, padding: 16 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 },
  badgeTextCategory: { fontSize: 12, fontWeight: '700' },
  timeText: { fontSize: 11, color: '#9CA3AF' },
  previewRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  thumbnailImage: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#F3F4F6' },
  placeholderImage: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  infoCol: { flex: 1, justifyContent: 'center' },
  issueTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 13, color: '#4B5563' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  ticketFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10 },

  rejectButton: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 100, justifyContent: 'center' },
  rejectButtonText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
  acceptButton: { backgroundColor: '#10B981', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 100, justifyContent: 'center' },
  acceptButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#9CA3AF', marginTop: 10, fontSize: 16 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '65%' },
  modalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 15, color: '#111827' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalItemActive: { backgroundColor: '#FFF8F0', borderRadius: 10 },
  modalItemText: { fontSize: 16, color: '#374151' },
  modalItemTextActive: { color: '#F28C28', fontWeight: '700' },
  sectionHeader: { backgroundColor: '#FFF3E8', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginVertical: 6 },
  sectionHeaderText: { fontSize: 13, fontWeight: '800', color: '#F28C28' },
});