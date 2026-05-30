import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
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
    Alert,
    Image,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from '../../constants/firebaseConfig'; 
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function PersonalInfoScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dorm, setDorm] = useState('');
  const [room, setRoom] = useState('');
  
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (currentUser) {
          const docRef = doc(db, "Users", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setStudentId(data.studentId || '');
            setEmail(data.email || '');
            setFullName(data.fullName || '');
            setPhone(data.phone || '');
            setDorm(data.dorm || '');
            setRoom(data.room || '');
            setProfileImage(data.profileImage || null); 
          } else {
             setEmail(currentUser.email || '');
          }
        }
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลส่วนตัว:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const uploadImageAsync = async (uri: string) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const storage = getStorage();
      // ✅ แก้ไข: เปลี่ยนชื่อโฟลเดอร์เป็น profile_user ตรงเป๊ะตามที่นายต้องการครับ
      const storageRef = ref(storage, `profile_user/${user.uid}.jpg`);
      console.log("🚀 Path ปลายทางคือ:", storageRef.fullPath); // เพิ่มบรรทัดนี้เพื่อเช็คในจอคอมนาย

      await uploadBytes(storageRef, blob);

      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const pickImage = async () => {
    if (!isEditing) return; 

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('แจ้งเตือน', 'แอปจำเป็นต้องเข้าถึงคลังรูปภาพเพื่อเปลี่ยนรูปโปรไฟล์');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5, 
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri); 
    }
  };

  const takePhoto = async () => {
    if (!isEditing) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('แจ้งเตือน', 'แอปจำเป็นต้องเข้าถึงกล้องเพื่อถ่ายรูปโปรไฟล์');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri); 
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true); 
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (currentUser) {
        let finalImageUrl = profileImage;

        if (profileImage && profileImage.startsWith('file://')) {
          const uploadedUrl = await uploadImageAsync(profileImage);
          if (uploadedUrl) {
            finalImageUrl = uploadedUrl;
          }
        }

        const docRef = doc(db, "Users", currentUser.uid);
        
        await setDoc(docRef, {
          fullName: (fullName || '').trim(),
          phone: (phone || '').trim(),
          dorm: (dorm || '').trim(),
          room: (room || '').trim(),
          email: currentUser.email,
          profileImage: finalImageUrl, 
        }, { merge: true });
        
        setProfileImage(finalImageUrl); 
        Alert.alert("สำเร็จ", "อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว");
        setIsEditing(false);
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการบันทึก:", error);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่");
    } finally {
      setIsSaving(false); 
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={28} color="#F28C28" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ข้อมูลส่วนตัว</Text>
          <View style={styles.headerRight}>
            {!isEditing && !loading && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
             <ActivityIndicator size="large" color="#F28C28" />
             <Text style={{ marginTop: 10, color: '#6B7280' }}>กำลังโหลดข้อมูล...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            <View style={styles.avatarSection}>
              <TouchableOpacity style={styles.avatarWrapper} activeOpacity={isEditing ? 0.7 : 1} onPress={pickImage}>
                <View style={styles.avatarCircle}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={50} color="#F28C28" />
                  )}
                </View>
                {isEditing && (
                  <View style={styles.editAvatarBtn}>
                    <Ionicons name="image" size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
              
              {isEditing && <Text style={styles.changePhotoText}>แตะเพื่อเปลี่ยนรูปโปรไฟล์</Text>}
              
              {isEditing && (
                <TouchableOpacity onPress={takePhoto} style={styles.cameraBtn} activeOpacity={0.7}>
                  <Ionicons name="camera" size={18} color="#10B981" />
                  <Text style={styles.cameraBtnText}>ถ่ายรูปจากกล้อง</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>รหัสนักศึกษา</Text>
                <View style={[styles.input, styles.inputLocked]}>
                  <Text style={styles.lockedText}>{studentId || '-'}</Text>
                  <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>ชื่อ-นามสกุล</Text>
                <TextInput 
                  style={[styles.input, !isEditing && styles.inputReadOnly]} 
                  value={fullName} 
                  onChangeText={setFullName} 
                  editable={isEditing && !isSaving} 
                  placeholder={isEditing ? "กรอกชื่อ-นามสกุล" : "ยังไม่ระบุ"}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>เบอร์โทรศัพท์</Text>
                <TextInput 
                  style={[styles.input, !isEditing && styles.inputReadOnly]} 
                  value={phone} 
                  onChangeText={setPhone} 
                  keyboardType="phone-pad"
                  editable={isEditing && !isSaving}
                  placeholder="08X-XXX-XXXX"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>อีเมล</Text>
                <View style={[styles.input, styles.inputLocked]}>
                  <Text style={styles.lockedText}>{email || '-'}</Text>
                  <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.rowInput}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={styles.label}>หอพัก</Text>
                  <TextInput 
                    style={[styles.input, !isEditing && styles.inputReadOnly]} 
                    value={dorm} 
                    onChangeText={setDorm} 
                    editable={isEditing && !isSaving}
                    placeholder={isEditing ? "กรอกชื่อหอพัก" : "ยังไม่ระบุ"}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 0.6 }]}>
                  <Text style={styles.label}>ห้อง</Text>
                  <TextInput 
                    style={[styles.input, !isEditing && styles.inputReadOnly]} 
                    value={room} 
                    onChangeText={setRoom} 
                    editable={isEditing && !isSaving}
                    placeholder={isEditing ? "เลขห้อง" : "-"}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>

            {isEditing ? (
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  activeOpacity={0.8}
                  onPress={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>ยกเลิก</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.saveButton, isSaving && { opacity: 0.7 }]} 
                  activeOpacity={0.8}
                  onPress={handleSaveProfile} 
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>บันทึกข้อมูล</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8} onPress={() => setIsEditing(true)}>
                <Text style={styles.primaryButtonText}>แก้ไขข้อมูลส่วนตัว</Text>
              </TouchableOpacity>
            )}

          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB', zIndex: 10,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerRight: { width: 44, alignItems: 'flex-end', justifyContent: 'center' }, 
  scrollContent: { flexGrow: 1, paddingBottom: 40, paddingHorizontal: 20 },
  avatarSection: { alignItems: 'center', marginTop: 24, marginBottom: 24 },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatarCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFF3E8',
    justifyContent: 'center', alignItems: 'center', borderWidth: 3,
    borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 4, overflow: 'hidden' 
  },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  editAvatarBtn: {
    position: 'absolute', bottom: 0, right: 0, width: 32, height: 32,
    borderRadius: 16, backgroundColor: '#F28C28', justifyContent: 'center',
    alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF',
  },
  changePhotoText: { fontSize: 14, fontWeight: '600', color: '#F28C28' },
  cameraBtn: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: '#ECFDF5',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#D1FAE5'
  },
  cameraBtnText: { fontSize: 14, fontWeight: '600', color: '#10B981', marginLeft: 6 },
  formCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
    elevation: 2, borderWidth: 1, borderColor: '#F3F4F6',
  },
  inputGroup: { marginBottom: 16 },
  rowInput: { flexDirection: 'row' },
  label: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 8, marginLeft: 4 },
  input: {
    width: '100%', height: 52, backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingHorizontal: 16, fontSize: 15, color: '#111827', borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputReadOnly: { backgroundColor: '#F9FAFB', borderColor: 'transparent', color: '#4B5563' },
  inputLocked: {
    backgroundColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderColor: 'transparent',
  },
  lockedText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10, marginBottom: 20 },
  primaryButton: {
    marginTop: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
    height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
  },
  primaryButtonText: { color: '#374151', fontSize: 16, fontWeight: '700' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  cancelButton: {
    flex: 1, backgroundColor: '#F3F4F6', height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  cancelButtonText: { color: '#4B5563', fontSize: 16, fontWeight: '700' },
  saveButton: {
    flex: 1, backgroundColor: '#F28C28', height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', shadowColor: '#F28C28',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});