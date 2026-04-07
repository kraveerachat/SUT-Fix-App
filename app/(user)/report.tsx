import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy'; 
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    Alert, FlatList, Image, Modal, Platform, SafeAreaView,
    ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';

import { getAuth } from "firebase/auth";
import { collection, addDoc, doc, getDoc, updateDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db, storage } from '../../constants/firebaseConfig'; 
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; 

const DORMITORIES = ["สุรนิเวศ 1", "สุรนิเวศ 2", "สุรนิเวศ 3", "สุรนิเวศ 4", "สุรนิเวศ 7", "สุรนิเวศ 8", "สุรนิเวศ 9"];
const ROOMS = Array.from({ length: 10 }, (_, i) => `${i + 101}`);

export default function ReportScreen() {
  const params = useLocalSearchParams(); 
  const [selectedDorm, setSelectedDorm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [activeCategory, setActiveCategory] = useState('ประปา');
  const [issueTitle, setIssueTitle] = useState(''); 
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

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('แจ้งเตือน', 'กรุณาอนุญาตการเข้าถึงรูปภาพ');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5, 
    });
    if (!result.canceled && result.assets?.length > 0) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  // ➕ เพิ่มฟังก์ชันถ่ายรูปจากกล้อง (Camera)
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('แจ้งเตือน', 'กรุณาอนุญาตการเข้าถึงกล้อง');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedDorm || !selectedRoom || !detail || !issueTitle) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณาระบุข้อมูลให้ครบทุกช่อง');
      return;
    }

    try {
      setIsSubmitting(true);
      const auth = getAuth();
      if (!auth.currentUser) return;

      const uploadedImageUrls: string[] = [];
      for (const uri of images) {
        try {
          const blob: any = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => resolve(xhr.response);
            xhr.onerror = () => reject(new TypeError("Network request failed"));
            xhr.responseType = "blob";
            xhr.open("GET", uri, true);
            xhr.send(null);
          });

          const storageRef = ref(storage, `reports/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
          const uploadResult = await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(uploadResult.ref);
          uploadedImageUrls.push(downloadURL); 
          if (blob.close) blob.close(); 
        } catch (error) {
          console.error("Upload error: ", error);
        }
      }

      const docRef = await addDoc(collection(db, "Reports"), {
        userId: auth.currentUser.uid,
        title: issueTitle,
        category: activeCategory,
        detail,
        dorm: selectedDorm,
        room: selectedRoom,
        status: "รอดำเนินการ",
        createdAt: new Date().toISOString(),
        images: uploadedImageUrls, 
      });

      const staffQuery = query(collection(db, "Users"), where("role", "in", ["admin", "technician"]));
      const staffSnapshot = await getDocs(staffQuery);
      staffSnapshot.forEach(async (staffDoc) => {
        await addDoc(collection(db, "Notifications"), {
            targetUid: staffDoc.id, 
            title: "มีคำร้องแจ้งซ่อมใหม่ 📢",
            body: `แจ้งปัญหา "${issueTitle}" ที่หอ ${selectedDorm} ห้อง ${selectedRoom}`,
            isRead: false,
            type: "new_request",
            jobId: docRef.id,
            createdAt: serverTimestamp()
        });
      });

      Alert.alert('สำเร็จ', 'ส่งคำร้องเรียบร้อยแล้ว', [{ text: 'ตกลง', onPress: () => router.replace('/(user)/(tabs)') }]);
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งข้อมูลได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#F28C28" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}><Text style={{color: '#F28C28'}}>SUT</Text> FixIt</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.mainTitle}>แจ้งซ่อมแซม</Text>

        <View style={styles.section}>
          <Text style={styles.label}>หัวข้อปัญหา (ย่อ)</Text>
          <TextInput style={styles.input} placeholder="เช่น แอร์ไม่เย็น, หลอดไฟขาด..." value={issueTitle} onChangeText={setIssueTitle} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>สถานที่เกิดปัญหา</Text>
          <View style={styles.card}>
            <TextInput style={styles.input} placeholder="ระบุหอพัก" value={selectedDorm} onChangeText={setSelectedDorm} />
            <TextInput style={[styles.input, {marginTop: 10}]} placeholder="ระบุเลขห้อง" value={selectedRoom} onChangeText={setSelectedRoom} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>หมวดหมู่ปัญหา</Text>
          <View style={styles.chipWrap}>
            {['ประปา', 'ไฟฟ้า', 'เฟอร์นิเจอร์', 'เครื่องใช้ไฟฟ้า', 'อื่นๆ'].map((cat) => (
              <TouchableOpacity key={cat} style={[styles.chip, activeCategory === cat && styles.chipActive]} onPress={() => setActiveCategory(cat)}>
                <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>รายละเอียดปัญหา</Text>
          <TextInput style={styles.textArea} multiline placeholder="อธิบายปัญหา..." value={detail} onChangeText={setDetail} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>ภาพประกอบ (ถ้ามี)</Text>
          {/* 🛠️ แก้ไขส่วนนี้: แยกปุ่มให้ชัดเจน 2 ปุ่มเหมือนหน้า Edit */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[styles.uploadBox, { flex: 1 }]} onPress={pickImage}>
              <Ionicons name="image" size={32} color="#F28C28" />
              <Text style={styles.uploadText}>คลังรูปภาพ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.uploadBox, { flex: 1 }]} onPress={takePhoto}>
              <Ionicons name="camera" size={32} color="#F28C28" />
              <Text style={styles.uploadText}>ถ่ายรูป</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.previewRow}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(index)}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
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
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 20 },
  mainTitle: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  section: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#374151' },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB' },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB' },
  chipActive: { backgroundColor: '#F28C28', borderColor: '#F28C28' },
  chipText: { color: '#4B5563', fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  textArea: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#D1D5DB' },
  uploadBox: { borderStyle: 'dashed', borderWidth: 2, borderColor: '#F28C28', borderRadius: 16, padding: 20, alignItems: 'center', backgroundColor: '#FFF' },
  uploadText: { color: '#F28C28', fontWeight: '700', marginTop: 8 },
  previewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15 },
  imageWrapper: { position: 'relative' },
  previewImage: { width: 80, height: 80, borderRadius: 12 },
  removeButton: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FFF', borderRadius: 12 },
  submitButton: { backgroundColor: '#F28C28', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  submitButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' }
});