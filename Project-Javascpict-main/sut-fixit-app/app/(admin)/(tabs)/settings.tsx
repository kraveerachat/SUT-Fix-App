import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Image, Modal, Platform, SafeAreaView, ScrollView, StyleSheet,
  Switch, Text, TouchableOpacity, View, ActivityIndicator, Alert,
} from 'react-native';

import { getAuth, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../../constants/firebaseConfig';

export default function AdminSettingsScreen() {
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [adminData, setAdminData]   = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);   // ✅ เพิ่ม

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    // Real-time profile
    const unsubProfile = onSnapshot(doc(db, "Users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAdminData(data);
        setIsNotificationEnabled(data.pushEnabled ?? true); // ✅ sync toggle กับ DB
      }
      setLoading(false);
    }, () => setLoading(false));

    // ✅ นับแจ้งเตือนที่ยังไม่อ่าน (เพื่อแสดง Badge บน Bell)
    const qNotif = query(
      collection(db, "Notifications"),
      where("targetUid", "==", user.uid),
      where("isRead",    "==", false)
    );
    const unsubNotif = onSnapshot(qNotif, (snap) => setUnreadCount(snap.size));

    return () => { unsubProfile(); unsubNotif(); };
  }, []);

  // ✅ Toggle → อัปเดต Firebase ทันที
  const toggleSwitch = async (value: boolean) => {
    setIsNotificationEnabled(value);
    try {
      const user = getAuth().currentUser;
      if (user) await updateDoc(doc(db, "Users", user.uid), { pushEnabled: value });
    } catch {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถอัปเดตการตั้งค่าได้");
    }
  };

  const handleConfirmLogout = async () => {
    try {
      await signOut(getAuth());
      setLogoutModalVisible(false);
      router.replace('/login');
    } catch {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถออกจากระบบได้ในขณะนี้");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── Header (เหมือนทุกหน้า) ── */}
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
          {/* ✅ Badge แสดงเฉพาะเมื่อ pushEnabled=true และมีแจ้งเตือนค้างอยู่ */}
          {isNotificationEnabled && unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <View style={styles.profileContainer}>
          <View style={styles.profileCard}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatarInner}>
                <Ionicons name="person" size={40} color="#7C3AED" />
              </View>
            </View>
            <View style={styles.profileInfo}>
              {loading ? (
                <ActivityIndicator size="small" color="#7C3AED" style={{ alignSelf: 'flex-start' }} />
              ) : (
                <>
                  <Text style={styles.profileName}>{adminData?.fullName || adminData?.name || 'ผู้ดูแลระบบ'}</Text>
                  <Text style={styles.profileRole}>ผู้ดูแลระบบ (Admin)</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* การแจ้งเตือน */}
        <Text style={styles.sectionTitle}>การแจ้งเตือน</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconWrapperGreen}>
              <Ionicons name="notifications" size={18} color="#10B981" />
            </View>
            <Text style={styles.cardText}>แจ้งเตือน</Text>
            <Switch
              trackColor={{ false: '#E5E7EB', true: '#34C759' }}
              thumbColor="#FFFFFF"
              onValueChange={toggleSwitch}
              value={isNotificationEnabled}
              style={Platform.OS === 'ios' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : {}}
            />
          </View>
        </View>

        {/* เกี่ยวกับระบบ */}
        <Text style={styles.sectionTitle}>เกี่ยวกับระบบ</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardTextBold}>เวอร์ชันแอปพลิเคชัน</Text>
            <Text style={styles.versionText}>v1.0.2 (Beta)</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={() => setLogoutModalVisible(true)} activeOpacity={0.8}>
          <Text style={styles.logoutText}>ออกจากระบบ</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Logout Modal */}
      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.logoutModalBox}>
            <View style={styles.logoutIconCircle}>
              <Ionicons name="log-out-outline" size={36} color="#EF4444" />
            </View>
            <Text style={styles.logoutTitle}>ออกจากระบบ</Text>
            <Text style={styles.logoutDesc}>คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบบัญชีผู้ดูแลนี้?</Text>
            <View style={styles.logoutBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setLogoutModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmLogoutBtn} onPress={handleConfirmLogout} activeOpacity={0.7}>
                <Text style={styles.confirmLogoutText}>ออกจากระบบ</Text>
              </TouchableOpacity>
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
  logoImage: { width: 44, height: 44, borderRadius: 10, marginRight: 12 },
  appName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  appSubtitle: { fontSize: 11, fontWeight: '600', color: '#EF4444', marginTop: 2 },
  notificationBtn: { padding: 8, position: 'relative' },
  notificationBadge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, backgroundColor: '#EF4444', borderRadius: 9, borderWidth: 1.5, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 40 },
  profileContainer: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 10 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6' },
  avatarOuter: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: '#FDBA74', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  profileInfo: { flex: 1, justifyContent: 'center' },
  profileName: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 },
  profileRole: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#9CA3AF', marginLeft: 24, marginTop: 24, marginBottom: 10 },
  card: { backgroundColor: '#FFFFFF', marginHorizontal: 20, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  iconWrapperGreen: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#374151' },
  cardTextBold: { flex: 1, fontSize: 15, fontWeight: '800', color: '#374151' },
  versionText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  logoutBtn: { backgroundColor: '#FFF1F2', marginHorizontal: 20, marginTop: 40, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  logoutText: { fontSize: 16, fontWeight: '800', color: '#EF4444' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  logoutModalBox: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10 },
  logoutIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoutTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  logoutDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  logoutBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#4B5563' },
  confirmLogoutBtn: { flex: 1, backgroundColor: '#EF4444', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  confirmLogoutText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
