import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

// ✅ 1. นำเข้า addDoc, collection, serverTimestamp และ getDocs สำหรับแจ้งเตือน
import { doc, onSnapshot, updateDoc, getDoc, addDoc, collection, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from '../../constants/firebaseConfig'; 

export default function TaskDetailScreen() {
    const { id } = useLocalSearchParams(); 
    const [job, setJob] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [workDetails, setWorkDetails] = useState('');
    const [materialCost, setMaterialCost] = useState('0');
    const [afterImages, setAfterImages] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const auth = getAuth();
    const techLocation = { latitude: 14.8818, longitude: 102.0205 };

    useEffect(() => {
        if (!id) return;
        const docRef = doc(db, "Reports", id as string);
        const unsubscribe = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
                const jobData = docSnap.data();
                setJob(jobData);
                
                const userRef = doc(db, "Users", jobData.userId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) setUserData(userSnap.data());
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [id]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled && result.assets?.length > 0) {
            setAfterImages((prev) => [...prev, result.assets[0].uri]);
        }
    };

    const removeImage = (index: number) => {
        setAfterImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!workDetails || afterImages.length === 0) {
            Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอกรายละเอียดและแนบรูปภาพหลังซ่อม");
            return;
        }
        
        try {
            setIsSubmitting(true);
            
            // 1. อัปเดตสถานะงานเป็นเสร็จสมบูรณ์
            const docRef = doc(db, "Reports", id as string);
            await updateDoc(docRef, {
                status: "รอตรวจสอบ",
                closingDetail: workDetails,
                materialCost: materialCost,
                afterImages: afterImages,
                closedAt: new Date().toISOString(),
                techId: auth.currentUser?.uid
            });

            // 2. ✅ ส่งการแจ้งเตือนหานักศึกษา (ผู้แจ้งซ่อม)
            if (job?.userId) {
                await addDoc(collection(db, "Notifications"), {
                    targetUid: job.userId,
                    title: "การซ่อมแซมเสร็จสิ้น 🎉",
                    body: `รายการ "${job.title}" ของคุณได้รับการแก้ไขเรียบร้อยแล้ว`,
                    isRead: false,
                    type: "repair_completed",
                    category: job.category,
                    jobId: id,
                    createdAt: serverTimestamp()
                });
            }

            // 3. ✅ ส่งการแจ้งเตือนหา Admin (ให้รู้ว่ามีงานเสร็จ)
            const adminQuery = query(collection(db, "Users"), where("role", "==", "admin"));
            const adminSnapshot = await getDocs(adminQuery);
            adminSnapshot.forEach(async (adminDoc) => {
                await addDoc(collection(db, "Notifications"), {
                    targetUid: adminDoc.id,
                    title: "มีรายการซ่อมแซมเสร็จสิ้น ✅",
                    body: `ช่างได้ปิดงานซ่อม: ${job?.title} (หอพัก ${job?.dorm} ห้อง ${job?.room})`,
                    isRead: false,
                    type: "repair_completed",
                    category: job?.category,
                    jobId: id,
                    createdAt: serverTimestamp()
                });
            });

            Alert.alert('สำเร็จ', 'ส่งงานและส่งแจ้งเตือนเรียบร้อยแล้ว', [
                { text: 'ตกลง', onPress: () => router.replace('/(technician)/(tabs)/tasks' as any) }
            ]);
        } catch (error) {
            Alert.alert("ผิดพลาด", "บันทึกไม่สำเร็จ");
            console.error("Submit Error: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const destination = job?.locationCoords ? {
        latitude: job.locationCoords.lat,
        longitude: job.locationCoords.lng
    } : null;

    if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" color="#F28C28" /></View>;

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.headerBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={32} color="#F28C28" />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* ... (UI ส่วนอื่นๆ คงเดิม) ... */}
                    <View style={styles.customerSection}>
                        <View style={styles.avatarCircle}><Ionicons name="person" size={40} color="#F28C28" /></View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>ชื่อ-นามสกุล ผู้แจ้ง</Text>
                            <View style={styles.readOnlyInput}><Text style={styles.readOnlyText}>{userData?.fullName || 'ไม่ระบุ'}</Text></View>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>เบอร์โทรศัพท์</Text>
                            <View style={styles.readOnlyInput}><Text style={styles.readOnlyText}>{userData?.phone || 'ไม่ระบุ'}</Text></View>
                        </View>
                    </View>

                    <Text style={styles.sectionTitleCenter}>รายละเอียดการซ่อม</Text>
                    
                    <View style={styles.infoBlock}>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>หมายเลขแจ้งซ่อม</Text><Text style={styles.infoValue}>#{(id as string).substring(0, 8).toUpperCase()}</Text></View>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>ประเภทงาน</Text><Text style={styles.infoValue}>{job?.category}</Text></View>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>สถานที่</Text><Text style={styles.infoValue}>{job?.dorm}, ห้อง {job?.room}</Text></View>
                    </View>

                    <View style={styles.problemBox}>
                        <Text style={styles.problemTitle}>ปัญหาที่นักศึกษาแจ้ง</Text>
                        <Text style={styles.problemText}>"{job?.title}"</Text>
                    </View>

                    <Text style={styles.sectionTitle}>พิกัดสถานที่เกิดเหตุ (GPS)</Text>
                    <View style={styles.mapContainer}>
                        {destination ? (
                            <MapView 
                                style={styles.map} 
                                initialRegion={{
                                    latitude: (techLocation.latitude + destination.latitude) / 2,
                                    longitude: (techLocation.longitude + destination.longitude) / 2,
                                    latitudeDelta: 0.02,
                                    longitudeDelta: 0.02,
                                }}
                            >
                                <Marker coordinate={techLocation} title="ตำแหน่งของคุณ" pinColor="#3B82F6" />
                                <Marker coordinate={destination} title="จุดเกิดเหตุ" pinColor="#EF4444" />
                                <Polyline coordinates={[techLocation, destination]} strokeColor="#111827" strokeWidth={3} lineDashPattern={[5, 5]} />
                            </MapView>
                        ) : (
                            <View style={[styles.map, { justifyContent:'center', alignItems:'center', backgroundColor:'#EEE'}]}>
                                <Text style={{color:'#6B7280'}}>ผู้แจ้งไม่ได้ระบุพิกัด GPS</Text>
                            </View>
                        )}
                        <View style={styles.mapOverlayInfo}>
                            <Text style={styles.mapValue}>{job?.dorm} ・ {job?.room}</Text>
                            <Text style={styles.mapLabel}>{job?.locationCoords?.address || "มหาวิทยาลัยเทคโนโลยีสุรนารี"}</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>ภาพประกอบตอนแจ้ง</Text>
                    <View style={styles.imageGallery}>
                        {job?.images && job.images.length > 0 ? (
                            job.images.map((uri: string, index: number) => (
                                <Image key={index} source={{ uri }} style={styles.attachedImage} />
                            ))
                        ) : (
                            <View style={[styles.attachedImage, {justifyContent:'center', alignItems:'center', backgroundColor:'#EEE'}]}><Text style={{color:'#9CA3AF'}}>ไม่มีรูปภาพ</Text></View>
                        )}
                    </View>

                    <View style={styles.dividerFull} />

                    <Text style={styles.sectionTitle}>ส่งงานภาพ (หลังซ่อมเสร็จ)</Text>
                    <View style={styles.previewRow}>
                        {afterImages.map((uri, index) => (
                            <View key={index} style={styles.imageWrapper}>
                                <Image source={{ uri }} style={styles.previewImage} />
                                <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(index)}><Ionicons name="close" size={16} color="#FFFFFF" /></TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                            <Ionicons name="camera" size={28} color="#F28C28" />
                            <Text style={styles.uploadTitle}>แนบรูป</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionTitle}>รายละเอียดการทำงาน</Text>
                    <TextInput style={styles.textArea} multiline placeholder="อธิบายสิ่งที่ดำเนินการ..." value={workDetails} onChangeText={setWorkDetails} />

                    <Text style={styles.sectionTitle}>ค่าวัสดุอุปกรณ์ (บาท)</Text>
                    <TextInput style={styles.priceInput} keyboardType="numeric" value={materialCost} onChangeText={setMaterialCost} />

                    <TouchableOpacity style={[styles.submitBtn, isSubmitting && {opacity:0.7}]} onPress={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>ปิดงาน / ส่งงาน</Text>}
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const ORANGE = '#F28C28';
const DARK_TEXT = '#111827';
const GRAY_TEXT = '#6B7280';

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 10 },
    backButton: { width: 44, height: 44, justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    customerSection: { alignItems: 'center', marginBottom: 24 },
    avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF8F1', borderWidth: 2, borderColor: ORANGE, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    inputGroup: { width: '100%', marginBottom: 12 },
    label: { fontSize: 14, fontWeight: '700', color: DARK_TEXT, marginBottom: 6 },
    readOnlyInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F9FAFB' },
    readOnlyText: { fontSize: 15, color: DARK_TEXT, fontWeight: '600' },
    sectionTitleCenter: { fontSize: 18, fontWeight: '800', color: DARK_TEXT, textAlign: 'center', marginBottom: 16 },
    infoBlock: { marginBottom: 20, paddingHorizontal: 10 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    infoLabel: { fontSize: 14, color: GRAY_TEXT },
    infoValue: { fontSize: 14, fontWeight: '700', color: DARK_TEXT },
    problemBox: { backgroundColor: '#FFF8F1', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 16, padding: 16, marginBottom: 24 },
    problemTitle: { fontSize: 16, fontWeight: '800', color: DARK_TEXT, marginBottom: 8 },
    problemText: { fontSize: 14, color: GRAY_TEXT, lineHeight: 22 },
    mapContainer: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#F3F4F6', marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' },
    map: { width: '100%', height: 180 },
    mapOverlayInfo: { backgroundColor: '#FFFFFF', padding: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    mapLabel: { fontSize: 11, color: GRAY_TEXT },
    mapValue: { fontSize: 13, fontWeight: '600', color: DARK_TEXT, marginBottom: 2 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: DARK_TEXT, marginBottom: 12 },
    imageGallery: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    attachedImage: { width: 110, height: 110, borderRadius: 16 },
    previewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    imageWrapper: { position: 'relative' },
    previewImage: { width: 110, height: 110, borderRadius: 16 },
    removeButton: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    uploadBox: { width: 110, height: 110, borderWidth: 2, borderStyle: 'dashed', borderColor: '#D1D5DB', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    uploadTitle: { fontSize: 14, fontWeight: '700', color: ORANGE, marginTop: 4 },
    textArea: { height: 100, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 16, padding: 16, fontSize: 14, color: DARK_TEXT, marginBottom: 24 },
    priceInput: { height: 52, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 16, fontSize: 15, color: DARK_TEXT, fontWeight: '600', marginBottom: 30 },
    submitBtn: { height: 56, backgroundColor: ORANGE, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    submitBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    dividerFull: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 24 },
});