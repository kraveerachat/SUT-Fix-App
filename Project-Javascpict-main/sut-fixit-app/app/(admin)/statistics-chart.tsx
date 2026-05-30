import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    Dimensions,
    FlatList,
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

// ✅ เชื่อมต่อ Firebase
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../constants/firebaseConfig'; 

const { width } = Dimensions.get('window');
const DATE_OPTIONS = ['ทั้งหมด', 'วันนี้', 'เมื่อวาน', '7 วันที่ผ่านมา', 'เดือนนี้'];

export default function StatisticsChartScreen() {
    // State สำหรับ UI
    const [activeTab, setActiveTab] = useState<'category' | 'dorm'>('category');
    const [selectedDate, setSelectedDate] = useState('เดือนนี้');
    const [filterModalVisible, setFilterModalVisible] = useState(false);

    // State สำหรับ Data
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<any[]>([]);
    const [categoryData, setCategoryData] = useState<any[]>([]);
    const [dormData, setDormData] = useState<any[]>([]);

    // 1. ดึงข้อมูลใบงานทั้งหมดจาก Firebase
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "Reports"), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setReports(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // ฟังก์ชันช่วยกรองวันที่
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

    // 2. คำนวณข้อมูลสำหรับนำไปวาดกราฟ
    useEffect(() => {
        const filtered = reports.filter(r => filterByDate(r.createdAt, selectedDate));
        
        // --- คำนวณหมวดหมู่ ---
        let catCounts: any = { 'ประปา': 0, 'ไฟฟ้า': 0, 'เฟอร์นิเจอร์': 0, 'เครื่องใช้ไฟฟ้า': 0 };
        let dormCounts: any = {};

        filtered.forEach(r => {
            // นับหมวดหมู่
            const cat = r.category || 'อื่นๆ';
            if (catCounts[cat] !== undefined) catCounts[cat]++;
            else catCounts['เครื่องใช้ไฟฟ้า']++; // หากเป็นหมวดแปลกๆ โยนเข้าหมวดสุดท้าย (หรือจะสร้างหมวดอื่นเพิ่มก็ได้)

            // นับหอพัก
            const dorm = r.dorm || 'ไม่ระบุ';
            dormCounts[dorm] = (dormCounts[dorm] || 0) + 1;
        });

        setCategoryData([
            { label: 'ประปา', value: catCounts['ประปา'], color: '#0EA5E9', icon: 'water' },
            { label: 'ไฟฟ้า', value: catCounts['ไฟฟ้า'], color: '#EAB308', icon: 'flash' },
            { label: 'เฟอร์นิเจอร์', value: catCounts['เฟอร์นิเจอร์'], color: '#8B5CF6', icon: 'bed' },
            { label: 'เครื่องใช้ฯ', value: catCounts['เครื่องใช้ไฟฟ้า'], color: '#EC4899', icon: 'tv' }, // ย่อชื่อให้กราฟไม่ล้น
        ]);

        // --- คำนวณหอพัก (จัดอันดับ Top 3 + อื่นๆ) ---
        const sortedDorms = Object.entries(dormCounts)
            .map(([name, count]) => ({ name, count: count as number }))
            .sort((a, b) => b.count - a.count);

        let finalDormData = [];
        if (sortedDorms.length <= 4) {
            const colors = ['#EF4444', '#F97316', '#F59E0B', '#6B7280'];
            finalDormData = sortedDorms.map((d, i) => ({
                label: d.name, value: d.count, color: colors[i] || '#6B7280', icon: 'business'
            }));
        } else {
            const top3 = sortedDorms.slice(0, 3);
            const restCount = sortedDorms.slice(3).reduce((sum, d) => sum + d.count, 0);
            finalDormData = [
                ...top3.map((d, i) => ({
                    label: d.name, value: d.count, color: ['#EF4444', '#F97316', '#F59E0B'][i], icon: 'business'
                })),
                { label: 'อื่นๆ', value: restCount, color: '#6B7280', icon: 'business' }
            ];
        }
        
        // กันเหนียวกรณีไม่มีข้อมูลเลย
        if (finalDormData.length === 0) {
            finalDormData = [{ label: 'ไม่มีข้อมูล', value: 0, color: '#D1D5DB', icon: 'business' }];
        }

        setDormData(finalDormData);
    }, [reports, selectedDate]);

    // เลือกใช้ข้อมูลตาม Tab
    const currentData = activeTab === 'category' ? categoryData : dormData;
    
    // คำนวณค่า Max และ Grid ของแกน Y (ป้องกันหาร 0 กรณีไม่มีงานเลย)
    const maxValue = Math.max(...currentData.map(d => d.value), 0);
    const gridMax = maxValue > 0 ? Math.ceil(maxValue / 10) * 10 || 10 : 10; 
    const totalValue = currentData.reduce((sum, item) => sum + item.value, 0);

    if (loading) return <View style={{flex: 1, justifyContent: 'center'}}><ActivityIndicator size="large" color="#F28C28" /></View>;

    return (
        <SafeAreaView style={styles.safeArea}>
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={26} color="#F28C28" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>สถิติเชิงลึก</Text>
                <TouchableOpacity style={styles.dateFilterBtn} activeOpacity={0.7} onPress={() => setFilterModalVisible(true)}>
                    <Text style={styles.dateFilterText}>{selectedDate}</Text>
                    <Ionicons name="chevron-down" size={14} color="#F28C28" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Segmented Control */}
                <View style={styles.segmentContainer}>
                    <TouchableOpacity style={[styles.segmentBtn, activeTab === 'category' && styles.segmentBtnActive]} onPress={() => setActiveTab('category')} activeOpacity={0.8}>
                        <Text style={[styles.segmentText, activeTab === 'category' && styles.segmentTextActive]}>แยกตามหมวดหมู่</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.segmentBtn, activeTab === 'dorm' && styles.segmentBtnActive]} onPress={() => setActiveTab('dorm')} activeOpacity={0.8}>
                        <Text style={[styles.segmentText, activeTab === 'dorm' && styles.segmentTextActive]}>แยกตามหอพัก</Text>
                    </TouchableOpacity>
                </View>

                {/* Summary Card */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>ยอดรวมทั้งหมด ({selectedDate})</Text>
                    <View style={styles.summaryValueRow}>
                        <Text style={styles.summaryTotal}>{totalValue}</Text>
                        <Text style={styles.summaryUnit}>รายการ</Text>
                    </View>
                    <View style={styles.trendRow}>
                        <Ionicons name="trending-up" size={16} color="#10B981" />
                        <Text style={styles.trendText}>ข้อมูลอัปเดตแบบ Real-time</Text>
                    </View>
                </View>

                {/* Bar Chart Area */}
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>กราฟแสดงจำนวนงานซ่อม</Text>

                    <View style={styles.chartWrapper}>
                        {/* Grid Y-Axis */}
                        <View style={styles.gridLinesContainer}>
                            {[gridMax, gridMax * 0.75, gridMax * 0.5, gridMax * 0.25, 0].map((val, index) => (
                                <View key={index} style={styles.gridLineRow}>
                                    <Text style={styles.yAxisText}>{Math.round(val)}</Text>
                                    <View style={[styles.gridLine, val === 0 && styles.gridLineBase]} />
                                </View>
                            ))}
                        </View>

                        {/* Bars X-Axis */}
                        <View style={styles.barsContainer}>
                            {currentData.map((item, index) => {
                                const heightPercentage = gridMax > 0 ? (item.value / gridMax) * 100 : 0;
                                return (
                                    <View key={index} style={styles.barCol}>
                                        <Text style={styles.barValueText}>{item.value}</Text>
                                        <View style={styles.barTrack}>
                                            <View style={[styles.barFill, { height: `${heightPercentage}%`, backgroundColor: item.color }]} />
                                        </View>
                                        <Text style={styles.xAxisText} numberOfLines={1}>{item.label}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </View>

                {/* Detailed Data Table */}
                <View style={styles.tableContainer}>
                    <Text style={styles.tableTitle}>รายละเอียดข้อมูล</Text>
                    <View style={styles.tableBox}>
                        {currentData.map((item, index) => {
                            const percentage = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : "0.0";
                            return (
                                <View key={index} style={[styles.tableRow, index === currentData.length - 1 && { borderBottomWidth: 0 }]}>
                                    <View style={styles.tableLabelCol}>
                                        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                                        <Text style={styles.tableLabelText}>{item.label}</Text>
                                    </View>
                                    <View style={styles.tableValueCol}>
                                        <Text style={styles.tableCountText}>{item.value} งาน</Text>
                                        <Text style={styles.tablePercentText}>{percentage}%</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

            </ScrollView>

            {/* Filter Date Modal */}
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

// ==========================================
// Styles
// ==========================================
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
    dateFilterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#F2D7C4', gap: 4 },
    dateFilterText: { fontSize: 12, fontWeight: '700', color: '#F28C28' },
    scrollContent: { paddingBottom: 40 },
    segmentContainer: { flexDirection: 'row', backgroundColor: '#E5E7EB', marginHorizontal: 20, marginTop: 20, borderRadius: 12, padding: 4 },
    segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    segmentBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    segmentText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
    segmentTextActive: { color: '#111827', fontWeight: '800' },
    summaryCard: { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: 20, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    summaryTitle: { fontSize: 14, color: '#6B7280', fontWeight: '600', marginBottom: 8 },
    summaryValueRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
    summaryTotal: { fontSize: 36, fontWeight: '800', color: '#111827' },
    summaryUnit: { fontSize: 16, color: '#4B5563', fontWeight: '600', marginLeft: 8 },
    trendRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 },
    trendText: { fontSize: 12, fontWeight: '700', color: '#065F46' },
    chartContainer: { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: 20, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    chartTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 20 },
    chartWrapper: { height: 220, flexDirection: 'row', position: 'relative' },
    gridLinesContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'space-between' },
    gridLineRow: { flexDirection: 'row', alignItems: 'center' },
    yAxisText: { width: 30, fontSize: 10, color: '#9CA3AF', fontWeight: '500', textAlign: 'right', marginRight: 8 },
    gridLine: { flex: 1, height: 1, backgroundColor: '#F3F4F6' },
    gridLineBase: { backgroundColor: '#D1D5DB' },
    barsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginLeft: 38, paddingBottom: 2 },
    barCol: { alignItems: 'center', width: 50 },
    barValueText: { fontSize: 12, fontWeight: '800', color: '#4B5563', marginBottom: 4 },
    barTrack: { width: 32, height: 160, justifyContent: 'flex-end' },
    barFill: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
    xAxisText: { fontSize: 10, color: '#6B7280', fontWeight: '600', marginTop: 8, textAlign: 'center' },
    tableContainer: { marginHorizontal: 20, marginTop: 24 },
    tableTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 },
    tableBox: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#F3F4F6' },
    tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    tableLabelCol: { flexDirection: 'row', alignItems: 'center' },
    colorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
    tableLabelText: { fontSize: 14, fontWeight: '600', color: '#374151' },
    tableValueCol: { alignItems: 'flex-end' },
    tableCountText: { fontSize: 14, fontWeight: '800', color: '#111827' },
    tablePercentText: { fontSize: 12, fontWeight: '500', color: '#9CA3AF', marginTop: 2 },
    modalOverlayFilter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContentFilter: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10, maxHeight: '60%' },
    modalHeaderFilter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 10 },
    modalTitleFilter: { fontSize: 18, fontWeight: '700', color: '#111827' },
    modalItemFilter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalItemTextFilter: { fontSize: 16, color: '#4B5563' },
    modalItemTextFilterActive: { color: '#F28C28', fontWeight: '700' }
});