import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    Platform, SafeAreaView, StyleSheet, Text,
    TouchableOpacity, View, ActivityIndicator, FlatList, Image, Modal
} from 'react-native';

import { getAuth } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../constants/firebaseConfig';

const SORT_OPTIONS = ['ใหม่ล่าสุด', 'เก่าที่สุด'];

export default function NotificationScreen() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading]             = useState(true);
    const [sortOption, setSortOption]       = useState('ใหม่ล่าสุด');
    const [sortModalVisible, setSortModalVisible] = useState(false);

    useEffect(() => {
        const auth = getAuth();
        if (!auth.currentUser) return;

        const q = query(
            collection(db, "Notifications"),
            where("targetUid", "==", auth.currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(docSnap => {
                const notif = docSnap.data();
                let rawDate = new Date();
                if (notif.createdAt) {
                    rawDate = notif.createdAt.toDate ? notif.createdAt.toDate() : new Date(notif.createdAt);
                }
                const diffMs   = new Date().getTime() - rawDate.getTime();
                const diffMins = Math.round(diffMs / 60000);
                const diffHrs  = Math.round(diffMs / 3600000);
                const diffDays = Math.round(diffMs / 86400000);
                let timeStr = "เมื่อสักครู่";
                if (diffMins < 60)     timeStr = `${diffMins} นาทีที่แล้ว`;
                else if (diffHrs < 24) timeStr = `${diffHrs} ชม.ที่แล้ว`;
                else                   timeStr = `${diffDays} วันที่แล้ว`;

                return {
                    id: docSnap.id,
                    title:    notif.title    || "มีการแจ้งเตือนใหม่",
                    message:  notif.body     || "",
                    time:     timeStr,
                    category: notif.category,
                    type:     notif.type     || 'general',
                    jobId:    notif.jobId    || null,
                    isUnread: !notif.isRead,
                    rawDate,
                };
            });
            data.sort((a, b) => sortOption === 'ใหม่ล่าสุด'
                ? b.rawDate.getTime() - a.rawDate.getTime()
                : a.rawDate.getTime() - b.rawDate.getTime()
            );
            setNotifications(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [sortOption]);

    const getIconConfig = (type: string, category?: string) => {
        if (type === 'repair_completed' || type === 'status_update')
            return { icon: 'checkmark-circle',     color: '#10B981', bg: '#D1FAE5' };
        if (type === 'admin_approved' || type === 'job_completed')
            return { icon: 'checkmark-done-circle', color: '#059669', bg: '#D1FAE5' };
        if (type === 'user_reviewed')
            return { icon: 'star',                  color: '#F59E0B', bg: '#FEF3C7' };
        if (type === 'new_request')
            return { icon: 'warning',               color: '#EF4444', bg: '#FDE8E8' };
        switch (category) {
            case 'ประปา':         return { icon: 'water', color: '#3B82F6', bg: '#DBEAFE' };
            case 'ไฟฟ้า':         return { icon: 'flash', color: '#EAB308', bg: '#FEF9C3' };
            case 'แอร์':          return { icon: 'snow',  color: '#06B6D4', bg: '#CFFAFE' };
            case 'เฟอร์นิเจอร์':  return { icon: 'bed',   color: '#8B5CF6', bg: '#EDE9FE' };
            case 'เครื่องใช้ไฟฟ้า': return { icon: 'tv', color: '#EC4899', bg: '#FCE7F3' };
            default:              return { icon: 'build',  color: '#F28C28', bg: '#FFF3E8' };
        }
    };

    // ✅ Technician: navigate ตาม type (logic จาก doc index 10)
    const handlePressNotification = async (item: any) => {
        try {
            if (item.isUnread) {
                await updateDoc(doc(db, "Notifications", item.id), { isRead: true });
            }
            if (!item.jobId) return;

            if (item.type === "new_request") {
                // งานใหม่ → หน้ารับงาน
                router.push({ pathname: '/(technician)/job-request-detail', params: { id: item.jobId } } as any);
            } else if (item.type === "admin_approved" || item.type === "job_completed" || item.type === "user_reviewed") {
                // งานอนุมัติ/เสร็จ/รีวิว → หน้าประวัติรายละเอียด
                router.push({ pathname: '/(technician)/history-detail', params: { id: item.jobId } } as any);
            } else {
                // กำลังซ่อม/อัปเดตสถานะ → หน้างานปัจจุบัน
                router.push({ pathname: '/(technician)/task-detail', params: { id: item.jobId } } as any);
            }
        } catch (error) {
            console.error("Error opening notification:", error);
        }
    };

    const handleReadAll = async () => {
        try {
            const batch = writeBatch(db);
            let hasUnread = false;
            notifications.forEach(n => {
                if (n.isUnread) { batch.update(doc(db, "Notifications", n.id), { isRead: true }); hasUnread = true; }
            });
            if (hasUnread) await batch.commit();
        } catch (error) { console.error(error); }
    };

    const renderItem = ({ item }: { item: any }) => {
        const config = getIconConfig(item.type, item.category);
        return (
            <TouchableOpacity
                style={[styles.notificationItem, item.isUnread && styles.unreadItem]}
                onPress={() => handlePressNotification(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
                    <Ionicons name={config.icon as any} size={24} color={config.color} />
                </View>
                <View style={styles.textContainer}>
                    <View style={styles.itemHeader}>
                        <Text style={[styles.title, item.isUnread && styles.unreadText]} numberOfLines={1}>{item.title}</Text>
                        <View style={styles.timeBadgeRow}>
                            <Text style={styles.itemTime}>{item.time}</Text>
                            {item.isUnread && <View style={styles.unreadDot} />}
                        </View>
                    </View>
                    <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <Image source={require('../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
                    <View>
                        <Text style={styles.appName}>SUT FixIt</Text>
                        <Text style={styles.appSubtitle}>ช่างเทคนิค (Technician)</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.readAllBtn} onPress={handleReadAll} activeOpacity={0.7}>
                    <Ionicons name="checkmark-done-outline" size={18} color="#F28C28" />
                    <Text style={styles.readAllText}>อ่านทั้งหมด</Text>
                </TouchableOpacity>
            </View>

            {/* Page header + sort */}
            <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>การแจ้งเตือน</Text>
                <TouchableOpacity style={styles.sortButton} onPress={() => setSortModalVisible(true)} activeOpacity={0.7}>
                    <Ionicons name="swap-vertical-outline" size={14} color="#6B7280" />
                    <Text style={styles.sortButtonText}>{sortOption}</Text>
                    <Ionicons name="chevron-down" size={13} color="#6B7280" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#F28C28" style={{ marginTop: 20 }} />
            ) : notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="notifications-off-outline" size={40} color="#9CA3AF" />
                    </View>
                    <Text style={styles.emptyTitle}>ไม่มีการแจ้งเตือนใหม่</Text>
                    <Text style={styles.emptySub}>คุณจะได้รับการแจ้งเตือนเมื่อมีงานใหม่เข้าสู่ระบบ</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}

            {/* Sort Modal */}
            <Modal visible={sortModalVisible} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>เรียงลำดับ</Text>
                            <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
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
    logoImage: { width: 44, height: 44, borderRadius: 10, marginRight: 12 },
    appName: { fontSize: 18, fontWeight: '800', color: '#111827' },
    appSubtitle: { fontSize: 11, fontWeight: '600', color: '#F28C28', marginTop: 2 },
    readAllBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E8', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, gap: 5 },
    readAllText: { fontSize: 12, fontWeight: '700', color: '#F28C28' },
    pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
    pageTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
    sortButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 5 },
    sortButtonText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
    listContent: { paddingBottom: 20 },
    notificationItem: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
    unreadItem: { backgroundColor: '#FFF8F1' },
    iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    textContainer: { flex: 1, justifyContent: 'center' },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    title: { fontSize: 15, fontWeight: '600', color: '#374151', flex: 1 },
    unreadText: { fontWeight: '800', color: '#111827' },
    timeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    itemTime: { fontSize: 11, color: '#9CA3AF' },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },
    message: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
    separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 84 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
    emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 10 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalItemText: { fontSize: 16, color: '#4B5563' },
});
