import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    FlatList, Image, Modal, Platform, SafeAreaView, ScrollView,
    StyleSheet, Text, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';

import { collection, query, onSnapshot, where, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; 
import { db } from '../../../constants/firebaseConfig'; 

const MONTH_OPTIONS = ['ภาพรวมทั้งหมด', 'มีนาคม 2569', 'กุมภาพันธ์ 2569', 'มกราคม 2569', 'ธันวาคม 2568', 'พฤศจิกายน 2568', 'ตุลาคม 2568'];

export default function TechStatisticsScreen() {
    const [selectedMonth, setSelectedMonth] = useState('ภาพรวมทั้งหมด');
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [allReports, setAllReports] = useState<any[]>([]); 

    // ✅ State สำหรับแจ้งเตือน
    const [unreadCount, setUnreadCount] = useState(0);
    const [userData, setUserData] = useState<any>(null);

    const [stats, setStats] = useState({
        totalJobs: 0, completed: 0, ongoing: 0, canceled: 0,
        averageRating: 0, speedScore: 0, qualityScore: 0,
        ratingDistribution: [
            { stars: 5, percentage: 0 }, { stars: 4, percentage: 0 }, { stars: 3, percentage: 0 },
            { stars: 2, percentage: 0 }, { stars: 1, percentage: 0 }
        ]
    });
    const [reviews, setReviews] = useState<any[]>([]);

    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        
        let unsubReports = () => {};
        let unsubUser = () => {};
        let unsubNotif = () => {};

        // 1. ดึงงาน
        const qReports = query(collection(db, "Reports"), where("techId", "==", user.uid));
        unsubReports = onSnapshot(qReports, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // ✅ ส่วนที่เพิ่ม: กรองเอางานที่ถูกแอดมินซ่อน (hideFromTech) ออกไปเลย
            const visibleData = data.filter((doc: any) => !doc.hideFromTech);
            setAllReports(visibleData);
            setLoading(false);
        });

        // 2. ดึงการตั้งค่า
        unsubUser = onSnapshot(doc(db, "Users", user.uid), (docSnap) => {
            if (docSnap.exists()) setUserData(docSnap.data());
        });

        // 3. ดึงยอดแจ้งเตือน
        const qNotif = query(collection(db, "Notifications"), where("targetUid", "==", user.uid), where("isRead", "==", false));
        unsubNotif = onSnapshot(qNotif, (snapshot) => {
            setUnreadCount(snapshot.size);
        });

        return () => { unsubReports(); unsubUser(); unsubNotif(); };
    }, []);

    useEffect(() => {
        if (allReports.length === 0) {
             setLoading(false);
             return;
        }

        let filtered = allReports;
        if (selectedMonth !== 'ภาพรวมทั้งหมด') {
            filtered = allReports.filter(report => {
                const dateTarget = report.closedAt || report.approvedAt || report.createdAt; 
                if (!dateTarget) return false;
                const monthYear = new Date(dateTarget).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
                return monthYear === selectedMonth;
            });
        }

        const total = filtered.length;
        const completedDocs = filtered.filter(d => ['เสร็จสิ้น', 'เสร็จสมบูรณ์', 'Approved'].includes(d.status));
        const ongoingDocs = filtered.filter(d => ['กำลังดำเนินการ', 'กำลังซ่อม', 'รอตรวจงาน'].includes(d.status));

        let totalSat = 0, totalSpeed = 0, countRating = 0;
        let dist = [0, 0, 0, 0, 0];
        const latestReviews: any[] = [];

        completedDocs.forEach(d => {
            if (d.rating || d.isReviewed) {
                const sat = d.rating?.quality || d.rating?.satisfaction || d.qualityRating || 0;
                const speed = d.rating?.speed || d.speedRating || 0;
                
                if (sat > 0) {
                    totalSat += sat;
                    totalSpeed += speed;
                    countRating++;
                    const s = Math.round(sat);
                    if (s >= 1 && s <= 5) dist[5 - s]++;

                    latestReviews.push({
                        id: d.id, name: d.name || "นักศึกษา", room: `${d.dorm} - ห้อง ${d.room}`,
                        rating: sat, comment: d.rating?.comment || d.reviewComment || "",
                        date: d.rating?.ratedAt ? new Date(d.rating.ratedAt).toLocaleDateString('th-TH') : '-'
                    });
                }
            }
        });

        latestReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setStats({
            totalJobs: total, completed: completedDocs.length, ongoing: ongoingDocs.length, canceled: 0,
            averageRating: countRating > 0 ? parseFloat((totalSat / countRating).toFixed(1)) : 0,
            speedScore: countRating > 0 ? parseFloat((totalSpeed / countRating).toFixed(1)) : 0,
            qualityScore: countRating > 0 ? parseFloat((totalSat / countRating).toFixed(1)) : 0,
            ratingDistribution: dist.map((count, index) => ({
                stars: 5 - index, percentage: countRating > 0 ? (count / countRating) * 100 : 0
            }))
        });
        setReviews(latestReviews.slice(0, 10)); 
    }, [selectedMonth, allReports]);

    const renderStars = (rating: number, size = 14) => (
        <View style={{ flexDirection: 'row', gap: 2 }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons key={star} name={star <= rating ? 'star' : 'star-outline'} size={size} color={star <= rating ? '#F59E0B' : '#D1D5DB'} />
            ))}
        </View>
    );

    if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" color="#F28C28" /></View>;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <Image source={require('../../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
                    <View>
                        <Text style={styles.appName}>SUT FixIt</Text>
                        <Text style={styles.appSubtitle}>ช่างเทคนิค (Technician)</Text>
                    </View>
                </View>
                {/* ✅ เพิ่มกระดิ่งแจ้งเตือนแบบ Real-time */}
                <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push('/(technician)/notification' as any)}>
                    <Ionicons name="notifications-outline" size={26} color="#111" />
                    {userData?.pushEnabled !== false && unreadCount > 0 && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.pageHeaderRow}>
                    <Text style={styles.pageTitle}>สถิติผลงาน</Text>
                    <TouchableOpacity style={styles.filterBadge} onPress={() => setModalVisible(true)}>
                        <Text style={styles.filterText}>{selectedMonth}</Text>
                        <Ionicons name="chevron-down" size={14} color="#F28C28" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                </View>

                <View style={styles.kpiGrid}>
                    <View style={[styles.kpiCard, { width: '100%', backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                        <View style={styles.kpiHeader}>
                            <MaterialCommunityIcons name="clipboard-text-outline" size={20} color="#3B82F6" />
                            <Text style={styles.kpiTitle}>งานทั้งหมดในเดือนนี้</Text>
                        </View>
                        <Text style={[styles.kpiValue, { color: '#1D4ED8' }]}>{stats.totalJobs}</Text>
                    </View>

                    <View style={[styles.kpiCard, { width: '48%', backgroundColor: '#F0FDF4', borderColor: '#A7F3D0' }]}>
                        <View style={styles.kpiHeader}>
                            <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
                            <Text style={styles.kpiTitle}>เสร็จสิ้น</Text>
                        </View>
                        <Text style={[styles.kpiValue, { color: '#047857' }]}>{stats.completed}</Text>
                    </View>

                    <View style={[styles.kpiCard, { width: '48%', backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                        <View style={styles.kpiHeader}>
                            <Ionicons name="time-outline" size={18} color="#EF4444" />
                            <Text style={styles.kpiTitle}>ค้างดำเนินการ</Text>
                        </View>
                        <Text style={[styles.kpiValue, { color: '#B91C1C' }]}>{stats.ongoing}</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>คะแนนความพึงพอใจ</Text>
                <View style={styles.ratingCard}>
                    <View style={styles.ratingTopRow}>
                        <View style={styles.ratingOverall}>
                            <Text style={styles.bigRatingText}>{stats.averageRating}</Text>
                            {renderStars(Math.round(stats.averageRating), 20)}
                            <Text style={styles.ratingSubText}>จาก {reviews.length} รีวิว</Text>
                        </View>
                        <View style={styles.ratingDistribution}>
                            {stats.ratingDistribution.map((item) => (
                                <View key={item.stars} style={styles.distRow}>
                                    <Text style={styles.distLabel}>{item.stars}</Text>
                                    <View style={styles.progressBarBg}>
                                        <View style={[styles.progressBarFill, { width: `${item.percentage}%` }]} />
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.subRatingRow}>
                        <View style={styles.subRatingItem}>
                            <Text style={styles.subRatingLabel}>ความรวดเร็ว</Text>
                            <Text style={styles.subRatingValue}>{stats.speedScore} <Ionicons name="star" size={12} color="#F59E0B" /></Text>
                        </View>
                        <View style={styles.subRatingItem}>
                            <Text style={styles.subRatingLabel}>คุณภาพการซ่อม</Text>
                            <Text style={styles.subRatingValue}>{stats.qualityScore} <Ionicons name="star" size={12} color="#F59E0B" /></Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>รีวิวล่าสุด</Text>
                {reviews.length === 0 ? (
                    <Text style={styles.emptyReviewText}>ยังไม่มีข้อมูลการประเมินในเดือนนี้</Text>
                ) : (
                    reviews.map((review) => (
                        <View key={review.id} style={styles.reviewCard}>
                            <View style={styles.reviewHeader}>
                                <View style={styles.reviewAvatar}><Text style={styles.reviewAvatarText}>{review.name.charAt(0)}</Text></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.reviewName}>{review.name}</Text>
                                    <Text style={styles.reviewRoom}>{review.room}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    {renderStars(review.rating)}
                                    <Text style={styles.reviewDate}>{review.date}</Text>
                                </View>
                            </View>
                            <Text style={styles.reviewComment}>"{review.comment || 'ไม่มีความเห็นเพิ่มเติม'}"</Text>
                        </View>
                    ))
                )}
            </ScrollView>

            <Modal visible={modalVisible} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>เลือกช่วงเวลา</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#6B7280" /></TouchableOpacity>
                        </View>
                        <FlatList
                            data={MONTH_OPTIONS}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedMonth(item); setModalVisible(false); }}>
                                    <Text style={[styles.modalItemText, selectedMonth === item && { color: '#F28C28', fontWeight: '700' }]}>{item}</Text>
                                    {selectedMonth === item && <Ionicons name="checkmark-circle" size={20} color="#F28C28" />}
                                </TouchableOpacity>
                            )}
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
    appSubtitle: { fontSize: 11, fontWeight: '600', color: '#F28C28' },
    
    notificationBtn: { padding: 8, position: 'relative' },
    notificationBadge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, backgroundColor: '#EF4444', borderRadius: 9, borderWidth: 1.5, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },

    scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20 },
    pageHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    pageTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
    filterBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#FED7AA' },
    filterText: { fontSize: 13, fontWeight: '700', color: '#F28C28' },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 24 },
    kpiCard: { padding: 16, borderRadius: 16, borderWidth: 1, elevation: 1 },
    kpiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    kpiTitle: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
    kpiValue: { fontSize: 32, fontWeight: '800' },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },
    ratingCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#F3F4F6' },
    ratingTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ratingOverall: { alignItems: 'center', flex: 0.45 },
    bigRatingText: { fontSize: 48, fontWeight: '800', color: '#111827' },
    ratingSubText: { fontSize: 12, color: '#6B7280', marginTop: 4 },
    ratingDistribution: { flex: 0.55, gap: 5 },
    distRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    distLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', width: 10 },
    progressBarBg: { flex: 1, height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#F59E0B' },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 15 },
    subRatingRow: { flexDirection: 'row', justifyContent: 'space-around' },
    subRatingItem: { alignItems: 'center' },
    subRatingLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
    subRatingValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
    reviewCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF3E8', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    reviewAvatarText: { fontSize: 16, fontWeight: '700', color: '#F28C28' },
    reviewName: { fontSize: 14, fontWeight: '700', color: '#111827' },
    reviewRoom: { fontSize: 12, color: '#6B7280' },
    reviewDate: { fontSize: 10, color: '#9CA3AF' },
    reviewComment: { fontSize: 14, color: '#4B5563', lineHeight: 20, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, fontStyle: 'italic' },
    emptyReviewText: { textAlign: 'center', color: '#9CA3AF', marginTop: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 10 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalItemText: { fontSize: 16, color: '#4B5563' },
});