import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    Image,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from 'react-native';

import { getAuth, signOut } from "firebase/auth";
import { doc, onSnapshot, updateDoc, collection, query, where } from "firebase/firestore"; // ✅ นำเข้า collection, query, where เพิ่มเติม
import { db } from '../../../constants/firebaseConfig'; 

// ==========================================
// Component: MenuItem
// ==========================================
type MenuItemProps = {
    iconName: string; iconColor: string; iconBg: string; title: string;
    rightComponent?: React.ReactNode; onPress?: () => void; hideDivider?: boolean;
};

function MenuItem({ iconName, iconColor, iconBg, title, rightComponent, onPress, hideDivider }: MenuItemProps) {
    return (
        <TouchableOpacity style={styles.menuItem} activeOpacity={onPress ? 0.7 : 1} onPress={onPress} disabled={!onPress}>
            <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconBox, { backgroundColor: iconBg }]}>
                    <Ionicons name={iconName as any} size={20} color={iconColor} />
                </View>
                <Text style={styles.menuItemTitle}>{title}</Text>
            </View>
            <View style={styles.menuItemRight}>
                {rightComponent || <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />}
            </View>
            {!hideDivider && <View style={styles.divider} />}
        </TouchableOpacity>
    );
}

// ==========================================
// Main Screen
// ==========================================
export default function ProfileScreen() {
    const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);
    
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // ✅ เพิ่ม State สำหรับตัวเลขกระดิ่ง
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        let unsubUser = () => {}; 
        let unsubNotif = () => {};

        if (currentUser) {
            // 1. ดึงข้อมูล User
            const docRef = doc(db, "Users", currentUser.uid);
            unsubUser = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserData(data);
                    setIsNotificationEnabled(data.pushEnabled ?? true); 
                }
                setLoading(false);
            }, (error) => {
                console.error("เกิดข้อผิดพลาดในการดึงข้อมูล Real-time:", error);
                setLoading(false);
            });

            // 2. ✅ ดึงจำนวนแจ้งเตือนที่ยังไม่ได้อ่าน
            const qNotif = query(
                collection(db, "Notifications"),
                where("targetUid", "==", currentUser.uid),
                where("isRead", "==", false)
            );
            unsubNotif = onSnapshot(qNotif, (snapshot) => {
                setUnreadCount(snapshot.size);
            });
        } else {
            setLoading(false);
        }

        return () => {
            unsubUser();
            unsubNotif();
        };
    }, []);

    const handleConfirmLogout = async () => {
        try {
            const auth = getAuth();
            await signOut(auth); 
            setLogoutModalVisible(false);
            router.replace('/login');
        } catch (error) {
            console.error("เกิดข้อผิดพลาดในการออกจากระบบ:", error);
        }
    };

    const toggleNotification = async (value: boolean) => {
        try {
            const auth = getAuth();
            const currentUser = auth.currentUser;
            if (currentUser) {
                setIsNotificationEnabled(value);
                await updateDoc(doc(db, "Users", currentUser.uid), {
                    pushEnabled: value
                });
            }
        } catch (error) {
            console.error("Error toggling notification:", error);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            
            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <Image 
                        source={require('../../../assets/images/logo.png')} 
                        style={styles.logoImage} 
                        resizeMode="contain"
                    />
                    <View>
                        <Text style={styles.appName}>SUT FixIt</Text>
                        <Text style={styles.appSubtitle}>ระบบซ่อมบำรุงหอพัก</Text>
                    </View>
                </View>
                {/* ✅ อัปเดตกระดิ่งให้เช็คสถานะและโชว์ตัวเลข */}
                <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7} onPress={() => router.push('/notification' as any)}>
                    <Ionicons name="notifications-outline" size={26} color="#111" />
                    {userData?.pushEnabled !== false && unreadCount > 0 && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                       {/* เปลี่ยนจากของเดิมที่เป็นแค่ <Ionicons name="person" ... /> ให้เป็นแบบนี้ */}
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
                    </View>
                    <View style={styles.profileInfo}>
                        {loading ? (
                            <ActivityIndicator size="small" color="#F28C28" style={{ alignSelf: 'flex-start' }} />
                        ) : (
                            <>
                                <Text style={styles.studentId}>
                                    {userData?.fullName || userData?.studentId || userData?.email || 'ไม่มีข้อมูล'}
                                </Text>
                                <Text style={styles.studentRole}>
                                    {userData?.role === 'student' ? 'นักศึกษา' : 
                                     userData?.role === 'admin' ? 'ผู้ดูแลระบบ' : 
                                     userData?.role === 'technician' ? 'ช่างซ่อมบำรุง' : 'ผู้ใช้งาน'}
                                </Text>
                            </>
                        )}
                    </View>
                    <TouchableOpacity style={styles.editButton} activeOpacity={0.7} onPress={() => router.push('/personal-info')}>
                        <Feather name="edit-2" size={18} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>บัญชีผู้ใช้</Text>
                <View style={styles.menuGroup}>
                    <MenuItem iconName="person" iconColor="#3B82F6" iconBg="#DBEAFE" title="ข้อมูลส่วนตัว" onPress={() => router.push('/personal-info')} />
                    <MenuItem iconName="key" iconColor="#8B5CF6" iconBg="#EDE9FE" title="เปลี่ยนรหัสผ่าน" onPress={() => router.push('/reset-password')} hideDivider />
                </View>

                <Text style={styles.sectionTitle}>การแจ้งเตือน</Text>
                <View style={styles.menuGroup}>
                    <MenuItem 
                        iconName="notifications" iconColor="#10B981" iconBg="#D1FAE5" title="แจ้งเตือน" hideDivider
                        rightComponent={
                            <Switch 
                                trackColor={{ false: '#D1D5DB', true: '#F28C28' }} 
                                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : isNotificationEnabled ? '#FFFFFF' : '#F4F3F4'}
                                onValueChange={toggleNotification}
                                value={isNotificationEnabled}
                            />
                        }
                    />
                </View>

                <Text style={styles.sectionTitle}>เกี่ยวกับระบบ</Text>
                <View style={styles.menuGroup}>
                    <MenuItem iconName="information-circle" iconColor="#6B7280" iconBg="#F3F4F6" title="เวอร์ชันแอปพลิเคชัน" hideDivider rightComponent={<Text style={styles.versionText}>v1.0.2 (Beta)</Text>} />
                </View>

                <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={() => setLogoutModalVisible(true)}>
                    <Text style={styles.logoutButtonText}>ออกจากระบบ</Text>
                </TouchableOpacity>

            </ScrollView>

            <Modal visible={logoutModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.logoutModalBox}>
                        <View style={styles.logoutIconCircle}><Ionicons name="log-out-outline" size={36} color="#EF4444" /></View>
                        <Text style={styles.logoutTitle}>ออกจากระบบ</Text>
                        <Text style={styles.logoutDesc}>คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบบัญชี?</Text>
                        <View style={styles.logoutBtnRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setLogoutModalVisible(false)} activeOpacity={0.7}><Text style={styles.cancelBtnText}>ยกเลิก</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.confirmLogoutBtn} onPress={handleConfirmLogout} activeOpacity={0.7}><Text style={styles.confirmLogoutText}>ออกจากระบบ</Text></TouchableOpacity>
                        </View>
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
    logoImage: { width: 54, height: 54, borderRadius: 12, marginRight: 14 },
    appName: { fontSize: 18, fontWeight: '800', color: '#111827' },
    appSubtitle: { fontSize: 12, fontWeight: '500', color: '#F28C28', marginTop: 2 },
    
    // ✅ อัปเดต Style ของ Badge 
    notificationBtn: { padding: 8, position: 'relative' },
    notificationBadge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, backgroundColor: '#EF4444', borderRadius: 9, borderWidth: 1.5, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },

    scrollContent: { paddingBottom: 40, paddingTop: 20, paddingHorizontal: 20 },
    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#F3F4F6' },
    avatarContainer: { marginRight: 16 },
    avatarCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFF3E8', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F28C28' },
    profileInfo: { flex: 1 },
    studentId: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
    studentRole: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
    editButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#9CA3AF', marginBottom: 8, marginLeft: 4 },
    menuGroup: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F3F4F6', overflow: 'hidden' },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, position: 'relative' },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
    menuIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    menuItemTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
    menuItemRight: { flexDirection: 'row', alignItems: 'center' },
    versionText: { fontSize: 14, fontWeight: '500', color: '#9CA3AF' },
    divider: { position: 'absolute', bottom: 0, left: 66, right: 0, height: 1, backgroundColor: '#F3F4F6' },
    logoutButton: { marginTop: 10, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    logoutButtonText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    logoutModalBox: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    logoutIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    logoutTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
    logoutDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
    logoutBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
    cancelBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#4B5563' },
    confirmLogoutBtn: { flex: 1, backgroundColor: '#EF4444', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    confirmLogoutText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});