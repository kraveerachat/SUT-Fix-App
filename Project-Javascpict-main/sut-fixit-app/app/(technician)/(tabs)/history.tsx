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
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator
} from 'react-native';

import { getAuth } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../../constants/firebaseConfig';

// ฟังก์ชันสำหรับสร้างรายชื่อเดือนแบบอัตโนมัติ (ม.ค. 68 - ธ.ค. 69)
const generateMonthOptions = () => {
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const options = [];

    // วนลูปปี 2569 และ 2568 (เอาปีใหม่ไว้บน)
    for (let year = 2569; year >= 2568; year--) {
        for (let m = 11; m >= 0; m--) {
            options.push(`${months[m]} ${year}`);
        }
    }
    return options;
};

const MONTH_OPTIONS = generateMonthOptions();

// ✅ ฟังก์ชันแปลงวันที่ + เวลา (เช่น 2 เม.ย. 2569 เวลา 14:30 น.)
const formatThaiDateTime = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const d = date.getDate();
    const m = months[date.getMonth()];
    const y = date.getFullYear() + 543;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${d} ${m} ${y} เวลา ${hours}:${minutes} น.`;
};

export default function TechHistoryScreen() {
    // ฟังก์ชันหาเดือนปัจจุบันเพื่อตั้งเป็นค่าเริ่มต้น
    const getCurrentThaiMonthYear = () => {
        const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        const now = new Date();
        return `${months[now.getMonth()]} ${now.getFullYear() + 543}`;
    };

    // State จัดการ UI
    const [selectedMonth, setSelectedMonth] = useState(getCurrentThaiMonthYear());
    const [modalVisible, setModalVisible] = useState(false);
    
    // State จัดการข้อมูล
    const [historyTasks, setHistoryTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        let unsubTasks = () => { };
        let unsubUser = () => { };
        let unsubNotif = () => { };

        // ดึงงานที่ซ่อมเสร็จแล้วของช่างคนนี้
        const qTasks = query(collection(db, "Reports"), where("techId", "==", user.uid));
        unsubTasks = onSnapshot(qTasks, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
           const completedData = data.filter((d: any) => d.status === "เสร็จสมบูรณ์" || d.status === "เสร็จสิ้น" || d.status === "Approved");
            
            completedData.sort((a: any, b: any) => 
                new Date(b.closedAt || b.createdAt).getTime() - new Date(a.closedAt || a.createdAt).getTime()
            );
            
            setHistoryTasks(completedData);
            setLoading(false);
        });

        // ดึงข้อมูล User (เพื่อดูว่าเปิดแจ้งเตือนไหม)
        unsubUser = onSnapshot(doc(db, "Users", user.uid), (docSnap) => {
            if (docSnap.exists()) setUserData(docSnap.data());
        });

        // นับแจ้งเตือน
        const qNotif = query(collection(db, "Notifications"), where("targetUid", "==", user.uid), where("isRead", "==", false));
        unsubNotif = onSnapshot(qNotif, (snapshot) => {
            setUnreadCount(snapshot.size);
        });

        return () => { 
            unsubTasks(); 
            unsubUser(); 
            unsubNotif(); 
        };
    }, []);

    // Filter งานตามเดือนที่เลือก
    const filteredTasks = historyTasks.filter((task) => {
        const date = new Date(task.closedAt || task.createdAt);
        const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        const taskMonthYear = `${monthNames[date.getMonth()]} ${date.getFullYear() + 543}`;
        return taskMonthYear === selectedMonth;
    });

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

                {/* แจ้งเตือน */}
                <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push('/(technician)/notification' as any)}>
                    <Ionicons name="notifications-outline" size={26} color="#111" />
                    {userData?.pushEnabled !== false && unreadCount > 0 && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>ประวัติการทำงาน</Text>
            </View>

            {/* ปุ่มเลือกเดือน */}
            <TouchableOpacity style={styles.monthFilter} activeOpacity={0.7} onPress={() => setModalVisible(true)}>
                <Text style={styles.monthFilterText}>เดือน {selectedMonth}</Text>
                <Ionicons name="calendar" size={18} color="#6B7280" />
            </TouchableOpacity>

            {/* รายการประวัติ */}
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator size="large" color="#F28C28" style={{ marginTop: 20 }} />
                ) : filteredTasks.length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                        <Ionicons name="archive-outline" size={64} color="#D1D5DB" />
                        <Text style={{ color: '#9CA3AF', marginTop: 10 }}>ไม่มีประวัติการซ่อมในเดือนที่เลือก</Text>
                    </View>
                ) : (
                    filteredTasks.map((task) => (
                        <TouchableOpacity
                            key={task.id}
                            style={styles.historyCard}
                            activeOpacity={0.7}
                            onPress={() => router.push({ pathname: '/(technician)/history-detail', params: { id: task.id } })}
                        >
                            <View style={styles.cardLeft}>
                                <View style={styles.successIconBox}>
                                    <Ionicons name="checkmark-done" size={20} color="#10B981" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.historyTitle} numberOfLines={1}>{task.title}</Text>
                                    <Text style={styles.historySubtitle}>{task.dorm} ・ ห้อง {task.room}</Text>
                                    
                                    {/* ✅ โชว์วันที่และเวลา */}
                                    <Text style={styles.historyDate}>ซ่อมเสร็จเมื่อ: {formatThaiDateTime(task.closedAt || task.createdAt)}</Text>

                                    {/* กล่องรีวิว */}
                                    {(task.rating || task.isReviewed) && (
                                        <View style={styles.reviewBox}>
                                            <View style={styles.reviewScoreRow}>
                                                <Ionicons name="star" size={14} color="#F59E0B" />
                                                <Text style={styles.reviewScoreText}>
                                                    {task.rating?.quality || task.qualityRating || 5}.0 คะแนน
                                                </Text>
                                            </View>
                                            <Text style={styles.reviewCommentText} numberOfLines={2}>
                                                "{task.rating?.comment || task.reviewComment || 'ไม่มีความคิดเห็นเพิ่มเติม'}"
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            <View style={styles.cardRight}>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>เสร็จสิ้น</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" style={{ marginLeft: 8 }} />
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* Modal เลือกเดือน */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>เลือกเดือน</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={MONTH_OPTIONS}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.modalItem} 
                                    onPress={() => { 
                                        setSelectedMonth(item); 
                                        setModalVisible(false); 
                                    }}
                                >
                                    <Text style={[styles.modalItemText, selectedMonth === item && { color: '#F28C28', fontWeight: '700' }]}>
                                        {item}
                                    </Text>
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
    safeArea: { 
        flex: 1, 
        backgroundColor: '#F9FAFB' 
    },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingTop: Platform.OS === 'android' ? 40 : 10, 
        paddingBottom: 15, 
        backgroundColor: '#FFFFFF', 
        borderBottomWidth: 1, 
        borderBottomColor: '#F3F4F6' 
    },
    logoRow: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    logoImage: { 
        width: 44, 
        height: 44, 
        borderRadius: 10, 
        marginRight: 12 
    },
    appName: { 
        fontSize: 18, 
        fontWeight: '800', 
        color: '#111827' 
    },
    appSubtitle: { 
        fontSize: 11, 
        fontWeight: '600', 
        color: '#F28C28' 
    },
    notificationBtn: { 
        padding: 8, 
        position: 'relative' 
    },
    notificationBadge: { 
        position: 'absolute', 
        top: 2, 
        right: 2, 
        minWidth: 18, 
        height: 18, 
        backgroundColor: '#EF4444', 
        borderRadius: 9, 
        borderWidth: 1.5, 
        borderColor: '#FFF', 
        justifyContent: 'center', 
        alignItems: 'center', 
        paddingHorizontal: 4 
    },
    badgeText: { 
        color: '#FFF', 
        fontSize: 9, 
        fontWeight: 'bold' 
    },
    pageHeader: { 
        paddingHorizontal: 20, 
        paddingTop: 24, 
        paddingBottom: 10 
    },
    pageTitle: { 
        fontSize: 22, 
        fontWeight: '800', 
        color: '#111827' 
    },
    monthFilter: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: '#FFF', 
        marginHorizontal: 20, 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        borderRadius: 12, 
        marginBottom: 20, 
        borderWidth: 1, 
        borderColor: '#E5E7EB' 
    },
    monthFilterText: { 
        fontSize: 14, 
        fontWeight: '700', 
        color: '#4B5563' 
    },
    scrollContent: { 
        paddingBottom: 30 
    },
    historyCard: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        backgroundColor: '#FFFFFF', 
        marginHorizontal: 20, 
        marginBottom: 12, 
        borderRadius: 16, 
        padding: 16, 
        borderWidth: 1, 
        borderColor: '#F3F4F6', 
        elevation: 1 
    },
    cardLeft: { 
        flexDirection: 'row', 
        alignItems: 'flex-start', 
        flex: 1, 
        marginRight: 10 
    },
    cardRight: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        alignSelf: 'center' 
    },
    successIconBox: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: '#D1FAE5', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginRight: 14 
    },
    historyTitle: { 
        fontSize: 15, 
        fontWeight: '700', 
        color: '#111827', 
        marginBottom: 2 
    },
    historySubtitle: { 
        fontSize: 13, 
        color: '#6B7280', 
        marginBottom: 4 
    },
    historyDate: { 
        fontSize: 12, 
        color: '#9CA3AF' 
    },
    statusBadge: { 
        backgroundColor: '#F0FDF4', 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 8 
    },
    statusText: { 
        color: '#10B981', 
        fontSize: 12, 
        fontWeight: '700' 
    },
    reviewBox: { 
        marginTop: 10, 
        backgroundColor: '#FFFBEB', 
        padding: 10, 
        borderRadius: 8, 
        borderWidth: 1, 
        borderColor: '#FEF3C7' 
    },
    reviewScoreRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 4 
    },
    reviewScoreText: { 
        fontSize: 12, 
        fontWeight: '700', 
        color: '#D97706', 
        marginLeft: 4 
    },
    reviewCommentText: { 
        fontSize: 12, 
        color: '#D97706', 
        fontStyle: 'italic' 
    },
    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.4)', 
        justifyContent: 'flex-end' 
    },
    modalContent: { 
        backgroundColor: '#FFFFFF', 
        borderTopLeftRadius: 24, 
        borderTopRightRadius: 24, 
        paddingHorizontal: 20, 
        paddingBottom: 40, 
        paddingTop: 10, 
        maxHeight: '70%' 
    },
    modalHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingVertical: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: '#E5E7EB', 
        marginBottom: 10 
    },
    modalTitle: { 
        fontSize: 18, 
        fontWeight: '700', 
        color: '#111827' 
    },
    modalItem: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingVertical: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: '#F3F4F6' 
    },
    modalItemText: { 
        fontSize: 16, 
        color: '#4B5563' 
    },
});