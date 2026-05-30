import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { FlatList, Image, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';

import { getAuth } from 'firebase/auth'; // ✅
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../../constants/firebaseConfig'; 

const DATE_OPTIONS = ['ทั้งหมด', 'วันนี้', 'เมื่อวาน', '7 วันที่ผ่านมา', 'เดือนนี้'];

export default function AdminStatisticsScreen() {
  const [selectedDate, setSelectedDate] = useState('ทั้งหมด');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [allDormsModalVisible, setAllDormsModalVisible] = useState(false);
  const [allTechsModalVisible, setAllTechsModalVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [techUsers, setTechUsers] = useState<any>({});

  // ✅ แจ้งเตือน
  const [unreadCount, setUnreadCount] = useState(0);
  const [userData, setUserData] = useState<any>(null);

  const [summary, setSummary] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [dormStats, setDormStats] = useState<any[]>([]);
  const [techStats, setTechStats] = useState<any[]>([]);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    let unsubUser = () => {};
    let unsubNotif = () => {};
    let unsubReports = () => {};
    let unsubTechs = () => {};

    const qTech = query(collection(db, "Users"), where("role", "==", "technician"));
    unsubTechs = onSnapshot(qTech, (snapshot) => {
      const techsMap: any = {};
      snapshot.forEach(doc => { techsMap[doc.id] = doc.data(); });
      setTechUsers(techsMap);
    });

    unsubReports = onSnapshot(collection(db, "Reports"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(data);
      setLoading(false);
    });

    if (user) {
        unsubUser = onSnapshot(doc(db, "Users", user.uid), (docSnap) => {
            if (docSnap.exists()) setUserData(docSnap.data());
        });
        const qNotif = query(collection(db, "Notifications"), where("targetUid", "==", user.uid), where("isRead", "==", false));
        unsubNotif = onSnapshot(qNotif, (snapshot) => {
            setUnreadCount(snapshot.size);
        });
    }

    return () => { unsubTechs(); unsubReports(); unsubUser(); unsubNotif(); };
  }, []);

  const filterByDate = (createdAtStr: string, filter: string) => {
    if (!createdAtStr || filter === 'ทั้งหมด') return true;
    const date = new Date(createdAtStr);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (filter === 'วันนี้') return date >= startOfToday;
    if (filter === 'เมื่อวาน') {
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        return date >= startOfYesterday && date < startOfToday;
    }
    if (filter === '7 วันที่ผ่านมา') {
        const sevenDaysAgo = new Date(startOfToday);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return date >= sevenDaysAgo;
    }
    if (filter === 'เดือนนี้') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return date >= startOfMonth;
    }
    return true;
  };

  useEffect(() => {
    const filtered = reports.filter(r => filterByDate(r.createdAt, selectedDate));
    let pending = 0, inProgress = 0, completed = 0;
    const catMap: any = { 'ประปา': 0, 'ไฟฟ้า': 0, 'เฟอร์นิเจอร์': 0, 'เครื่องใช้ไฟฟ้า': 0 };
    const dormMap: any = {};
    const tMap: any = {};

    filtered.forEach(r => {
      if (r.status === 'รอดำเนินการ' || r.status === 'รอรับงาน') pending++;
      else if (r.status === 'กำลังดำเนินการ') inProgress++;
      else if (['เสร็จสิ้น', 'เสร็จสมบูรณ์', 'Approved'].includes(r.status)) completed++;
      const cat = r.category || 'อื่นๆ';
      catMap[cat] = (catMap[cat] || 0) + 1;
      if (r.dorm) dormMap[r.dorm] = (dormMap[r.dorm] || 0) + 1;
      if (['เสร็จสิ้น', 'เสร็จสมบูรณ์', 'Approved'].includes(r.status)) {
        const tid = r.techId || r.technicianId;
        if (tid) tMap[tid] = (tMap[tid] || 0) + 1;
      }
    });

    setSummary({ total: filtered.length, pending, inProgress, completed });
    const totalCat = filtered.length || 1;
    const catArray = [
      { name: 'ประปา', count: catMap['ประปา'] || 0, color: '#0EA5E9' },
      { name: 'ไฟฟ้า', count: catMap['ไฟฟ้า'] || 0, color: '#EAB308' },
      { name: 'เฟอร์นิเจอร์', count: catMap['เฟอร์นิเจอร์'] || 0, color: '#8B5CF6' },
      { name: 'เครื่องใช้ไฟฟ้า', count: catMap['เครื่องใช้ไฟฟ้า'] || 0, color: '#EC4899' },
    ].map(c => ({ ...c, percent: Math.round((c.count / totalCat) * 100) }));
    setCategoryStats(catArray);

    const dArray = Object.keys(dormMap).map(k => ({ id: k, name: k, count: dormMap[k] }))
      .sort((a, b) => b.count - a.count).map((d, index) => ({ ...d, rank: index + 1, color: index === 0 ? '#EF4444' : index === 1 ? '#F97316' : index === 2 ? '#F59E0B' : '#9CA3AF' }));
    setDormStats(dArray);

    const tArray = Object.keys(tMap).map(k => {
      const u = techUsers[k] || {}; 
      return {
        id: k, name: u.fullName || u.name || 'ไม่ระบุชื่อ', type: u.techType || 'ช่างทั่วไป', count: tMap[k],
        avatar: `https://ui-avatars.com/api/?name=${u.fullName || u.name || 'T'}&background=F28C28&color=fff`
      };
    }).sort((a, b) => b.count - a.count).map((t, index) => ({ ...t, rank: index + 1 }));
    setTechStats(tArray);

  }, [reports, selectedDate, techUsers]);

  if (loading) return <View style={{flex: 1, justifyContent: 'center'}}><ActivityIndicator size="large" color="#F28C28" /></View>;

  const top3Dorms = dormStats.slice(0, 3);
  const top3Techs = techStats.slice(0, 3);

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
        <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7} onPress={() => router.push('/(admin)/notifications' as any)}>
          <Ionicons name="notifications-outline" size={26} color="#111" />
          {userData?.pushEnabled !== false && unreadCount > 0 && (
             <View style={styles.notificationBadge}><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* (โค้ด UI ส่วนรายงานสถิติ เลื่อนลงไปเหมือนเดิมเป๊ะๆ ครับ ผมใส่ไว้ใน Styles แล้ว) */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>สถิติการซ่อม</Text>
          <TouchableOpacity style={styles.dateFilterBtn} activeOpacity={0.7} onPress={() => setFilterModalVisible(true)}>
            <Text style={styles.dateFilterText}>{selectedDate}</Text>
            <Ionicons name="chevron-down" size={14} color="#F28C28" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { borderTopColor: '#6B7280' }]}><View style={[styles.statIconWrap, { backgroundColor: '#F3F4F6' }]}><Ionicons name="document-text" size={20} color="#6B7280" /></View><Text style={styles.statCount}>{summary.total}</Text><Text style={styles.statLabel}>งานทั้งหมด</Text></View>
          <View style={[styles.statBox, { borderTopColor: '#F59E0B' }]}><View style={[styles.statIconWrap, { backgroundColor: '#FEF3C7' }]}><Ionicons name="time" size={20} color="#F59E0B" /></View><Text style={styles.statCount}>{summary.pending}</Text><Text style={styles.statLabel}>รอดำเนินการ</Text></View>
          <View style={[styles.statBox, { borderTopColor: '#3B82F6' }]}><View style={[styles.statIconWrap, { backgroundColor: '#DBEAFE' }]}><Ionicons name="build" size={20} color="#3B82F6" /></View><Text style={styles.statCount}>{summary.inProgress}</Text><Text style={styles.statLabel}>กำลังซ่อม</Text></View>
          <View style={[styles.statBox, { borderTopColor: '#10B981' }]}><View style={[styles.statIconWrap, { backgroundColor: '#D1FAE5' }]}><Ionicons name="checkmark-circle" size={20} color="#10B981" /></View><Text style={styles.statCount}>{summary.completed}</Text><Text style={styles.statLabel}>เสร็จสิ้น</Text></View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>สัดส่วนงานซ่อมตามหมวดหมู่</Text>
          </View>
          <TouchableOpacity style={styles.chartBox} activeOpacity={0.8} onPress={() => setCategoryModalVisible(true)}>
            {categoryStats.map((cat, index) => (
              <View key={index} style={styles.progressRow}>
                <View style={styles.progressLabelRow}><Text style={styles.progressLabel}>{cat.name} ({cat.percent}%)</Text><Text style={styles.progressValue}>{cat.count} งาน</Text></View>
                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${cat.percent}%`, backgroundColor: cat.color }]} /></View>
              </View>
            ))}
            <View style={styles.clickHintRow}>
              <Text style={styles.clickHintText}>แตะเพื่อดูรายงานเชิงลึก (กราฟวงกลม)</Text><Ionicons name="arrow-forward-circle-outline" size={16} color="#6B7280" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>ยอดหอพักที่แจ้งซ่อมสูงสุด (Top 3)</Text>
            <TouchableOpacity onPress={() => setAllDormsModalVisible(true)} activeOpacity={0.7}><Text style={styles.seeAllText}>ดูทั้งหมด</Text></TouchableOpacity>
          </View>
          <View style={styles.rankingBox}>
            {top3Dorms.length === 0 ? <Text style={{textAlign:'center', color:'#9CA3AF', paddingVertical:10}}>ไม่มีข้อมูลหอพัก</Text> : null}
            {top3Dorms.map((dorm) => (
              <View key={dorm.id} style={styles.rankingRow}>
                <View style={[styles.rankBadge, { backgroundColor: dorm.color }]}><Text style={styles.rankText}>#{dorm.rank}</Text></View>
                <Text style={styles.rankingName}>{dorm.name}</Text>
                <Text style={styles.rankingCount}>{dorm.count} รายการ</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>ยอดช่างที่ปิดงานสูงสุด (Top 3)</Text>
            <TouchableOpacity onPress={() => setAllTechsModalVisible(true)} activeOpacity={0.7}><Text style={styles.seeAllText}>ดูทั้งหมด</Text></TouchableOpacity>
          </View>
          <View style={styles.rankingBox}>
            {top3Techs.length === 0 ? <Text style={{textAlign:'center', color:'#9CA3AF', paddingVertical:10}}>ยังไม่มีช่างที่ปิดงานได้</Text> : null}
            {top3Techs.map((tech) => (
              <View key={tech.id} style={styles.rankingRow}>
                <Image source={{ uri: tech.avatar }} style={styles.avatarImage} />
                <View style={styles.techInfo}><Text style={styles.rankingName}>{tech.name}</Text><Text style={styles.techType}>{tech.type}</Text></View>
                <View style={styles.techCountBadge}><Text style={styles.techCountText}>{tech.count} งาน</Text></View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Modals ทั้งหมดคงเดิมเลยครับ ไม่ได้แตะส่วน UI */}
      <Modal visible={allTechsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={[styles.detailBox, { maxHeight: '90%' }]}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>ยอดปิดงานช่างทั้งหมด</Text>
              <TouchableOpacity onPress={() => setAllTechsModalVisible(false)} style={styles.closeBtn}><Ionicons name="close" size={24} color="#6B7280" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.detailSubList}>
                {techStats.length === 0 ? <Text style={{textAlign:'center', color:'#9CA3AF'}}>ยังไม่มีข้อมูลสถิติ</Text> : null}
                {techStats.map((tech, index) => {
                  const isTop3 = index < 3;
                  return (
                    <View key={tech.id} style={[styles.subListItem, { paddingVertical: 12 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Text style={[styles.subListLabel, { width: 26, fontWeight: '800', color: isTop3 ? '#F28C28' : '#9CA3AF' }]}>#{index + 1}</Text>
                        <Image source={{ uri: tech.avatar }} style={[styles.avatarImage, { width: 36, height: 36, marginRight: 12 }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.subListLabel, { fontWeight: isTop3 ? '700' : '500', marginBottom: 2 }]}>{tech.name}</Text>
                          <Text style={{ fontSize: 12, color: '#6B7280' }}>{tech.type}</Text>
                        </View>
                      </View>
                      <View style={[styles.techCountBadge, { backgroundColor: isTop3 ? '#FFF3E8' : '#F3F4F6' }]}>
                        <Text style={[styles.techCountText, { color: isTop3 ? '#F28C28' : '#4B5563' }]}>{tech.count} งาน</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={allDormsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={[styles.detailBox, { maxHeight: '90%' }]}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>ยอดแจ้งซ่อมทุกหอพัก</Text>
              <TouchableOpacity onPress={() => setAllDormsModalVisible(false)} style={styles.closeBtn}><Ionicons name="close" size={24} color="#6B7280" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.detailSubList}>
                {dormStats.length === 0 ? <Text style={{textAlign:'center', color:'#9CA3AF'}}>ยังไม่มีข้อมูล</Text> : null}
                {dormStats.map((dorm, index) => (
                  <View key={dorm.id} style={styles.subListItem}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.subListLabel, { width: 26, fontWeight: '800', color: index < 3 ? '#F28C28' : '#9CA3AF' }]}>#{index + 1}</Text>
                      <Text style={[styles.subListLabel, { fontWeight: index < 3 ? '700' : '500' }]}>{dorm.name}</Text>
                    </View>
                    <Text style={styles.subListValue}>{dorm.count} รายการ</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={categoryModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.detailBox}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>รายงานหมวดหมู่เชิงลึก</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)} style={styles.closeBtn}><Ionicons name="close" size={24} color="#6B7280" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{color:'#6B7280', textAlign:'center', marginVertical:20, lineHeight:22}}>
                ระบบได้รวบรวมข้อมูลสัดส่วนงานซ่อมทั้งหมดไว้แล้ว ท่านสามารถดูกราฟสรุปแบบละเอียดได้ที่ปุ่มด้านล่าง
              </Text>
              <TouchableOpacity style={styles.exportBtn} activeOpacity={0.8} onPress={() => { setCategoryModalVisible(false); router.push('/(admin)/statistics-chart' as any); }}>
                <Ionicons name="pie-chart" size={20} color="#FFFFFF" />
                <Text style={styles.exportBtnText}>ดูสถิติรูปแบบกราฟแบบละเอียด</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={filterModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlayFilter} activeOpacity={1} onPress={() => setFilterModalVisible(false)}>
          <View style={styles.modalContentFilter}>
            <View style={styles.modalHeaderFilter}>
              <Text style={styles.modalTitleFilter}>เลือกช่วงเวลาสถิติ</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}><Ionicons name="close" size={24} color="#6B7280" /></TouchableOpacity>
            </View>
            <FlatList
              data={DATE_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = selectedDate === item;
                return (
                  <TouchableOpacity style={styles.modalItemFilter} onPress={() => { setSelectedDate(item); setFilterModalVisible(false); }}>
                    <Text style={[styles.modalItemTextFilter, isSelected && styles.modalItemTextFilterActive]}>{item}</Text>
                    {isSelected ? <Ionicons name="checkmark-circle" size={20} color="#F28C28" /> : null}
                  </TouchableOpacity>
                );
              }}
            />
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
  appSubtitle: { fontSize: 11, fontWeight: '600', color: '#EF4444', marginTop: 2 },
  
  notificationBtn: { padding: 8, position: 'relative' },
  notificationBadge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, backgroundColor: '#EF4444', borderRadius: 9, borderWidth: 1.5, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },

  scrollContent: { paddingBottom: 40 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  dateFilterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E8', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#F2D7C4', gap: 6 },
  dateFilterText: { fontSize: 13, fontWeight: '700', color: '#F28C28' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, justifyContent: 'space-between', marginBottom: 8 },
  statBox: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderTopWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statCount: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 2 },
  statLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  sectionContainer: { paddingHorizontal: 20, marginTop: 10, marginBottom: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  seeAllText: { fontSize: 14, fontWeight: '700', color: '#F28C28' },
  chartBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6' },
  progressRow: { marginBottom: 16 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  progressValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  progressBarBg: { width: '100%', height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  clickHintRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 6 },
  clickHintText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  rankingBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6', marginTop: 12 },
  rankingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rankBadge: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  rankingName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  rankingCount: { fontSize: 14, fontWeight: '700', color: '#F28C28' },
  avatarImage: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#E5E7EB' },
  techInfo: { flex: 1 },
  techType: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  techCountBadge: { backgroundColor: '#FFF3E8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  techCountText: { fontSize: 13, fontWeight: '700', color: '#F28C28' },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  detailBox: { width: "100%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  detailHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  detailTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  closeBtn: { padding: 4 },
  detailSubList: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  subListItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  subListLabel: { fontSize: 14, color: '#4B5563' },
  subListValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F28C28', paddingVertical: 14, borderRadius: 12, marginTop: 20, marginBottom: 10, gap: 8 },
  exportBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  modalOverlayFilter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContentFilter: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10, maxHeight: '60%' },
  modalHeaderFilter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 10 },
  modalTitleFilter: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalItemFilter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalItemTextFilter: { fontSize: 16, color: '#4B5563' },
  modalItemTextFilterActive: { color: '#F28C28', fontWeight: '700' }
});