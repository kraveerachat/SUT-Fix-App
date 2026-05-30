import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
    Alert,
} from 'react-native';

import { getAuth } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../../constants/firebaseConfig'; 

// ==========================================
// Component: การ์ดรายการแจ้งซ่อม (RequestCard)
// ==========================================
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
                    <TouchableOpacity style={styles.detailBtn} activeOpacity={0.7} onPress={onPressDetail}>
                        <Text style={styles.detailText}>รายละเอียด</Text>
                        <Ionicons name="chevron-forward" size={16} color="#F28C28" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'รอดำเนินการ': return { color: '#D97706', bg: '#FEF3C7' };
        case 'กำลังดำเนินการ': return { color: '#1D4ED8', bg: '#BFDBFE' };
        case 'เสร็จสมบูรณ์': return { color: '#047857', bg: '#A7F3D0' };
        case 'เสร็จสิ้น': return { color: '#047857', bg: '#A7F3D0' }; 
        default: return { color: '#6B7280', bg: '#F3F4F6' };
    }
};

const getCategoryConfig = (category: string) => {
    switch (category) {
        case 'ประปา': return { type: 'ionicon' as const, name: 'water', color: '#3B82F6', bg: '#DBEAFE' };
        case 'ไฟฟ้า': return { type: 'ionicon' as const, name: 'flash', color: '#EAB308', bg: '#FEF08A' };
        case 'แอร์': return { type: 'feather' as const, name: 'wind', color: '#06B6D4', bg: '#CFFAFE' };
        default: return { type: 'ionicon' as const, name: 'build', color: '#F28C28', bg: '#FFF3E8' };
    }
};

export default function HomeScreen() {
    const [userData, setUserData] = useState<any>(null);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0); 

    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;
        let unsubUser = () => {};
        let unsubReports = () => {};
        let unsubNotif = () => {}; 

        if (user) {
            unsubUser = onSnapshot(doc(db, "Users", user.uid), (docSnap) => {
                if (docSnap.exists()) setUserData(docSnap.data());
            });

            const q = query(collection(db, "Reports"), where("userId", "==", user.uid));
            unsubReports = onSnapshot(q, (snapshot) => {
                const reqData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
                reqData.sort((a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0));
                setRequests(reqData);
                setLoading(false);
            });

            const qNotif = query(
                collection(db, "Notifications"),
                where("targetUid", "==", user.uid),
                where("isRead", "==", false)
            );
            unsubNotif = onSnapshot(qNotif, (snapshot) => {
                setUnreadCount(snapshot.size);
            });

        } else {
            setLoading(false);
        }
        return () => { unsubUser(); unsubReports(); unsubNotif(); };
    }, []);

    // ✅ ฟังก์ชันช่วยสกัด Path จาก URL และลบออกจาก Storage
    const deleteFileFromStorage = async (fileUrl: string) => {
        if (!fileUrl) return;
        try {
            // ถอดรหัส URL ตัดส่วน https://.../o/ และ ?alt=media ออก ให้เหลือแค่ Path จริง (เช่น reports/image.jpg)
            const decodedUrl = decodeURIComponent(fileUrl);
            const startIndex = decodedUrl.indexOf('/o/') + 3;
            const endIndex = decodedUrl.indexOf('?');
            
            if (startIndex > 2) {
                const filePath = decodedUrl.substring(startIndex, endIndex !== -1 ? endIndex : decodedUrl.length);
                const imageRef = ref(storage, filePath);
                await deleteObject(imageRef);
                console.log("✅ ลบรูปภาพสำเร็จ:", filePath);
            } else {
                // กรณีที่เป็นชื่อไฟล์ตรงๆ (ไม่ได้มาเป็น HTTPS)
                const imageRef = ref(storage, fileUrl);
                await deleteObject(imageRef);
                console.log("✅ ลบรูปภาพสำเร็จ:", fileUrl);
            }
        } catch (err) {
            console.log("❌ ลบรูปไม่สำเร็จ (อาจโดนลบไปแล้ว): ", err);
        }
    };

    const handleDeleteReport = (reportId: string) => {
        Alert.alert("ยืนยันการลบ", "คุณแน่ใจหรือไม่ว่าต้องการลบรายการแจ้งซ่อมนี้?", [
            { text: "ยกเลิก", style: "cancel" },
            { 
                text: "ลบรายการ", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        const targetReport = requests.find(r => r.id === reportId);
                        
                        // 1. ดึง URL รูปภาพทั้งหมดมาลบทิ้งก่อน
                        if (targetReport) {
                            if (targetReport.images && Array.isArray(targetReport.images)) {
                                for (const imageUrl of targetReport.images) {
                                    await deleteFileFromStorage(imageUrl);
                                }
                            }
                            if (targetReport.image && typeof targetReport.image === 'string') {
                                await deleteFileFromStorage(targetReport.image);
                            }
                        }

                        // 2. เมื่อลบรูปร้อยแล้ว ค่อยลบ Document ใน Firestore
                        await deleteDoc(doc(db, "Reports", reportId));
                        
                    } catch (error) {
                        Alert.alert("ผิดพลาด", "ไม่สามารถลบข้อมูลได้");
                        console.error(error);
                    }
                } 
            }
        ]);
    };

    const formatDate = (isoString: string) => {
        if (!isoString) return 'ไม่มีข้อมูลวันที่';
        const d = new Date(isoString);
        return `สร้างเมื่อ ${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
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
                <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push('/notification')}>
                    <Ionicons name="notifications-outline" size={26} color="#111" />
                    {userData?.pushEnabled !== false && unreadCount > 0 && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={styles.welcomeCard} activeOpacity={0.8} onPress={() => router.push('/profile')}>
                    <View style={styles.avatarCircle}>
                        {userData?.profileImage ? (
                            <Image 
                                source={{ uri: userData.profileImage }} 
                                style={{ width: '100%', height: '100%', borderRadius: 50, resizeMode: 'cover' }} 
                            />
                        ) : (
                            <Ionicons name="person" size={40} color="#F28C28" />
                        )}
                    </View>
                    <View style={styles.welcomeTextContainer}>
                        <Text style={styles.welcomeTitle}>Hi, {userData?.fullName || userData?.studentId || 'นักศึกษา'}</Text>
                        <View style={styles.locationBadge}>
                            <Ionicons name="location" size={14} color="#F28C28" />
                            <Text style={styles.locationText}>{userData?.dorm && userData?.room ? `${userData.dorm} ・ ห้อง ${userData.room}` : 'ยังไม่ระบุหอพัก/ห้อง'}</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.reportButton} onPress={() => router.push('/report')} activeOpacity={0.8}>
                    <Ionicons name="build" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.reportButtonText}>แจ้งซ่อมแซม (Report an Issue)</Text>
                </TouchableOpacity>

                <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>การแจ้งซ่อมของฉัน</Text>
                    <TouchableOpacity onPress={() => router.push('/history')}><Text style={styles.viewAllText}>ดูทั้งหมด</Text></TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#F28C28" style={{ marginTop: 20 }} />
                ) : requests.length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 20 }}>
                        <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
                        <Text style={{ color: '#9CA3AF', marginTop: 10 }}>ยังไม่มีประวัติการแจ้งซ่อม</Text>
                    </View>
                ) : (
                    requests.map((req) => {
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
                                location={`${req.dorm || ''} ・ ห้อง ${req.room || ''}`}
                                date={formatDate(req.createdAt)}
                                status={req.status === 'กำลังดำเนินการ' ? 'กำลังซ่อม' : (req.status || 'รอดำเนินการ')}
                                statusColor={statusConf.color}
                                statusBg={statusConf.bg}
                                showActions={req.status === 'รอดำเนินการ'}
                                onEdit={() => router.push({ pathname: '/edit-report', params: { id: req.id } })}
                                onDelete={() => handleDeleteReport(req.id)}
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
    notificationBtn: { padding: 8, position: 'relative' },
    notificationBadge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, backgroundColor: '#EF4444', borderRadius: 9, borderWidth: 1.5, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
    scrollContent: { paddingBottom: 30, paddingTop: 15 },
    welcomeCard: { marginHorizontal: 20, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    avatarCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF3E8', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: '#F28C28' },
    welcomeTextContainer: { flex: 1 },
    welcomeTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
    locationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E8', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    locationText: { fontSize: 13, fontWeight: '600', color: '#F28C28', marginLeft: 4 },
    reportButton: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#F28C28', height: 56, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#F28C28', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    reportButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    sectionRow: { marginTop: 30, marginHorizontal: 20, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    viewAllText: { fontSize: 14, fontWeight: '600', color: '#F28C28' },
    card: { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 16, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6', height: 145, justifyContent: 'space-between' },
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
});