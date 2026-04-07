import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert, Image, SafeAreaView, ScrollView, StyleSheet, 
  Text, TextInput, TouchableOpacity, View, ActivityIndicator, Platform
} from 'react-native';

import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from '../../constants/firebaseConfig';

export default function TechJobDetail() {
  const { id } = useLocalSearchParams(); // รับ Job ID มาจากหน้าลิสต์งาน
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // --- State สำหรับข้อมูลการปิดงาน ---
  const [finishDetail, setFinishDetail] = useState(""); // รายละเอียดสิ่งที่ซ่อม
  const [finishImage, setFinishImage] = useState<string | null>(null); // รูปหลังซ่อมเสร็จ
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const docSnap = await getDoc(doc(db, "Reports", id as string));
      if (docSnap.exists()) {
        setJob({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    })();
  }, [id]);

  // 🛠️ ฟังก์ชันเลือกรูปภาพหลังซ่อม (เหมือนหน้า User)
  const pickFinishImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setFinishImage(result.assets[0].uri);
    }
  };

  // ➕ เพิ่มฟังก์ชันถ่ายรูปจากกล้อง
  const takeFinishPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("แจ้งเตือน", "กรุณาอนุญาตการเข้าถึงกล้อง");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setFinishImage(result.assets[0].uri);
    }
  };

  // ✅ ฟังก์ชันปิดงาน/ส่งงาน (อัปโหลดรูปไป tech_finishes)
  const handleCloseJob = async () => {
    if (!finishDetail || !finishImage) {
      Alert.alert("ข้อมูลไม่ครบ", "กรุณาระบุรายละเอียดการซ่อมและแนบรูปถ่ายยืนยัน");
      return;
    }

    try {
      setIsSubmitting(true);
      let finishUrl = "";

      // 1. อัปโหลดรูปไปที่โฟลเดอร์ tech_finishes ใน Storage
      const blob: any = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new TypeError("Network request failed"));
        xhr.responseType = "blob";
        xhr.open("GET", finishImage!, true);
        xhr.send(null);
      });

      const storageRef = ref(storage, `tech_finishes/${Date.now()}_finish.jpg`);
      await uploadBytes(storageRef, blob);
      finishUrl = await getDownloadURL(storageRef);
      if (blob.close) blob.close();

      // 2. อัปเดต Firestore (เปลี่ยนสถานะและเพิ่มข้อมูลการซ่อม)
      const jobRef = doc(db, "Reports", id as string);
      await updateDoc(jobRef, {
        status: "ซ่อมแซมเสร็จสิ้น",
        finishDetail: finishDetail,
        finishImage: finishUrl,
        finishedAt: serverTimestamp(),
      });

      // 3. แจ้งเตือนกลับไปหา User (นักศึกษา)
      await addDoc(collection(db, "Notifications"), {
        targetUid: job.userId,
        title: "งานซ่อมของคุณเสร็จสิ้นแล้ว ✅",
        body: `ช่างแก้ไขเรียบร้อย: ${finishDetail}`,
        isRead: false,
        jobId: id,
        type: "job_done",
        createdAt: serverTimestamp(),
      });

      Alert.alert("สำเร็จ", "ปิดงานแจ้งซ่อมเรียบร้อยแล้ว", [
        { text: "ตกลง", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถส่งข้อมูลได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#F28C28" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>รายละเอียดงานซ่อม</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ข้อมูลปัญหาจากนักศึกษา */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>ข้อมูลจากนักศึกษา</Text>
          <Text style={styles.infoText}><Text style={styles.bold}>หอพัก:</Text> {job?.dorm} ห้อง {job?.room}</Text>
          <Text style={styles.infoText}><Text style={styles.bold}>ปัญหา:</Text> {job?.title}</Text>
          <Text style={styles.infoText}><Text style={styles.bold}>รายละเอียด:</Text> {job?.detail}</Text>
          {job?.images?.[0] && (
            <Image source={{ uri: job.images[0] }} style={styles.jobImage} resizeMode="cover" />
          )}
        </View>

        <View style={styles.divider} />

        {/* ส่วนของช่างสำหรับปิดงาน */}
        <View style={styles.techSection}>
          <Text style={styles.sectionTitle}>ยืนยันการซ่อมเสร็จสิ้น</Text>
          
          <Text style={styles.label}>สิ่งที่ดำเนินการแก้ไข:</Text>
          <TextInput
            style={styles.textArea}
            multiline
            placeholder="อธิบายสิ่งที่ช่างได้แก้ไขไป..."
            value={finishDetail}
            onChangeText={setFinishDetail}
          />

          <Text style={styles.label}>รูปถ่ายยืนยันหลังซ่อม:</Text>
          {finishImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: finishImage }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeImgBtn} onPress={() => setFinishImage(null)}>
                <Ionicons name="close-circle" size={28} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            // 🛠️ แยก 2 ปุ่มให้ชัดเจน
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.uploadBtn, { flex: 1, padding: 20 }]} onPress={pickFinishImage}>
                <Ionicons name="image" size={40} color="#F28C28" />
                <Text style={[styles.uploadBtnText, { textAlign: 'center' }]}>เลือกจากคลัง</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.uploadBtn, { flex: 1, padding: 20 }]} onPress={takeFinishPhoto}>
                <Ionicons name="camera" size={40} color="#F28C28" />
                <Text style={[styles.uploadBtnText, { textAlign: 'center' }]}>ถ่ายรูปใหม่</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && { opacity: 0.6 }]} 
            onPress={handleCloseJob}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitText}>ยืนยันการปิดงานซ่อม</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 20 },
  infoCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#111827' },
  infoText: { fontSize: 15, marginBottom: 5, color: '#4B5563' },
  bold: { fontWeight: '700', color: '#111827' },
  jobImage: { width: '100%', height: 180, borderRadius: 12, marginTop: 10 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 25 },
  techSection: { paddingBottom: 40 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#374151' },
  textArea: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 20 },
  uploadBtn: { borderStyle: 'dashed', borderWidth: 2, borderColor: '#F28C28', borderRadius: 16, padding: 30, alignItems: 'center', backgroundColor: '#FFF' },
  uploadBtnText: { color: '#F28C28', fontWeight: '700', marginTop: 8 },
  imagePreviewContainer: { position: 'relative', borderRadius: 16, overflow: 'hidden' },
  previewImage: { width: '100%', height: 200, borderRadius: 16 },
  removeImgBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: '#FFF', borderRadius: 20 },
  submitButton: { backgroundColor: '#F28C28', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 30, shadowColor: '#F28C28', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitText: { color: '#FFF', fontSize: 18, fontWeight: '700' }
});