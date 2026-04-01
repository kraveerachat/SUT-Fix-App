import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert, FlatList, Image, Modal, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';

import { getAuth } from "firebase/auth";
import { collection, addDoc, doc, getDoc, updateDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from '../../constants/firebaseConfig'; 

const DORMITORIES = Array.from({ length: 18 }, (_, i) => `สุรนิเวศ ${i + 1}`);
const ROOMS = Array.from({ length: 10 }, (_, i) => `${i + 101}`);

// ==========================================
// Component: Dropdown Picker
// ==========================================
function DropdownPicker({ placeholder, options, selectedValue, onSelect }: any) {
  const [modalVisible, setModalVisible] = useState(false);
  return (
    <>
      <TouchableOpacity style={styles.selectBox} activeOpacity={0.7} onPress={() => setModalVisible(true)}>
        <Text style={[styles.selectText, selectedValue && { color: '#111827' }]}>{selectedValue || placeholder}</Text>
        <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
      </TouchableOpacity>
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#6B7280" /></TouchableOpacity>
            </View>
            <FlatList data={options} keyExtractor={(item) => item} renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { onSelect(item); setModalVisible(false); }}>
                <Text style={[styles.modalItemText, selectedValue === item && { color: '#F28C28', fontWeight: '700' }]}>{item}</Text>
                {selectedValue === item && <Ionicons name="checkmark-circle" size={20} color="#F28C28" />}
              </TouchableOpacity>
            )} />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ==========================================
// Component: CategoryChip
// ==========================================
function CategoryChip({ label, active, icon, type, onPress }: any) {
  const iconColor = active ? '#FFFFFF' : '#6B7280';
  const renderIcon = () => {
    if (type === 'ion') return <Ionicons name={icon as any} size={18} color={iconColor} />;
    if (type === 'material') return <MaterialCommunityIcons name={icon as any} size={18} color={iconColor} />;
    return <Feather name={icon as any} size={18} color={iconColor} />;
  };
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      {renderIcon()}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ReportScreen() {
  const params = useLocalSearchParams(); 
  const [selectedDorm, setSelectedDorm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [activeCategory, setActiveCategory] = useState('ประปา');
  const [detail, setDetail] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const auth = getAuth();
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "Users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.dorm) setSelectedDorm(data.dorm);
          if (data.room) setSelectedRoom(data.room);
        }
      }
    })();
  }, []);

  // ✅ แก้ไขฟังก์ชันเลือกรูปภาพให้แปลงเป็น Base64
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('แจ้งเตือน', 'กรุณาอนุญาตการเข้าถึงรูปภาพเพื่อแนบไฟล์ประกอบ');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.3, // ลดขนาดรูปภาพลงเพื่อไม่ให้เกินขีดจำกัดของ Firestore
      base64: true, // สั่งให้แปลงเป็นข้อความ Base64
    });

    if (!result.canceled && result.assets?.length > 0 && result.assets[0].base64) {
      // เอาข้อความ Base64 มาจัดรูปแบบให้เป็น URL รูปภาพ
      const base64ImageUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setImages((prev) => [...prev, base64ImageUri]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedDorm || !selectedRoom || !detail) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณาระบุหอพัก เลขห้อง และรายละเอียดปัญหา');
      return;
    }

    try {
      setIsSubmitting(true);
      const auth = getAuth();
      if (!auth.currentUser) return;

      const shortTitle = detail.substring(0, 25) + (detail.length > 25 ? "..." : "");

      // 1. บันทึกข้อมูลลงตาราง Reports (คราวนี้ images จะเก็บเป็น Base64 ใช้งานได้ทุกเครื่อง)
      const docRef = await addDoc(collection(db, "Reports"), {
        userId: auth.currentUser.uid,
        title: shortTitle,
        category: activeCategory,
        detail,
        dorm: selectedDorm,
        room: selectedRoom,
        status: "รอดำเนินการ",
        createdAt: new Date().toISOString(),
        images, 
        locationCoords: params.latitude ? {
          lat: parseFloat(params.latitude as string),
          lng: parseFloat(params.longitude as string),
          address: params.address
        } : null
      });

      // 2. อัปเดตหอพักล่าสุดของผู้ใช้
      await updateDoc(doc(db, "Users", auth.currentUser.uid), {
        dorm: selectedDorm,
        room: selectedRoom
      });

      // 3. ระบบยิงแจ้งเตือนหา "Admin" และ "ช่างเทคนิค" ทุกคนในระบบ
      const staffQuery = query(collection(db, "Users"), where("role", "in", ["admin", "technician"]));
      const staffSnapshot = await getDocs(staffQuery);

      staffSnapshot.forEach(async (staffDoc) => {
        await addDoc(collection(db, "Notifications"), {
            targetUid: staffDoc.id, 
            title: "มีคำร้องแจ้งซ่อมใหม่ 📢",
            body: `นักศึกษาแจ้งปัญหา "${shortTitle}" ที่หอพัก ${selectedDorm} ห้อง ${selectedRoom}`,
            isRead: false,
            type: "new_request",
            category: activeCategory,
            jobId: docRef.id,
            createdAt: serverTimestamp()
        });
      });

      Alert.alert('สำเร็จ', 'ส่งคำร้องแจ้งซ่อมเรียบร้อยแล้ว', [
        { text: 'ตกลง', onPress: () => router.replace('/(user)/(tabs)' as any) }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งข้อมูลได้ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#F28C28" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>แจ้งซ่อมแซม</Text>
        <View style={styles.headerSpace} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>สถานที่เกิดปัญหา</Text>
          <View style={styles.roomCard}>
            <DropdownPicker placeholder="เลือกหอพัก" options={DORMITORIES} selectedValue={selectedDorm} onSelect={(val: any) => setSelectedDorm(val)} />
            <View style={{ height: 12 }} />
            <DropdownPicker placeholder="เลขห้อง" options={ROOMS} selectedValue={selectedRoom} onSelect={setSelectedRoom} />
            
            <TouchableOpacity style={[styles.locationRow, params.latitude && { backgroundColor: '#D1FAE5' }]} onPress={() => router.push('/select-location')}>
              <Ionicons name="location" size={16} color={params.latitude ? "#059669" : "#EF4444"} />
              <Text style={[styles.locationText, params.latitude && { color: '#059669' }]}>
                {params.latitude ? "ระบุพิกัดเรียบร้อยแล้ว" : "ระบุพิกัดผ่านแผนที่ (GPS)"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>หมวดหมู่ปัญหา</Text>
          <View style={styles.chipWrap}>
            {['ประปา', 'ไฟฟ้า', 'เฟอร์นิเจอร์', 'เครื่องใช้ไฟฟ้า', 'อื่นๆ'].map((cat) => (
              <CategoryChip key={cat} label={cat} active={activeCategory === cat} 
                icon={cat === 'ประปา' ? 'water-outline' : cat === 'ไฟฟ้า' ? 'flash-outline' : cat === 'เฟอร์นิเจอร์' ? 'bed-outline' : cat === 'เครื่องใช้ไฟฟ้า' ? 'tv-outline' : 'more-horizontal'} 
                type={cat === 'อื่นๆ' ? 'feather' : 'ion'} onPress={() => setActiveCategory(cat)} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>รายละเอียดปัญหา</Text>
          <TextInput style={styles.textArea} multiline textAlignVertical="top" placeholder="อธิบายปัญหาที่พบ..." value={detail} onChangeText={setDetail} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ภาพประกอบ (ถ้ามี)</Text>
          <TouchableOpacity style={styles.uploadBox} activeOpacity={0.7} onPress={pickImage}>
            <View style={styles.uploadIconCircle}>
              <Ionicons name="camera" size={28} color="#F28C28" />
            </View>
            <Text style={styles.uploadTitle}>คลิกเพื่อแนบรูปภาพ</Text>
          </TouchableOpacity>

          {images.length > 0 && (
            <View style={styles.previewRow}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(index)}>
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>ส่งคำร้องแจ้งซ่อม</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  headerBar: { backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 15, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { width: 40 }, headerTitle: { fontSize: 18, fontWeight: '700' }, headerSpace: { width: 40 },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  roomCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, backgroundColor: '#FFFFFF', padding: 16, elevation: 1 },
  selectBox: { height: 50, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, backgroundColor: '#F9FAFB', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectText: { fontSize: 15, color: '#9CA3AF' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12 },
  locationText: { marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#EF4444' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  chipActive: { borderColor: '#F28C28', backgroundColor: '#F28C28' },
  chipText: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#4B5563' },
  chipTextActive: { color: '#FFFFFF' },
  textArea: { height: 120, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 16, backgroundColor: '#FFFFFF', padding: 16, fontSize: 15, color: '#111827' },
  uploadBox: { height: 120, borderWidth: 2, borderStyle: 'dashed', borderColor: '#D1D5DB', borderRadius: 16, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  uploadIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF3E8', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  uploadTitle: { fontSize: 14, fontWeight: '700', color: '#F28C28' },
  previewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  imageWrapper: { position: 'relative' },
  previewImage: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  removeButton: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, backgroundColor: '#EF4444', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  submitButton: { marginTop: 32, marginHorizontal: 20, height: 56, backgroundColor: '#F28C28', borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalItemText: { fontSize: 16 },
  scrollContent: { paddingBottom: 40 }
});