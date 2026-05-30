import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert, Image, Platform, SafeAreaView, ScrollView, SectionList, StyleSheet,
  Text, TextInput, TouchableOpacity, View, ActivityIndicator, Modal, Linking
} from 'react-native';

import { getAuth } from "firebase/auth";
import { collection, doc, getDoc, query, where, getDocs } from "firebase/firestore";
import { db, storage } from '../../constants/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { API_URL } from '../../constants/api';

// ✅ พิกัดที่แม่นยำ แยกชาย/หญิง
const FEMALE_DORMS = [
  { id: 'S1',  name: 'สุรนิเวศ 1',  lat: 14.8951577, lng: 102.0150943 },
  { id: 'S2',  name: 'สุรนิเวศ 2',  lat: 14.8960448, lng: 102.0145654 },
  { id: 'S3',  name: 'สุรนิเวศ 3',  lat: 14.8959942, lng: 102.0139583 },
  { id: 'S4',  name: 'สุรนิเวศ 4',  lat: 14.8969495, lng: 102.0135816 },
  { id: 'S5',  name: 'สุรนิเวศ 5',  lat: 14.8975531, lng: 102.0131521 },
  { id: 'S6',  name: 'สุรนิเวศ 6',  lat: 14.8984927, lng: 102.0139835 },
  { id: 'S14', name: 'สุรนิเวศ 14', lat: 14.8967125, lng: 102.0156908 },
  { id: 'S15', name: 'สุรนิเวศ 15', lat: 14.8913324, lng: 102.01864   },
  { id: 'S16', name: 'สุรนิเวศ 16', lat: 14.8924539, lng: 102.0141511 },
  { id: 'S18', name: 'สุรนิเวศ 18', lat: 14.8926738, lng: 102.0121402 },
];
const MALE_DORMS = [
  { id: 'S7',  name: 'สุรนิเวศ 7',  lat: 14.8966281, lng: 102.0115634 },
  { id: 'S8',  name: 'สุรนิเวศ 8',  lat: 14.8964755, lng: 102.0106822 },
  { id: 'S9',  name: 'สุรนิเวศ 9',  lat: 14.8962976, lng: 102.0099874 },
  { id: 'S10', name: 'สุรนิเวศ 10', lat: 14.8957364, lng: 102.0096285 },
  { id: 'S11', name: 'สุรนิเวศ 11', lat: 14.898244,  lng: 102.0107364 },
  { id: 'S12', name: 'สุรนิเวศ 12', lat: 14.8975036, lng: 102.0104734 },
  { id: 'S13', name: 'สุรนิเวศ 13', lat: 14.89961,   lng: 102.0114359 },
  { id: 'S17', name: 'สุรนิเวศ 17', lat: 14.864124,  lng: 102.033928  },
];

const ALL_DORMS = [...FEMALE_DORMS, ...MALE_DORMS];
const DORM_SECTIONS = [
  { title: '🏠 หอพักหญิง', data: FEMALE_DORMS },
  { title: '🏠 หอพักชาย',  data: MALE_DORMS   },
];

// lookup by name
const DORM_COORDS: Record<string, { lat: number; lng: number }> = {};
ALL_DORMS.forEach(d => { DORM_COORDS[d.name] = { lat: d.lat, lng: d.lng }; });

export default function ReportScreen() {
  const auth = getAuth();

  const [selectedDorm, setSelectedDorm]   = useState('เลือกหอพัก');
  const [showDormPicker, setShowDormPicker] = useState(false);
  const [selectedRoom, setSelectedRoom]   = useState('');
  const [activeCategory, setActiveCategory] = useState('ประปา');
  const [issueTitle, setIssueTitle]       = useState('');
  const [detail, setDetail]               = useState('');
  const [images, setImages]               = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [markerCoord, setMarkerCoord]     = useState<any>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  useEffect(() => {
    (async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "Users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.dorm) handleSelectDorm(data.dorm);
          if (data.room) setSelectedRoom(data.room);
        }
      }
    })();
  }, []);

  const handleSelectDorm = (dormName: string) => {
    setSelectedDorm(dormName);
    setShowDormPicker(false);
    const coords = DORM_COORDS[dormName];
    if (coords) setMarkerCoord({ latitude: coords.lat, longitude: coords.lng });
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.5 });
    if (!result.canceled) setImages(prev => [...prev, result.assets[0].uri]);
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.5 });
    if (!result.canceled) setImages(prev => [...prev, result.assets[0].uri]);
  };

  const getLocation = async () => {
    setIsFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('แจ้งเตือน', 'กรุณาอนุญาตการเข้าถึงพิกัด'); return; }
      const loc = await Location.getCurrentPositionAsync({});
      setMarkerCoord({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setSelectedDorm('พิกัดปัจจุบัน (GPS)');
    } catch { Alert.alert('ผิดพลาด', 'ไม่สามารถดึงพิกัดได้');
    } finally { setIsFetchingLocation(false); }
  };

  const openInGoogleMaps = () => {
    if (!markerCoord) { Alert.alert("แจ้งเตือน", "กรุณาเลือกหอพักหรือดึงพิกัดก่อนครับ"); return; }
    const { latitude, longitude } = markerCoord;
    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}`,
      android: `google.navigation:q=${latitude},${longitude}`
    });
    if (url) Linking.openURL(url);
  };

  const handleSubmit = async () => {
    if (selectedDorm === 'เลือกหอพัก' || !selectedRoom || !detail || !issueTitle) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณาระบุข้อมูลและเลือกหอพักให้เรียบร้อย'); return;
    }
    try {
      setIsSubmitting(true);
      const user = auth.currentUser;
      if (!user) return;

      const uploadedUrls: string[] = [];
      for (const uri of images) {
        const blob: any = await new Promise((res, rej) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = () => res(xhr.response);
          xhr.onerror = () => rej(new TypeError("Network failed"));
          xhr.responseType = "blob";
          xhr.open("GET", uri, true);
          xhr.send(null);
        });
        const fileRef = ref(storage, `reports/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
        await uploadBytes(fileRef, blob);
        uploadedUrls.push(await getDownloadURL(fileRef));
        if (blob.close) blob.close();
      }

      const reportRes = await fetch(`${API_URL}/reports`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, title: issueTitle, category: activeCategory, detail, dorm: selectedDorm, room: selectedRoom, status: "รอดำเนินการ", images: uploadedUrls, locationCoords: markerCoord ? { lat: markerCoord.latitude, lng: markerCoord.longitude } : null })
      });
      const reportResult = await reportRes.json();
      if (!reportResult.success) throw new Error("Failed to create report");

      await fetch(`${API_URL}/users/${user.uid}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dorm: selectedDorm, room: selectedRoom })
      });

      const staffSnapshot = await getDocs(query(collection(db, "Users"), where("role", "in", ["admin", "technician"])));
      for (const staffDoc of staffSnapshot.docs) {
        await fetch(`${API_URL}/notifications`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUid: staffDoc.id, title: "มีคำร้องแจ้งซ่อมใหม่ 📢", body: `แจ้งปัญหา "${issueTitle}" ที่หอ ${selectedDorm} ห้อง ${selectedRoom}`, isRead: false, type: "new_request", jobId: reportResult.id })
        });
      }

      Alert.alert('สำเร็จ', 'ส่งคำร้องเรียบร้อยแล้ว', [{ text: 'ตกลง', onPress: () => router.replace('/(user)/(tabs)') }]);
    } catch (e) {
      console.error(e);
      Alert.alert('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally { setIsSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#F28C28" /></TouchableOpacity>
        <Text style={styles.headerTitle}><Text style={{color:'#F28C28'}}>SUT</Text> FixIt</Text>
        <View style={{width:24}}/>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.mainTitle}>แจ้งซ่อมแซม</Text>

        {/* สถานที่ */}
        <View style={styles.section}>
          <Text style={styles.label}>สถานที่เกิดปัญหา</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowDormPicker(true)}>
              <Text style={[styles.dropdownText, (selectedDorm === 'เลือกหอพัก' || selectedDorm === 'พิกัดปัจจุบัน (GPS)') && {color:'#9CA3AF'}]}>{selectedDorm}</Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280"/>
            </TouchableOpacity>
            <TextInput style={[styles.input,{marginTop:12}]} placeholder="ระบุเลขห้อง (เช่น 101)" value={selectedRoom} onChangeText={setSelectedRoom} keyboardType="numeric"/>
          </View>
        </View>

        {/* พิกัด */}
        <View style={styles.section}>
          <Text style={styles.label}>พิกัดสถานที่เกิดปัญหา</Text>
          <View style={[styles.card,{padding:20,alignItems:'center'}]}>
            <View style={{backgroundColor:'#FFF3E8',padding:15,borderRadius:50,marginBottom:15}}>
              <Ionicons name="location" size={32} color="#F28C28"/>
            </View>
            <Text style={{fontSize:16,fontWeight:'700',color:'#111827',marginBottom:5}}>
              {selectedDorm !== 'เลือกหอพัก' ? selectedDorm : 'ยังไม่ได้ระบุตำแหน่ง'}
            </Text>
            {markerCoord && (
              <Text style={{fontSize:12,color:'#6B7280',marginBottom:15}}>
                Lat: {markerCoord.latitude.toFixed(6)}, Lng: {markerCoord.longitude.toFixed(6)}
              </Text>
            )}
            <View style={{flexDirection:'row',width:'100%',gap:10}}>
              <TouchableOpacity style={[styles.gpsBtn,{flex:1,justifyContent:'center',backgroundColor:'#F3F4F6'}]} onPress={getLocation}>
                <Ionicons name="locate" size={20} color="#F28C28"/>
                <Text style={styles.gpsBtnText}>{isFetchingLocation ? "รอสักครู่..." : "พิกัดปัจจุบัน"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.gpsBtn,{flex:1,justifyContent:'center',backgroundColor:'#EBF3FF'}]} onPress={openInGoogleMaps}>
                <Ionicons name="map" size={18} color="#4285F4"/>
                <Text style={[styles.gpsBtnText,{color:'#4285F4'}]}>เปิดแผนที่</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ข้อมูลปัญหา */}
        <View style={styles.section}>
          <Text style={styles.label}>ข้อมูลปัญหา</Text>
          <TextInput 
  style={styles.input} 
  placeholder="หัวข้อปัญหา (เช่น แอร์ไม่เย็น)" 
  placeholderTextColor="#9CA3AF"
  value={issueTitle} 
  onChangeText={setIssueTitle}
/>
          <TextInput 
  style={[styles.input, styles.textArea, {marginTop:12}]} 
  multiline 
  placeholder="รายละเอียดเพิ่มเติม..." 
  placeholderTextColor="#9CA3AF" 
  value={detail} 
  onChangeText={setDetail}
/>
        </View>

        {/* หมวดหมู่ */}
        <View style={styles.section}>
          <Text style={styles.label}>หมวดหมู่</Text>
          <View style={styles.chipWrap}>
            {['ประปา','ไฟฟ้า','แอร์','เฟอร์นิเจอร์','อื่นๆ'].map(cat => (
              <TouchableOpacity key={cat} style={[styles.chip, activeCategory===cat && styles.chipActive]} onPress={() => setActiveCategory(cat)}>
                <Text style={[styles.chipText, activeCategory===cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ภาพ */}
        <View style={styles.section}>
          <Text style={styles.label}>ภาพประกอบ</Text>
          <View style={{flexDirection:'row',gap:10}}>
            <TouchableOpacity style={[styles.uploadBox,{flex:1}]} onPress={pickImage}>
              <Ionicons name="image" size={28} color="#F28C28"/><Text style={styles.uploadText}>คลังภาพ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.uploadBox,{flex:1}]} onPress={takePhoto}>
              <Ionicons name="camera" size={28} color="#F28C28"/><Text style={styles.uploadText}>ถ่ายรูป</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.previewRow}>
            {images.map((uri,i) => (
              <View key={i} style={styles.imageWrapper}>
                <Image source={{uri}} style={styles.previewImage}/>
                <TouchableOpacity style={styles.removeBtn} onPress={() => setImages(images.filter((_,idx) => idx!==i))}>
                  <Ionicons name="close-circle" size={20} color="#EF4444"/>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="#FFF"/> : <Text style={styles.submitButtonText}>ส่งคำร้องแจ้งซ่อม</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* ✅ Dorm Picker — SectionList แยกชาย/หญิง */}
      <Modal visible={showDormPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>เลือกหอพัก มทส.</Text>
            <SectionList
              sections={DORM_SECTIONS}
              keyExtractor={item => item.id}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section: { title } }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{title}</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.dormItem} onPress={() => handleSelectDorm(item.name)}>
                  <Text style={[styles.dormItemText, selectedDorm===item.name && {color:'#F28C28',fontWeight:'800'}]}>{item.name}</Text>
                  {selectedDorm===item.name && <Ionicons name="checkmark" size={18} color="#F28C28"/>}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeModal} onPress={() => setShowDormPicker(false)}>
              <Text style={styles.closeModalText}>ปิด</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex:1, backgroundColor:'#F9FAFB' },
  headerBar: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, backgroundColor:'#FFF', borderBottomWidth:1, borderBottomColor:'#EEE' },
  headerTitle: { fontSize:18, fontWeight:'700' },
  scrollContent: { padding:20 },
  mainTitle: { fontSize:24, fontWeight:'700', marginBottom:20 },
  section: { marginBottom:20 },
  label: { fontSize:16, fontWeight:'600', marginBottom:8, color:'#374151' },
  card: { backgroundColor:'#FFF', padding:15, borderRadius:16, borderWidth:1, borderColor:'#E5E7EB' },
  input: { backgroundColor:'#FFF', padding:15, borderRadius:12, borderWidth:1, borderColor:'#D1D5DB', color:'#111827' },
  textArea: { minHeight:100, textAlignVertical:'top', paddingTop:15 },
  dropdown: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'#FFF', padding:15, borderRadius:12, borderWidth:1, borderColor:'#D1D5DB' },
  dropdownText: { fontSize:15, color:'#111827', fontWeight:'600' },
  gpsBtn: { backgroundColor:'#FFF', flexDirection:'row', padding:12, borderRadius:8, alignItems:'center' },
  gpsBtnText: { color:'#F28C28', fontWeight:'700', marginLeft:5, fontSize:13 },
  chipWrap: { flexDirection:'row', flexWrap:'wrap', gap:8 },
  chip: { paddingVertical:10, paddingHorizontal:15, borderRadius:20, backgroundColor:'#FFF', borderWidth:1, borderColor:'#D1D5DB' },
  chipActive: { backgroundColor:'#F28C28', borderColor:'#F28C28' },
  chipText: { color:'#4B5563', fontWeight:'600' },
  chipTextActive: { color:'#FFF' },
  uploadBox: { borderStyle:'dashed', borderWidth:2, borderColor:'#F28C28', borderRadius:16, padding:15, alignItems:'center', backgroundColor:'#FFF' },
  uploadText: { color:'#F28C28', fontWeight:'700', marginTop:5 },
  previewRow: { flexDirection:'row', flexWrap:'wrap', gap:10, marginTop:10 },
  imageWrapper: { position:'relative' },
  previewImage: { width:70, height:70, borderRadius:10 },
  removeBtn: { position:'absolute', top:-5, right:-5 },
  submitButton: { backgroundColor:'#F28C28', padding:18, borderRadius:16, alignItems:'center', marginTop:10, marginBottom:30 },
  submitButtonText: { color:'#FFF', fontSize:18, fontWeight:'700' },
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  modalContent: { backgroundColor:'#FFF', borderTopLeftRadius:25, borderTopRightRadius:25, padding:20, maxHeight:'75%' },
  modalTitle: { fontSize:20, fontWeight:'800', marginBottom:10, textAlign:'center', color:'#111827' },
  sectionHeader: { backgroundColor:'#FFF3E8', paddingVertical:8, paddingHorizontal:12, borderRadius:8, marginVertical:5 },
  sectionHeaderText: { fontSize:13, fontWeight:'800', color:'#F28C28' },
  dormItem: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:16, borderBottomWidth:1, borderBottomColor:'#F3F4F6' },
  dormItemText: { fontSize:16, color:'#374151', fontWeight:'600' },
  closeModal: { marginTop:12, padding:16, backgroundColor:'#F3F4F6', borderRadius:12 },
  closeModalText: { textAlign:'center', fontWeight:'700', color:'#374151' },
});
