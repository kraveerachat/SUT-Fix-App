import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    FlatList,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Alert
} from 'react-native';

import { getAuth } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { storage } from '../../../constants/firebaseConfig';
import { db } from '../../../constants/firebaseConfig'; 

type RequestCardProps = {
    iconType: 'material' | 'ionicon' | 'feather';
    iconName: string;
    iconColor: string;
    iconBg: string;
    title: string;
    location: string;
    date: string;
    status: string;
    statusColor: string;
    statusBg: string;
    showActions?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onPressDetail?: () => void;
};

function RequestCard({
    iconType, iconName, iconColor, iconBg, title, location, date, status, statusColor, statusBg, 
    showActions = false, onEdit, onDelete, onPressDetail
}: RequestCardProps) {
    const renderIcon = () => {
        if (iconType === 'material') return <MaterialCommunityIcons name={iconName as any} size={22} color={iconColor} />;
        if (iconType === 'feather') return <Feather name={iconName as any} size={20} color={iconColor} />;
        return <Ionicons name={iconName as any} size={20} color={iconColor} />;
    };

    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPressDetail}>
            <View style={styles.cardTopRow}>
                <View style={styles.cardHeaderLeft}>
                    <View style={[styles.iconBox, { backgroundColor: iconBg }]}>{renderIcon()}</View>
                    <View style={styles.titleContainer}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
                        <Text style={styles.cardSubtitle} numberOfLines={1}>{location}</Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardBottomRow}>
                <Text style={styles.cardDate}>{date}</Text>
                <View style={styles.cardActionRow}>
                    {showActions && (
                        <>
                            <TouchableOpacity activeOpacity={0.7} style={styles.actionBtn} onPress={onDelete}>
                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            </TouchableOpacity>
                            <TouchableOpacity activeOpacity={0.7} style={styles.actionBtn} onPress={onEdit}>
                                <Feather name="edit-2" size={16} color="#4B5563" />
                            </TouchableOpacity>
                        </>
                    )}
                    <TouchableOpacity style={styles.detailBtn} onPress={onPressDetail} activeOpacity={0.7}>
                        <Text style={styles.detailText}>รายละเอียด</Text>
                        <Ionicons name="chevron-forward" size={16} color="#F28C28" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function HistoryScreen() {
    const [activeTab, setActiveTab] = useState('ทั้งหมด');
    const [sortOption, setSortOption] = useState('ใหม่ล่าสุด');
    const [sortModalVisible, setSortModalVisible] = useState(false);
    
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // ✅ เพิ่ม State สำหรับจัดการการแจ้งเตือน
    const [unreadCount, setUnreadCount] = useState(0);
    const [userData, setUserData] = useState<any>(null);

    const TABS = ['ทั้งหมด', 'รอดำเนินการ', 'กำลังดำเนินการ', 'เสร็จสมบูรณ์'];
    const SORT_OPTIONS = ['ใหม่ล่าสุด', 'เก่าที่สุด'];

    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        let unsubReports = () => {};
        let unsubUser = () => {};
        let unsubNotif = () => {};

        // 1. ดึงประวัติการแจ้งซ่อม
        const qReports = query(collection(db, "Reports"), where("userId", "==", user.uid));
        unsubReports = onSnapshot(qReports, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRequests(data);
            setLoading(false);
        });

        // 2. ดึงข้อมูล User (เพื่อเช็คสถานะการเปิด/ปิดแจ้งเตือน)
        unsubUser = onSnapshot(doc(db, "Users", user.uid), (docSnap) => {
            if (docSnap.exists()) setUserData(docSnap.data());
        });

        // 3. ดึงจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
        const qNotif = query(
            collection(db, "Notifications"),
            where("targetUid", "==", user.uid),
            where("isRead", "==", false)
        );
        unsubNotif = onSnapshot(qNotif, (snapshot) => {
            setUnreadCount(snapshot.size);
        });

        return () => {
            unsubReports();
            unsubUser();
            unsubNotif();
        };
    }, []);

    const filteredRequests = requests
        .filter(item => activeTab === 'ทั้งหมด' || item.status === activeTab || (activeTab === 'เสร็จสมบูรณ์' && (item.status === 'เสร็จสิ้น' || item.status === 'เสร็จสมบูรณ์')))
        .sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return sortOption === 'ใหม่ล่าสุด' ? timeB - timeA : timeA - timeB;
        });

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'รอดำเนินการ': return { color: '#D97706', bg: '#FEF3C7' };
            case 'กำลังดำเนินการ': case 'กำลังซ่อม': return { color: '#1D4ED8', bg: '#BFDBFE' };
            case 'เสร็จสมบูรณ์': case 'เสร็จสิ้น': return { color: '#047857', bg: '#A7F3D0' };
            default: return { color: '#6B7280', bg: '#F3F4F6' };
        }
    };

    const getCategoryConfig = (category: string) => {
        switch (category) {
            case 'ประปา': return { type: 'ionicon' as const, name: 'water', color: '#3B82F6', bg: '#DBEAFE' };
            case 'ไฟฟ้า': return { type: 'ionicon' as const, name: 'flash', color: '#EAB308', bg: '#FEF08A' };
            case 'แอร์': return { type: 'feather' as const, name: 'wind', color: '#06B6D4', bg: '#CFFAFE' };
            case 'เฟอร์นิเจอร์': return { type: 'ionicon' as const, name: 'bed', color: '#7C3AED', bg: '#EDE9FE' };
            default: return { type: 'ionicon' as const, name: 'build', color: '#F28C28', bg: '#FFF3E8' };
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert("ยืนยันการลบ", "ต้องการยกเลิกคำร้องนี้ใช่หรือไม่?", [
            { text: "ยกเลิก", style: "cancel" },
            { text: "ลบ", style: "destructive", onPress: async () => {
                try {
                    // ลบรูปใน Storage ก่อน
                    const snap = await getDoc(doc(db, "Reports", id));
                    if (snap.exists()) {
                        const images: string[] = snap.data().images || [];
                        for (const url of images) {
                            try { await deleteObject(ref(storage, url)); } catch {}
                        }
                    }
                    await deleteDoc(doc(db, "Reports", id));
                } catch (e) {
                    Alert.alert("ผิดพลาด", "ไม่สามารถลบได้");
                }
            }}
        ]);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <Image source={require('../../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
                    <View>
                        <Text style={styles.appName}>SUT FixIt</Text>
                        <Text style={styles.appSubtitle}>ระบบซ่อมบำรุงหอพัก</Text>
                    </View>
                </View>

                {/* ✅ อัปเดตกระดิ่งให้เช็คสถานะการตั้งค่า + จำนวนแจ้งเตือน */}
                <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push('/notification' as any)}>
                    <Ionicons name="notifications-outline" size={26} color="#111" />
                    {userData?.pushEnabled !== false && unreadCount > 0 && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.pageHeader}><Text style={styles.pageTitle}>ประวัติการแจ้งซ่อม</Text></View>

            <View style={styles.tabContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                    {TABS.map((tab) => (
                        <TouchableOpacity key={tab} style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]} onPress={() => setActiveTab(tab)}>
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.sortContainer}>
                <TouchableOpacity style={styles.sortButton} onPress={() => setSortModalVisible(true)}>
                    <Ionicons name="filter" size={14} color="#6B7280" />
                    <Text style={styles.sortButtonText}>เรียงตาม: {sortOption}</Text>
                    <Ionicons name="chevron-down" size={14} color="#6B7280" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator size="large" color="#F28C28" style={{ marginTop: 20 }} />
                ) : filteredRequests.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 40 }}>ไม่พบรายการในหมวดนี้</Text>
                ) : (
                    filteredRequests.map((req) => {
                        const statusConf = getStatusConfig(req.status);
                        const catConf = getCategoryConfig(req.category);

                        return (
                            <RequestCard
                                key={req.id}
                                iconType={catConf.type}
                                iconName={catConf.name}
                                iconColor={catConf.color}
                                iconBg={catConf.bg}
                                title={req.title || 'ไม่มีหัวข้อ'}
                                location={`${req.dorm} ・ ห้อง ${req.room}`}
                                date={new Date(req.createdAt).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: 'numeric'})}
                                status={req.status === 'กำลังดำเนินการ' ? 'กำลังซ่อม' : (req.status || 'รอดำเนินการ')}
                                statusColor={statusConf.color}
                                statusBg={statusConf.bg}
                                showActions={req.status === 'รอดำเนินการ'}
                                onEdit={() => router.push({ pathname: '/edit-report', params: { id: req.id } })}
                                onDelete={() => handleDelete(req.id)}
                                onPressDetail={() => {
                                    if (req.status === 'เสร็จสิ้น' || req.status === 'เสร็จสมบูรณ์') {
                                        router.push({ pathname: '/service-completed', params: { id: req.id } });
                                    } else {
                                        router.push({ pathname: '/edit-report', params: { id: req.id } });
                                    }
                                }}
                            />
                        );
                    })
                )}
            </ScrollView>

            <Modal visible={sortModalVisible} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>เรียงลำดับข้อมูล</Text>
                            <TouchableOpacity onPress={() => setSortModalVisible(false)}><Ionicons name="close" size={24} color="#6B7280" /></TouchableOpacity>
                        </View>
                        {SORT_OPTIONS.map((option) => (
                            <TouchableOpacity key={option} style={styles.modalItem} onPress={() => { setSortOption(option); setSortModalVisible(false); }}>
                                <Text style={[styles.modalItemText, sortOption === option && { color: '#F28C28', fontWeight: '700' }]}>{option}</Text>
                                {sortOption === option && <Ionicons name="checkmark-circle" size={20} color="#F28C28" />}
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
    logoImage: { width: 54, height: 54, borderRadius: 12, marginRight: 14 },
    appName: { fontSize: 18, fontWeight: '800', color: '#111827' },
    appSubtitle: { fontSize: 12, fontWeight: '500', color: '#F28C28', marginTop: 2 },
    
    // ✅ อัปเดตสไตล์สำหรับ Badge ให้เหมือนหน้าแรก
    notificationBtn: { padding: 8, position: 'relative' },
    notificationBadge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, backgroundColor: '#EF4444', borderRadius: 9, borderWidth: 1.5, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },

    pageHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
    pageTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
    tabContainer: { marginBottom: 16 },
    tabScroll: { paddingHorizontal: 20, gap: 10 },
    tabButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
    tabButtonActive: { backgroundColor: '#F28C28', borderColor: '#E67E22' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
    tabTextActive: { color: '#FFFFFF' },
    sortContainer: { paddingHorizontal: 20, marginBottom: 16, alignItems: 'flex-end' },
    sortButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', gap: 6 },
    sortButtonText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
    scrollContent: { paddingBottom: 30 },
    card: { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 16, borderRadius: 16, padding: 16, shadowColor: '#000', elevation: 2, borderWidth: 1, borderColor: '#F3F4F6', height: 145, justifyContent: 'space-between' },
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
    iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    titleContainer: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
    cardSubtitle: { fontSize: 13, color: '#6B7280' },
    statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    statusText: { fontSize: 12, fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
    cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardDate: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
    cardActionRow: { flexDirection: 'row', alignItems: 'center' },
    actionBtn: { padding: 6, marginRight: 6, backgroundColor: '#F9FAFB', borderRadius: 6 },
    detailBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
    detailText: { fontSize: 14, fontWeight: '700', color: '#F28C28', marginRight: 2 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 10 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalItemText: { fontSize: 16, color: '#4B5563' },
});