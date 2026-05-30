import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
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
} from 'react-native';

// ✅ เชื่อมต่อ Firebase
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../constants/firebaseConfig'; 

export default function ServiceCompletedScreen() {
    const { id } = useLocalSearchParams();
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // States สำหรับการประเมิน
    const [qualityRating, setQualityRating] = useState(0);
    const [speedRating, setSpeedRating] = useState(0);
    const [comment, setComment] = useState('');

    // ดึงข้อมูล Real-time
    useEffect(() => {
        if (!id) return;
        const docRef = doc(db, "Reports", id as string);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setJob(data);
                // ถ้าเคยประเมินไปแล้ว ให้ดึงค่าเก่ามาโชว์
                if (data.isReviewed || data.rating) {
                    setQualityRating(data.rating?.quality || data.qualityRating || 0);
                    setSpeedRating(data.rating?.speed || data.speedRating || 0);
                    setComment(data.rating?.comment || data.reviewComment || '');
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [id]);

    // ฟังก์ชันส่งแบบประเมิน
    const handleSubmitReview = async () => {
        if (qualityRating === 0 || speedRating === 0) {
            Alert.alert("กรุณาให้คะแนน", "โปรดให้คะแนนดาวทั้งคุณภาพและความรวดเร็วก่อนส่งครับ");
            return;
        }

        try {
            setIsSubmitting(true);
            const docRef = doc(db, "Reports", id as string);
            
            await updateDoc(docRef, {
                isReviewed: true,
                rating: {
                    quality: qualityRating,
                    speed: speedRating,
                    comment: comment,
                    ratedAt: new Date().toISOString()
                }
            });

            Alert.alert("ขอบคุณครับ!", "เราได้รับผลการประเมินของคุณเรียบร้อยแล้ว", [
                { text: "ตกลง", onPress: () => router.back() }
            ]);
        } catch (error) {
            Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถส่งแบบประเมินได้ในขณะนี้");
        } finally {
            setIsSubmitting(false);
        }
    };

    // คอมโพเนนต์สำหรับให้ดาว (Star Rating)
    const StarRating = ({ rating, setRating, disabled }: { rating: number, setRating: (val: number) => void, disabled?: boolean }) => {
        return (
            <View style={styles.starContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity 
                        key={star} 
                        activeOpacity={disabled ? 1 : 0.7}
                        onPress={() => !disabled && setRating(star)}
                        style={styles.starBtn}
                    >
                        <Ionicons 
                            name={star <= rating ? "star" : "star-outline"} 
                            size={32} 
                            color={star <= rating ? "#F59E0B" : "#D1D5DB"} 
                        />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#F28C28" />
            </View>
        );
    }

    const isAlreadyReviewed = job?.isReviewed === true || !!job?.rating;

    // รวมรูปภาพหลังซ่อมจากทุกฟิลด์ที่เป็นไปได้
    const afterImages = job?.afterImages || (job?.afterImage ? [job.afterImage] : []);
    // รูปภาพก่อนซ่อมจากฝั่งนักศึกษา
    const beforeImages = job?.images || [];

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color="#F28C28" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>รายละเอียดแจ้งซ่อมแซม</Text>
                    <View style={{ width: 28 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* สถานะปัจจุบัน */}
                    <Text style={styles.sectionTitle}>สถานะปัจจุบัน</Text>
                    <View style={styles.statusCard}>
                        <View style={styles.statusIconCircle}>
                            <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                        </View>
                        <View style={styles.statusTextGroup}>
                            <Text style={styles.statusTitle}>ซ่อมแซมเสร็จสิ้น</Text>
                            <Text style={styles.statusDate}>
                                อัปเดตเมื่อ {job?.closedAt || job?.approvedAt ? new Date(job.closedAt || job.approvedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                            </Text>
                        </View>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>เสร็จสมบูรณ์</Text>
                        </View>
                    </View>

                    {/* ข้อมูลการซ่อมแซม */}
                    <Text style={styles.sectionTitle}>ข้อมูลการซ่อมแซม</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>หมายเลขงาน</Text>
                            <Text style={styles.infoValueBold}>#{id?.toString().substring(0, 8).toUpperCase()}</Text>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>ประเภทงาน</Text>
                            <Text style={styles.infoValueBold}>ระบบ{job?.category || '-'}</Text>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>สถานที่</Text>
                            <Text style={styles.infoValueBold}>หอพัก {job?.dorm}, ห้อง {job?.room}</Text>
                        </View>

                        <View style={styles.techNoteBox}>
                            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#D97706" style={{ marginTop: 2, marginRight: 8 }} />
                            <Text style={styles.techNoteText}>
                                "{job?.action || job?.closingDetail || job?.techNote || 'ช่างไม่ได้ระบุรายละเอียดเพิ่มเติม'}"
                            </Text>
                        </View>
                    </View>

                    {/* ✅ ภาพถ่ายก่อนดำเนินการ */}
                    <Text style={styles.sectionTitle}>ภาพถ่ายก่อนดำเนินการ</Text>
                    {beforeImages.length > 0 ? (
                        <View style={styles.imageGrid}>
                            {beforeImages.map((uri: string, idx: number) => (
                                <Image key={`before-${idx}`} source={{ uri }} style={styles.gridImage} />
                            ))}
                        </View>
                    ) : (
                        <View style={styles.noImageBox}>
                            <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                            <Text style={{ color: '#9CA3AF', marginTop: 8 }}>ไม่มีภาพถ่ายก่อนดำเนินการ</Text>
                        </View>
                    )}

                    {/* ✅ ภาพถ่ายหลังดำเนินการ (ครบทุกรูป) */}
                    <Text style={styles.sectionTitle}>ภาพถ่ายหลังดำเนินการ</Text>
                    {afterImages.length > 0 ? (
                        <View style={styles.imageGrid}>
                            {afterImages.map((uri: string, idx: number) => (
                                <Image key={`after-${idx}`} source={{ uri }} style={styles.gridImage} />
                            ))}
                        </View>
                    ) : (
                        <View style={styles.noImageBox}>
                            <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                            <Text style={{ color: '#9CA3AF', marginTop: 8 }}>ไม่มีภาพถ่ายจากช่าง</Text>
                        </View>
                    )}

                    {/* ประเมินความพึงพอใจ */}
                    <Text style={styles.sectionTitle}>ประเมินความพึงพอใจ</Text>
                    <View style={styles.ratingCard}>
                        
                        <View style={styles.ratingRow}>
                            <View style={styles.ratingHeader}>
                                <View>
                                    <Text style={styles.ratingTitle}>คุณภาพการซ่อมแซม</Text>
                                    <Text style={styles.ratingSub}>กรุณาให้คะแนน 1 - 5 ดาว</Text>
                                </View>
                                <Text style={styles.ratingScoreText}>{qualityRating > 0 ? qualityRating.toFixed(1) : '-'}</Text>
                            </View>
                            <StarRating rating={qualityRating} setRating={setQualityRating} disabled={isAlreadyReviewed} />
                        </View>

                        <View style={styles.infoDivider} />

                        <View style={styles.ratingRow}>
                            <View style={styles.ratingHeader}>
                                <View>
                                    <Text style={styles.ratingTitle}>ความรวดเร็วในการบริการ</Text>
                                    <Text style={styles.ratingSub}>กรุณาให้คะแนน 1 - 5 ดาว</Text>
                                </View>
                                <Text style={styles.ratingScoreText}>{speedRating > 0 ? speedRating.toFixed(1) : '-'}</Text>
                            </View>
                            <StarRating rating={speedRating} setRating={setSpeedRating} disabled={isAlreadyReviewed} />
                        </View>

                        <View style={styles.infoDivider} />

                        <View style={styles.commentSection}>
                            <View style={styles.commentHeader}>
                                <Text style={styles.ratingTitle}>ข้อเสนอแนะเพิ่มเติม</Text>
                                <View style={styles.optionalBadge}><Text style={styles.optionalText}>Optional</Text></View>
                            </View>
                            <TextInput
                                style={[styles.commentInput, isAlreadyReviewed && { backgroundColor: '#F3F4F6', color: '#6B7280' }]}
                                placeholder="บอกเล่าความประทับใจ หรือข้อเสนอแนะเพื่อพัฒนา..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={4}
                                value={comment}
                                onChangeText={setComment}
                                editable={!isAlreadyReviewed}
                            />
                        </View>

                    </View>

                </ScrollView>

                {!isAlreadyReviewed && (
                    <View style={styles.bottomAction}>
                        <TouchableOpacity 
                            style={[styles.submitBtn, (isSubmitting || qualityRating === 0 || speedRating === 0) && { opacity: 0.5 }]} 
                            onPress={handleSubmitReview}
                            disabled={isSubmitting || qualityRating === 0 || speedRating === 0}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.submitBtnText}>ส่งแบบประเมิน</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 24, marginBottom: 12 },
    statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
    statusIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    statusTextGroup: { flex: 1 },
    statusTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 2 },
    statusDate: { fontSize: 13, color: '#6B7280' },
    statusBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    statusBadgeText: { color: '#059669', fontSize: 12, fontWeight: '700' },
    infoCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    infoLabel: { fontSize: 14, color: '#6B7280' },
    infoValueBold: { fontSize: 14, fontWeight: '800', color: '#111827' },
    infoDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
    techNoteBox: { flexDirection: 'row', backgroundColor: '#FFFBEB', padding: 16, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: '#FEF3C7' },
    techNoteText: { flex: 1, fontSize: 14, color: '#D97706', lineHeight: 22, fontStyle: 'italic' },

    imageGrid: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between' 
    },
    gridImage: { 
        width: '48%', 
        height: 160, 
        borderRadius: 16, 
        marginBottom: 12, 
        backgroundColor: '#E5E7EB' 
    },
    noImageBox: { 
        width: '100%', 
        height: 160, 
        borderRadius: 16, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#E5E7EB' 
    },

    ratingCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2, marginBottom: 20 },
    ratingRow: { paddingVertical: 8 },
    ratingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    ratingTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
    ratingSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
    ratingScoreText: { fontSize: 20, fontWeight: '800', color: '#F59E0B' },
    starContainer: { flexDirection: 'row', gap: 8 },
    starBtn: { padding: 2 },
    commentSection: { paddingTop: 12 },
    commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    optionalBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    optionalText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
    commentInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, fontSize: 14, color: '#111827', height: 100, textAlignVertical: 'top' },
    bottomAction: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    submitBtn: { backgroundColor: '#F28C28', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});