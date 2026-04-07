import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from 'expo-file-system/legacy'; 
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Image, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";

import { collection, addDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db, storage } from "../../constants/firebaseConfig";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

export default function EditReportScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [selectedDorm, setSelectedDorm] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [activeCategory, setActiveCategory] = useState("ประปา");
  const [issueTitle, setIssueTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, "Reports", id as string));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSelectedDorm(data.dorm || "");
          setSelectedRoom(data.room || "");
          setActiveCategory(data.category || "ประปา");
          setIssueTitle(data.title || "");
          setDetail(data.detail || "");
          setImages(data.images || []);
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    })();
  }, [id]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.5 });
    if (!result.canceled) setImages((prev) => [...prev, result.assets[0].uri]);
  };

  // ➕ เพิ่มฟังก์ชันถ่ายรูปจากกล้อง
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("แจ้งเตือน", "กรุณาอนุญาตการเข้าถึงกล้อง");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) setImages((prev) => [...prev, result.assets[0].uri]);
  };

  const removeImage = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index));

  const handleUpdate = async () => {
    if (!selectedDorm || !selectedRoom || !detail || !issueTitle) {
      Alert.alert("ข้อมูลไม่ครบ", "กรุณาระบุข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      setIsUpdating(true);
      const docRef = doc(db, "Reports", id as string);
      
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const oldImages: string[] = docSnap.data().images || [];
        const imagesToDelete = oldImages.filter(url => !images.includes(url));
        for (const url of imagesToDelete) {
          try {
            const fileRef = ref(storage, url);
            await deleteObject(fileRef);
          } catch (e) { console.log("Delete failed or file not found"); }
        }
      }

      const finalImageUrls: string[] = [];
      for (const uri of images) {
        if (uri.startsWith('http')) {
           finalImageUrls.push(uri);
        } else {
           const blob: any = await new Promise((resolve, reject) => {
             const xhr = new XMLHttpRequest();
             xhr.onload = () => resolve(xhr.response);
             xhr.onerror = () => reject(new TypeError("Network request failed"));
             xhr.responseType = "blob";
             xhr.open("GET", uri, true);
             xhr.send(null);
           });
           const storageRef = ref(storage, `reports/${Date.now()}_edit.jpg`);
           await uploadBytes(storageRef, blob);
           const downloadURL = await getDownloadURL(storageRef);
           finalImageUrls.push(downloadURL);
           if (blob.close) blob.close();
        }
      }

      await updateDoc(docRef, {
        dorm: selectedDorm, room: selectedRoom, category: activeCategory,
        detail, title: issueTitle, images: finalImageUrls, updatedAt: new Date().toISOString(),
      });

      Alert.alert("สำเร็จ", "อัปเดตเรียบร้อยแล้ว", [{ text: "ตกลง", onPress: () => router.replace("/(user)/(tabs)") }]);
    } catch (error) {
      Alert.alert("ข้อผิดพลาด", "บันทึกข้อมูลไม่สำเร็จ");
    } finally { setIsUpdating(false); }
  };

  if (loading) return <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator size="large" color="#F28C28" /></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color="#F28C28" /></TouchableOpacity>
        <Text style={styles.headerTitle}>แก้ไขการแจ้งซ่อม</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}><Text style={styles.label}>หัวข้อปัญหา</Text>
          <TextInput style={styles.input} value={issueTitle} onChangeText={setIssueTitle} />
        </View>

        <View style={styles.section}><Text style={styles.label}>สถานที่</Text>
          <View style={styles.card}>
            <TextInput style={styles.input} placeholder="หอพัก" value={selectedDorm} onChangeText={setSelectedDorm} />
            <TextInput style={[styles.input, {marginTop: 10}]} placeholder="เลขห้อง" value={selectedRoom} onChangeText={setSelectedRoom} />
          </View>
        </View>

        <View style={styles.section}><Text style={styles.label}>รูปภาพ</Text>
          {/* 🛠️ แก้ไขส่วนนี้: แยกปุ่มให้ชัดเจน 2 ปุ่ม */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[styles.uploadBox, { flex: 1 }]} onPress={pickImage}>
              <Ionicons name="image" size={28} color="#F28C28" />
              <Text style={{color: '#F28C28', fontWeight: '700'}}>เลือกภาพ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.uploadBox, { flex: 1 }]} onPress={takePhoto}>
              <Ionicons name="camera" size={28} color="#F28C28" />
              <Text style={{color: '#F28C28', fontWeight: '700'}}>ถ่ายรูป</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.previewRow}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(index)}><Ionicons name="close-circle" size={24} color="#EF4444" /></TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleUpdate} disabled={isUpdating}>
          {isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>บันทึกการแก้ไข</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#EEE" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  scrollContent: { padding: 20 },
  section: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  input: { backgroundColor: "#FFF", padding: 15, borderRadius: 12, borderWidth: 1, borderColor: "#D1D5DB" },
  card: { backgroundColor: "#FFF", padding: 15, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  uploadBox: { borderStyle: "dashed", borderWidth: 2, borderColor: "#F28C28", borderRadius: 16, padding: 20, alignItems: "center", backgroundColor: "#FFF" },
  previewRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 15 },
  imageWrapper: { position: "relative" },
  previewImage: { width: 80, height: 80, borderRadius: 12 },
  removeButton: { position: "absolute", top: -5, right: -5, backgroundColor: "#FFF", borderRadius: 12 },
  submitButton: { backgroundColor: "#F28C28", padding: 18, borderRadius: 16, alignItems: "center", marginTop: 20 },
  submitButtonText: { color: "#FFF", fontSize: 18, fontWeight: "700" }
});