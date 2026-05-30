import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

// ข้อมูลพิกัดหอพัก (คงเดิมตามที่คุณมี)
const FEMALE_DORMS = [
  { id: 'S1', name: 'สุรนิเวศ 1', lat: 14.89527, lng: 102.0151836 },
  { id: 'S2', name: 'สุรนิเวศ 2', lat: 14.8960784, lng: 102.0135751 },
  { id: 'S3', name: 'สุรนิเวศ 3', lat: 14.8961225, lng: 102.0115534 },
  { id: 'S4', name: 'สุรนิเวศ 4', lat: 14.8970095, lng: 102.0124501 },
  { id: 'S5', name: 'สุรนิเวศ 5', lat: 14.8978117, lng: 102.0120178 },
  { id: 'S6', name: 'สุรนิเวศ 6', lat: 14.8984894, lng: 102.0126933 },
  { id: 'S14', name: 'สุรนิเวศ 14', lat: 14.8967175, lng: 102.0132709 },
  { id: 'S15', name: 'สุรนิเวศ 15', lat: 14.8914348, lng: 102.0162096 },
  { id: 'S16', name: 'สุรนิเวศ 16', lat: 14.892243, lng: 102.0118366 },
  { id: 'S18', name: 'สุรนิเวศ 18', lat: 14.8926039, lng: 102.012322 },
];

const MALE_DORMS = [
  { id: 'S7', name: 'สุรนิเวศ 7', lat: 14.8967987, lng: 102.0089029 },
  { id: 'S8', name: 'สุรนิเวศ 8', lat: 14.8965027, lng: 102.0082726 },
  { id: 'S9', name: 'สุรนิเวศ 9', lat: 14.896423, lng: 102.0073878 },
  { id: 'S10', name: 'สุรนิเวศ 10', lat: 14.8957828, lng: 102.007098 },
  { id: 'S11', name: 'สุรนิเวศ 11', lat: 14.8984056, lng: 102.0081753 },
  { id: 'S12', name: 'สุรนิเวศ 12', lat: 14.8975994, lng: 102.0079451 },
  { id: 'S13_UP', name: 'สุรนิเวศ 13 (โซนบน)', lat: 14.8987332, lng: 102.0126471 },
  { id: 'S13_DOWN', name: 'สุรนิเวศ 13 (โซนล่าง)', lat: 14.8996349, lng: 102.0115041 },
  { id: 'S17', name: 'สุรนิเวศ 17', lat: 14.864124, lng: 102.033928 },
];

const ALL_DORMS = [...FEMALE_DORMS, ...MALE_DORMS];

export default function SelectLocationScreen() {
  const [loading, setLoading] = useState(true);
  const [activeDorm, setActiveDorm] = useState<string | null>(null);
  const [address, setAddress] = useState('กำลังค้นหาพิกัด...');
  
  const [region, setRegion] = useState<Region>({
    latitude: 14.8950, longitude: 102.0120,
    latitudeDelta: 0.008, longitudeDelta: 0.008,
  });
  
  const [marker, setMarker] = useState({ latitude: 14.8950, longitude: 102.0120 });

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results.length > 0) {
        const place = results[0];
        setAddress(`${place.name || ''} ${place.district || ''}`.trim() || `พิกัด: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
    } catch {
      setAddress(`พิกัด: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLoading(false);
          return;
        }
        const current = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = current.coords;
        setRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 });
        setMarker({ latitude, longitude });
        await reverseGeocode(latitude, longitude);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleMapPress = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setActiveDorm(null);
    setMarker({ latitude, longitude });
    await reverseGeocode(latitude, longitude);
  };

  const handleSelectDorm = (dormId: string, lat: number, lng: number, name: string) => {
    setActiveDorm(dormId);
    setMarker({ latitude: lat, longitude: lng });
    setRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.002, longitudeDelta: 0.002 });
    setAddress(`มทส. (${name})`);
  };

  // ✅ ฟังก์ชันส่งพิกัดกลับไปที่หน้า Report
  const handleSave = () => {
    router.replace({
      pathname: '/report',
      params: { 
        latitude: marker.latitude.toString(),
        longitude: marker.longitude.toString(),
        address: address
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapArea}>
        <MapView style={StyleSheet.absoluteFillObject} region={region} onPress={handleMapPress} showsUserLocation={true}>
          <Marker coordinate={marker} pinColor="#F28C28" />
        </MapView>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#F28C28" />
          </View>
        )}
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.handleBar} />
        <Text style={styles.sheetTitle}>ระบุพิกัดที่เกิดปัญหา</Text>
        <View style={styles.addressBox}>
          <Ionicons name="location" size={24} color="#EF4444" style={styles.addressIcon} />
          <View style={styles.addressTextContainer}>
            <Text style={styles.addressLabel}>ตำแหน่งที่เลือก</Text>
            <Text style={styles.addressValue} numberOfLines={2}>{address}</Text>
          </View>
        </View>

        <View style={styles.dormListContainer}>
          <Text style={styles.dormLabel}>หอพักหญิง</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {FEMALE_DORMS.map((dorm) => (
              <TouchableOpacity key={dorm.id} style={[styles.dormChip, activeDorm === dorm.id && styles.dormChipActive]} onPress={() => handleSelectDorm(dorm.id, dorm.lat, dorm.lng, dorm.name)}>
                <Ionicons name="business" size={14} color={activeDorm === dorm.id ? '#FFFFFF' : '#EC4899'} />
                <Text style={[styles.dormChipText, activeDorm === dorm.id && styles.dormChipTextActive]}>{dorm.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.dormLabel, { marginTop: 12 }]}>หอพักชาย</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {MALE_DORMS.map((dorm) => (
              <TouchableOpacity key={dorm.id} style={[styles.dormChip, activeDorm === dorm.id && styles.dormChipActive]} onPress={() => handleSelectDorm(dorm.id, dorm.lat, dorm.lng, dorm.name)}>
                <Ionicons name="business" size={14} color={activeDorm === dorm.id ? '#FFFFFF' : '#3B82F6'} />
                <Text style={[styles.dormChipText, activeDorm === dorm.id && styles.dormChipTextActive]}>{dorm.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>ยืนยันพิกัดนี้</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  mapArea: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  bottomSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingBottom: 30, elevation: 20, shadowOpacity: 0.1 },
  handleBar: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#D1D5DB', marginVertical: 12 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16 },
  addressBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 14, marginBottom: 16 },
  addressIcon: { marginRight: 14 },
  addressTextContainer: { flex: 1 },
  addressLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  addressValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  dormListContainer: { marginBottom: 10 },
  dormLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  scrollContent: { gap: 8 },
  dormChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  dormChipActive: { backgroundColor: '#F28C28' },
  dormChipText: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginLeft: 6 },
  dormChipTextActive: { color: '#FFFFFF' },
  saveButton: { marginTop: 10, height: 56, backgroundColor: '#F28C28', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});