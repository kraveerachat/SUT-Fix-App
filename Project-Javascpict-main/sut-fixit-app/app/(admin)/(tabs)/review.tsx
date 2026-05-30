import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
    FlatList, Image, Modal, Platform, SafeAreaView, ScrollView, SectionList,
    StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Alert, RefreshControl
} from 'react-native';

import { getAuth } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../constants/firebaseConfig';
import { API_URL } from '../../../constants/api';

const STATUS_TABS  = ['ทั้งหมด', 'รอตรวจงาน', 'กำลังซ่อม', 'เสร็จสิ้น'];
const DATE_OPTIONS = ['ทั้งหมด', 'วันนี้', 'เมื่อวาน', '7 วันที่แล้ว', 'เดือนนี้'];
const SORT_OPTIONS = ['ใหม่ล่าสุด', 'เก่าที่สุด'];

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
        const y = new Date(startOfToday); y.setDate(y.getDate() - 1);
        return taskDate >= y && taskDate < startOfToday;
    }
    if (filter === '7 วันที่แล้ว') {
        const s = new Date(startOfToday); s.setDate(s.getDate() - 7);
        return taskDate >= s;
    }
    if (filter === 'เดือนนี้') return taskDate >= new Date(now.getFullYear(), now.getMonth(), 1);
    return true;
};

const formatThaiDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
};

export default function AdminReviewScreen() {
    const [activeTab,  setActiveTab]  = useState('รอตรวจงาน');
    const [tasks,      setTasks]      = useState<any[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ── Filter state ──────────────────────────────────────────────────────
    const [selectedDate, setSelectedDate] = useState('วันที่');
    const [selectedDorm, setSelectedDorm] = useState('หอพัก');
    const [sortOption,   setSortOption]   = useState('ใหม่ล่าสุด');

    const [dateModalVisible, setDateModalVisible] = useState(false);
    const [dormModalVisible, setDormModalVisible] = useState(false);
    const [sortModalVisible, setSortModalVisible] = useState(false);

    // ── Detail Modal state ────────────────────────────────────────────────
    const [openDetail,   setOpenDetail]   = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [techInfo,     setTechInfo]     = useState<any>(null);

    const [unreadCount, setUnreadCount] = useState(0);
    const [userData,    setUserData]    = useState<any>(null);

    const auth = getAuth();

    const fetchTasks = async () => {
        try {
            const ts  = new Date().getTime();
            const res = await fetch(`${API_URL}/reports?t=${ts}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setTasks(data);
        } catch (e) {
            console.error("Fetch API Error:", e);
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
        const unsubUser  = onSnapshot(doc(db, "Users", user.uid), (s) => { if (s.exists()) setUserData(s.data()); });
        const qNotif     = query(collection(db, "Notifications"), where("targetUid", "==", user.uid), where("isRead", "==", false));
        const unsubNotif = onSnapshot(qNotif, (s) => { setUnreadCount(s.size); });
        return () => { unsubUser(); unsubNotif(); };
    }, []);

    const handleOpenReview = async (task: any) => {
        setSelectedTask(task);
        setOpenDetail(true);
        setTechInfo(null);
        const tId = task.techId || task.technicianId || task.workerId;
        if (tId) {
            try {
                const snap = await getDoc(doc(db, "Users", tId));
                if (snap.exists()) setTechInfo(snap.data());
            } catch (e) { console.error(e); }
        } else if (task.techName || task.technicianName) {
            setTechInfo({ fullName: task.techName || task.technicianName });
        }
    };

    const handleApproveWork = async () => {
        if (!selectedTask) return;
        Alert.alert("ยืนยันการอนุมัติ", "คุณต้องการอนุมัติและปิดงานนี้ใช่หรือไม่?", [
            { text: "ยกเลิก", style: "cancel" },
            { text: "อนุมัติ", onPress: async () => {
                try {
                    const res = await fetch(`${API_URL}/reports/${selectedTask.id}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: "เสร็จสิ้น", approvedAt: new Date().toISOString(), adminId: auth.currentUser?.uid })
                    });
                    if (!res.ok) throw new Error();
                    if (selectedTask.userId) {
                        await fetch(`${API_URL}/notifications`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ targetUid: selectedTask.userId, title: "งานได้รับการอนุมัติเรียบร้อย ✅", body: `แอดมินได้ตรวจสอบและอนุมัติงานซ่อม "${selectedTask.title}" แล้ว`, isRead: false, type: "repair_completed", jobId: selectedTask.id, createdAt: new Date().toISOString() })
                        });
                    }
                    setOpenDetail(false);
                    Alert.alert("สำเร็จ", "อนุมัติงานเรียบร้อย");
                    fetchTasks();
                } catch { Alert.alert("ผิดพลาด", "ไม่สามารถอนุมัติงานได้"); }
            }}
        ]);
    };

    const handleDeleteJob = async (jobId: string) => {
        Alert.alert("ยืนยันการลบ", "คุณต้องการลบข้อมูลนี้ออกจากระบบถาวรใช่หรือไม่?", [
            { text: "ยกเลิก", style: "cancel" },
            { text: "ลบทิ้ง", style: "destructive", onPress: async () => {
                try {
                    const res = await fetch(`${API_URL}/reports/${jobId}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error();
                    setOpenDetail(false);
                    Alert.alert("สำเร็จ", "ลบข้อมูลเรียบร้อยแล้ว");
                    fetchTasks();
                } catch { Alert.alert("ผิดพลาด", "ไม่สามารถลบข้อมูลได้"); }
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

    // ── Apply filters + sort ──────────────────────────────────────────────
    const filteredTasks = tasks
        .filter(task => {
            let matchTab = activeTab === 'ทั้งหมด';
            if (activeTab === 'รอตรวจงาน') matchTab = ['เสร็จสมบูรณ์','รอตรวจงาน','รอตรวจสอบ','ซ่อมแซมเสร็จสิ้น'].includes(task.status);
            if (activeTab === 'กำลังซ่อม') matchTab = task.status === 'กำลังดำเนินการ' || task.status === 'กำลังซ่อม';
            if (activeTab === 'เสร็จสิ้น')  matchTab = task.status === 'เสร็จสิ้น' || task.status === 'Approved';

            const matchDate = matchesDateFilter(task.updatedAt || task.createdAt, selectedDate);
            const matchDorm = selectedDorm === 'หอพัก' || selectedDorm === 'ทั้งหมด' || task.dorm === selectedDorm;

            return matchTab && matchDate && matchDorm;
        })
        .sort((a, b) => {
            const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return sortOption === 'ใหม่ล่าสุด' ? tB - tA : tA - tB;
        });

    const isDateActive = selectedDate !== 'วันที่';
    const isDormActive = selectedDorm !== 'หอพัก';
    const isSortActive = sortOption   !== 'ใหม่ล่าสุด';

    // ── Modal item renderer (shared) ─────────────────────────────────────
    const ModalItem = ({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) => (
        <TouchableOpacity style={[styles.modalItem, isActive && styles.modalItemActive]} onPress={onPress}>
            <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>{label}</Text>
            {isActive && <Ionicons name="checkmark" size={18} color="#F28C28" />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>

            {/* ── Header ── */}
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
                <View style={styles.pageHeader}><Text style={styles.pageTitle}>ตรวจงาน</Text></View>

                {/* ── Status Tabs ── */}
                <View style={styles.tabContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                        {STATUS_TABS.map((tab) => (
                            <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)}>
                                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* ── Filter Row ── */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {/* วันที่ */}
                    <TouchableOpacity style={[styles.filterDropdown, isDateActive && styles.filterDropdownActive]} onPress={() => setDateModalVisible(true)}>
                        <Ionicons name="calendar-outline" size={13} color={isDateActive ? '#F28C28' : '#6B7280'} />
                        <Text style={[styles.filterText, isDateActive && styles.filterTextActive]} numberOfLines={1}>{selectedDate}</Text>
                        <Ionicons name="chevron-down" size={13} color={isDateActive ? '#F28C28' : '#6B7280'} />
                    </TouchableOpacity>

                    {/* หอพัก */}
                    <TouchableOpacity style={[styles.filterDropdown, isDormActive && styles.filterDropdownActive]} onPress={() => setDormModalVisible(true)}>
                        <Ionicons name="business-outline" size={13} color={isDormActive ? '#F28C28' : '#6B7280'} />
                        <Text style={[styles.filterText, isDormActive && styles.filterTextActive]} numberOfLines={1}>{selectedDorm}</Text>
                        <Ionicons name="chevron-down" size={13} color={isDormActive ? '#F28C28' : '#6B7280'} />
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

                {/* ── Task List ── */}
                <View style={styles.listContainer}>
                    {loading ? (
                        <ActivityIndicator size="large" color="#F28C28" style={{ marginTop: 40 }} />
                    ) : filteredTasks.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="checkmark-done-circle-outline" size={60} color="#D1D5DB" />
                            <Text style={styles.emptyText}>ไม่มีรายการในหมวดหมู่นี้</Text>
                        </View>
                    ) : filteredTasks.map((task) => {
                        const config    = getCategoryConfig(task.category);
                        const isWaiting = ['เสร็จสมบูรณ์','รอตรวจงาน','รอตรวจสอบ','ซ่อมแซมเสร็จสิ้น'].includes(task.status);

                        let statusColor = '#F59E0B';
                        if (task.status === 'กำลังดำเนินการ' || task.status === 'กำลังซ่อม') statusColor = '#3B82F6';
                        if (task.status === 'เสร็จสิ้น' || task.status === 'Approved')       statusColor = '#10B981';
                        if (isWaiting) statusColor = '#8B5CF6';

                        return (
                            <TouchableOpacity key={task.id} style={styles.ticketCard} onPress={() => handleOpenReview(task)}>
                                <View style={[styles.urgencyIndicator, { backgroundColor: config.color }]} />
                                <View style={styles.ticketContent}>
                                    <View style={styles.ticketHeader}>
                                        <View style={[styles.badge, { backgroundColor: config.bg }]}>
                                            <Ionicons name={config.icon as any} size={14} color={config.color} />
                                            <Text style={[styles.badgeTextCat, { color: config.color }]}>{task.category}</Text>
                                        </View>
                                        {isWaiting && (
                                            <View style={styles.reviewBadge}>
                                                <Text style={styles.reviewBadgeText}>รอตรวจสอบ</Text>
                                            </View>
                                        )}
                                    </View>

                                    <Text style={styles.issueTitle} numberOfLines={1}>{task.title}</Text>
                                    <View style={styles.locationRow}>
                                        <Ionicons name="location" size={14} color="#9CA3AF" />
                                        <Text style={styles.locationText}>{task.dorm} ・ ห้อง {task.room}</Text>
                                    </View>

                                    {/* ✅ วันที่อัปเดต */}
                                    <View style={[styles.locationRow, { marginTop: 5 }]}>
                                        <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
                                        <Text style={[styles.locationText, { color: '#9CA3AF', fontSize: 12 }]}>
                                            อัปเดต: {formatThaiDate(task.updatedAt || task.closedAt || task.createdAt)}
                                        </Text>
                                    </View>

                                    <View style={styles.divider} />

                                    <View style={styles.ticketFooter}>
                                        <Text style={[styles.statusText, { color: statusColor }]}>
                                            สถานะ: {task.status === 'กำลังดำเนินการ' ? 'กำลังซ่อม' : task.status}
                                        </Text>
                                        <View style={styles.actionBtn}>
                                            <Text style={styles.actionText}>ตรวจสอบ</Text>
                                            <Ionicons name="arrow-forward" size={16} color="#F28C28" />
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* ─── Modal รายละเอียดงาน ─── */}
            <Modal visible={openDetail} animationType="slide" transparent={true}>
                <View style={styles.modalBg}>
                    <View style={styles.detailBox}>
                        <View style={styles.detailHeader}>
                            <TouchableOpacity onPress={() => setOpenDetail(false)}>
                                <Ionicons name="chevron-back" size={26} color="#111827" />
                            </TouchableOpacity>
                            <Text style={styles.detailTitle}>ตรวจสอบงานซ่อม</Text>
                            <View style={{ width: 30 }} />
                        </View>

                        {selectedTask && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Tech Info */}
                                <View style={styles.techInfoRow}>
                                    <Image
                                        source={{ uri: techInfo?.avatar || `https://ui-avatars.com/api/?name=${techInfo?.fullName || 'T'}&background=F28C28&color=fff` }}
                                        style={styles.techAvatar}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.techName}>ช่าง: {techInfo?.fullName || techInfo?.name || selectedTask.techName || 'ไม่ระบุชื่อ'}</Text>
                                        <Text style={styles.techPhone}>เบอร์ติดต่อ {techInfo?.phone || '-'}</Text>
                                    </View>
                                </View>

                                {/* Problem detail */}
                                <View style={styles.problemBox}>
                                    <Text style={styles.sectionTitle}>📝 รายละเอียดปัญหา</Text>
                                    <Text style={{ fontSize: 14, color: '#374151' }}>{selectedTask.title}</Text>
                                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{selectedTask.detail || 'ไม่มีรายละเอียดเพิ่มเติม'}</Text>
                                </View>

                                {/* Images before / after */}
                                <Text style={styles.sectionTitle}>รูปภาพประกอบการซ่อม</Text>
                                <View style={styles.imageRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.imageLabel}>ก่อนซ่อม</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {selectedTask.images?.length > 0 ? selectedTask.images.map((img: string, i: number) => (
                                                <Image key={i} source={{ uri: img }} style={[styles.compareImage, { marginRight: 8 }]} />
                                            )) : <Image source={{ uri: 'https://via.placeholder.com/140' }} style={styles.compareImage} />}
                                        </ScrollView>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.imageLabel}>หลังซ่อม</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {selectedTask.afterImages?.length > 0 ? selectedTask.afterImages.map((img: string, i: number) => (
                                                <Image key={i} source={{ uri: img }} style={[styles.compareImage, { marginRight: 8, borderColor: '#10B981', borderWidth: 2 }]} />
                                            )) : selectedTask.finishImage ? (
                                                <Image source={{ uri: selectedTask.finishImage }} style={[styles.compareImage, { borderColor: '#10B981', borderWidth: 2 }]} />
                                            ) : <Image source={{ uri: 'https://via.placeholder.com/140' }} style={[styles.compareImage, { borderColor: '#10B981', borderWidth: 2 }]} />}
                                        </ScrollView>
                                    </View>
                                </View>

                                {/* Tech summary */}
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={styles.sectionTitle}>สรุปงานจากช่าง</Text>
                                    <View style={styles.noteBox}>
                                        <Text style={styles.noteText}>รายละเอียด: <Text style={{ fontWeight: '500' }}>{selectedTask.closingDetail || selectedTask.action || 'ไม่มีการบันทึก'}</Text></Text>
                                        <View style={styles.noteDivider} />
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={[styles.noteText, { color: '#6B7280' }]}>ค่าวัสดุอุปกรณ์:</Text>
                                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#EF4444' }}>{selectedTask.materialCost || selectedTask.cost || '0'} บาท</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Approve button */}
                                {['เสร็จสมบูรณ์','รอตรวจงาน','รอตรวจสอบ','ซ่อมแซมเสร็จสิ้น'].includes(selectedTask.status) && (
                                    <TouchableOpacity style={styles.approveBtn} onPress={handleApproveWork}>
                                        <Ionicons name="checkmark-done" size={20} color="#059669" />
                                        <Text style={styles.approveBtnText}>อนุมัติและปิดงาน</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Delete button */}
                                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteJob(selectedTask.id)}>
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    <Text style={styles.deleteBtnText}>ลบข้อมูลแจ้งซ่อม (Delete)</Text>
                                </TouchableOpacity>

                                <View style={{ height: 20 }} />
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ─── Modal วันที่ ─── */}
            <Modal visible={dateModalVisible} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDateModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>เลือกช่วงเวลา</Text>
                        {DATE_OPTIONS.map((item) => (
                            <ModalItem key={item} label={item} isActive={selectedDate === item} onPress={() => { setSelectedDate(item); setDateModalVisible(false); }} />
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ─── Modal หอพัก ─── */}
            <Modal visible={dormModalVisible} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDormModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>เลือกหอพัก</Text>
                        <SectionList
                            sections={DORM_SECTIONS}
                            keyExtractor={(item) => item}
                            stickySectionHeadersEnabled={false}
                            ListHeaderComponent={
                                <ModalItem label="ทั้งหมด" isActive={selectedDorm === 'ทั้งหมด'} onPress={() => { setSelectedDorm('ทั้งหมด'); setDormModalVisible(false); }} />
                            }
                            renderSectionHeader={({ section: { title } }) => (
                                <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>{title}</Text></View>
                            )}
                            renderItem={({ item }) => (
                                <ModalItem label={item} isActive={selectedDorm === item} onPress={() => { setSelectedDorm(item); setDormModalVisible(false); }} />
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ─── Modal เรียงลำดับ ─── */}
            <Modal visible={sortModalVisible} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>เรียงลำดับ</Text>
                        {SORT_OPTIONS.map((item) => (
                            <ModalItem key={item} label={item} isActive={sortOption === item} onPress={() => { setSortOption(item); setSortModalVisible(false); }} />
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
    appSubtitle: { fontSize: 11, fontWeight: '600', color: '#EF4444', marginTop: 2 },
    notificationBtn: { padding: 8, position: 'relative' },
    notificationBadge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, backgroundColor: '#EF4444', borderRadius: 9, borderWidth: 1.5, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
    scrollContent: { paddingBottom: 40 },
    pageHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
    pageTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },

    // Tabs
    tabContainer: { marginBottom: 12 },
    tabScroll: { paddingHorizontal: 20, gap: 10 },
    tabBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
    tabBtnActive: { backgroundColor: '#F28C28', borderColor: '#E67E22' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
    tabTextActive: { color: '#FFFFFF' },

    // Filter Row
    filterRow: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
    filterDropdown: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 5, minWidth: 105 },
    filterDropdownActive: { borderColor: '#F28C28', backgroundColor: '#FFF8F0' },
    filterText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
    filterTextActive: { color: '#F28C28' },

    resultRow: { paddingHorizontal: 20, marginBottom: 8 },
    resultText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },

    // Cards
    listContainer: { paddingHorizontal: 20 },
    emptyBox: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: '#9CA3AF', marginTop: 10, fontSize: 15 },
    ticketCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, elevation: 3, borderWidth: 1, borderColor: '#F3F4F6', overflow: 'hidden' },
    urgencyIndicator: { width: 6 },
    ticketContent: { flex: 1, padding: 16 },
    ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 },
    badgeTextCat: { fontSize: 12, fontWeight: '700' },
    reviewBadge: { backgroundColor: '#FEF08A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    reviewBadgeText: { fontSize: 11, fontWeight: '800', color: '#B45309' },
    issueTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 6 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locationText: { fontSize: 13, color: '#4B5563' },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
    ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusText: { fontSize: 13, fontWeight: '700' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionText: { fontSize: 14, fontWeight: '700', color: '#F28C28' },

    // Detail Modal
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    detailBox: { width: '100%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, maxHeight: '90%' },
    detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    detailTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
    techInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    techAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 16, backgroundColor: '#F28C28' },
    techName: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
    techPhone: { fontSize: 13, color: '#6B7280' },
    problemBox: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, marginBottom: 20 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 10 },
    imageRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    imageLabel: { fontSize: 13, color: '#6B7280', marginBottom: 8, fontWeight: '600' },
    compareImage: { width: 140, aspectRatio: 1, borderRadius: 12, backgroundColor: '#F3F4F6' },
    noteBox: { backgroundColor: '#FFF7ED', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FFEDD5' },
    noteText: { fontSize: 14, color: '#C2410C', lineHeight: 22 },
    noteDivider: { height: 1, backgroundColor: '#FED7AA', marginVertical: 12 },
    approveBtn: { flexDirection: 'row', backgroundColor: '#D1FAE5', paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 8 },
    approveBtnText: { fontSize: 16, fontWeight: '800', color: '#059669' },
    deleteBtn: { flexDirection: 'row', backgroundColor: '#FEE2E2', paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderWidth: 1, borderColor: '#FCA5A5', gap: 8 },
    deleteBtnText: { fontSize: 16, fontWeight: '800', color: '#EF4444' },

    // Filter Modals
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