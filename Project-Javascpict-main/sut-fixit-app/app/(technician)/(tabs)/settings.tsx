import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    Image, Modal, Platform, SafeAreaView, ScrollView,
    StyleSheet, Switch, Text, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';

import { getAuth, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, collection, query, where } from 'firebase/firestore'; // ✅ เพิ่ม collection, query, where
import { db } from '../../../constants/firebaseConfig'; 

export default function TechnicianSettingsScreen() {
    const [userData, setUserData] = useState<any>(null);
    const [isAvailable, setIsAvailable] = useState(true);
    const [isNotificationEnabled, setIsNotificationEnabled] = useState(true); 
    const [loading, setLoading] = useState(true);
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);

    // ✅ เพิ่ม State แจ้งเตือน
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
            let unsubUser = () => {};
            let unsubNotif = () => {};

            // 1. ดึงโปรไฟล์
            const userRef = doc(db, "Users", user.uid);
            unsubUser = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserData(data);
                    setIsAvailable(data.isAvailable ?? true);
                    setIsNotificationEnabled(data.pushEnabled ?? true); 
                }
                setLoading(false);
            });

            // 2. ✅ นับแจ้งเตือน
            const qNotif = query(collection(db, "Notifications"), where("targetUid", "==", user.uid), where("isRead", "==", false));
            unsubNotif = onSnapshot(qNotif, (snapshot) => {
                setUnreadCount(snapshot.size);
            });

            return () => { unsubUser(); unsubNotif(); };
        } else {
            setLoading(false);
        }
    }, []);

    const toggleAvailability = async (value: boolean) => {
        setIsAvailable(value);
        try {
            const auth = getAuth();
            if (auth.currentUser) {
                const userRef = doc(db, "Users", auth.currentUser.uid);
                await updateDoc(userRef, { isAvailable: value });
            }
        } catch (error) {
            console.error("Update Status Error:", error);
        }
    };

    const toggleNotification = async (value: boolean) => {
        setIsNotificationEnabled(value);
        try {
            const auth = getAuth();
            if (auth.currentUser) {
                const userRef = doc(db, "Users", auth.currentUser.uid);
                await updateDoc(userRef, { pushEnabled: value });
            }
        } catch (error) {
            console.error("Update Notification Error:", error);
        }
    };

    const handleConfirmLogout = async () => {
        try {
            const auth = getAuth();
            await signOut(auth);
            setLogoutModalVisible(false);
            router.replace('/login');
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

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
                {/* ✅ กระดิ่งหน้าตั้งค่า */}
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
                
                <View style={styles.profileContainer}>
                    <View style={styles.profileCard}>
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={30} color="#F28C28" />
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{userData?.fullName || 'ช่างซ่อมบำรุง'}</Text>
                            <Text style={styles.profileRole}>{userData?.techType || 'ฝ่ายปฏิบัติการ'}</Text>
                            <Text style={styles.profileId}>ID: {getAuth().currentUser?.uid.substring(0, 8).toUpperCase()}</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>การทำงาน</Text>
                <View style={styles.card}>
                    <View style={styles.cardRow}>
                        <View style={[styles.iconWrapper, { backgroundColor: isAvailable ? '#D1FAE5' : '#FEE2E2' }]}>
                            <Ionicons name={isAvailable ? 'checkmark-circle' : 'close-circle'} size={18} color={isAvailable ? '#10B981' : '#EF4444'} />
                        </View>
                        <Text style={styles.cardText}>สถานะพร้อมรับงาน</Text>
                        <Switch trackColor={{ false: '#E5E7EB', true: '#34C759' }} thumbColor={'#FFFFFF'} onValueChange={toggleAvailability} value={isAvailable} />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>การแจ้งเตือน</Text>
                <View style={styles.card}>
                    <View style={styles.cardRow}>
                        <View style={[styles.iconWrapper, { backgroundColor: '#D1FAE5' }]}>
                            <Ionicons name="notifications" size={18} color="#10B981" />
                        </View>
                        <Text style={styles.cardText}>เปิดรับการแจ้งเตือน</Text>
                        <Switch trackColor={{ false: '#D1D5DB', true: '#F28C28' }} thumbColor={'#FFFFFF'} onValueChange={toggleNotification} value={isNotificationEnabled} />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>ทั่วไป</Text>
                <View style={styles.card}>
                    <View style={styles.cardRow}><Text style={styles.cardTextBold}>อีเมลระบบ</Text><Text style={styles.versionText}>{userData?.email || '-'}</Text></View>
                    <View style={styles.divider} />
                    <View style={styles.cardRow}><Text style={styles.cardTextBold}>เวอร์ชันแอปพลิเคชัน</Text><Text style={styles.versionText}>v1.0.5 (Build 2026)</Text></View>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={() => setLogoutModalVisible(true)} activeOpacity={0.8}><Text style={styles.logoutText}>ออกจากระบบ</Text></TouchableOpacity>

            </ScrollView>

            {/* Logout Modal คงเดิม */}
            <Modal visible={logoutModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.logoutModalBox}>
                        <View style={styles.logoutIconCircle}><Ionicons name="log-out-outline" size={36} color="#EF4444" /></View>
                        <Text style={styles.logoutTitle}>ยืนยันออกจากระบบ</Text>
                        <Text style={styles.logoutDesc}>คุณต้องการออกจากระบบช่างซ่อมบำรุงใช่หรือไม่?</Text>
                        <View style={styles.logoutBtnRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setLogoutModalVisible(false)}><Text style={styles.cancelBtnText}>ยกเลิก</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.confirmLogoutBtn} onPress={handleConfirmLogout}><Text style={styles.confirmLogoutText}>ออกจากระบบ</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 15, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    logoRow: { flexDirection: 'row', alignItems: 'center' },
    logoImage: { width: 44, height: 44, borderRadius: 10, marginRight: 12 },
    appName: { fontSize: 18, fontWeight: '800', color: '#111827' },
    appSubtitle: { fontSize: 12, fontWeight: '700', color: '#F28C28', marginTop: 2 },
    
    // ✅ อัปเดตสไตล์กระดิ่งช่าง
    notificationBtn: { padding: 8, position: 'relative' },
    notificationBadge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, backgroundColor: '#EF4444', borderRadius: 9, borderWidth: 1.5, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },

    scrollContent: { paddingBottom: 40 },
    profileContainer: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 10 },
    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6' },
    avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF3E8', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: '800', color: '#111827' },
    profileRole: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginTop: 2 },
    profileId: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: '#9CA3AF', marginLeft: 24, marginTop: 24, marginBottom: 10 },
    card: { backgroundColor: '#FFFFFF', marginHorizontal: 20, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#F3F4F6' },
    cardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
    iconWrapper: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#374151' },
    cardTextBold: { flex: 1, fontSize: 15, fontWeight: '800', color: '#374151' },
    versionText: { fontSize: 14, color: '#9CA3AF' },
    divider: { height: 1, backgroundColor: '#F3F4F6' },
    logoutBtn: { backgroundColor: '#FFF1F2', marginHorizontal: 20, marginTop: 40, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    logoutText: { fontSize: 16, fontWeight: '800', color: '#EF4444' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    logoutModalBox: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center' },
    logoutIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    logoutTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
    logoutDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
    logoutBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
    cancelBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#4B5563' },
    confirmLogoutBtn: { flex: 1, backgroundColor: '#EF4444', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    confirmLogoutText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});