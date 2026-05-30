// นำเข้าฟังก์ชันพื้นฐานที่จำเป็นจาก Firebase SDK
// นำเข้าฟังก์ชันพื้นฐานที่จำเป็นจาก Firebase SDK
import { initializeApp } from "firebase/app";
import { initializeAuth } from 'firebase/auth';
// @ts-ignore: ปิดแจ้งเตือนบั๊ก TypeScript ของ Firebase
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';

// ข้อมูลกุญแจเชื่อมต่อโปรเจกต์ SUT FixIt ของคุณ
const firebaseConfig = {
  apiKey: "AIzaSyBa4R2tKYONQUlXJQCEeFFN7bDuPGKc_yM",
  authDomain: "sut-fixit.firebaseapp.com",
  projectId: "sut-fixit",
  storageBucket: "sut-fixit.firebasestorage.app",
  messagingSenderId: "970010466359",
  appId: "1:970010466359:web:a97e92fd952242fcb0c7b2"
};

// สั่งให้ Firebase เริ่มต้นทำงานด้วยกุญแจด้านบน
const app = initializeApp(firebaseConfig);

// 🚀 สร้างตัวแปร Auth โดยสั่งให้จำการล็อกอินฝังไว้ในเครื่อง (AsyncStorage)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// สร้างตัวแปร Database และ Storage
const db = getFirestore(app);
const storage = getStorage(app); 

console.log("Firebase เชื่อมต่อและตั้งค่าการจำล็อกอินสำเร็จแล้ว!");

// ✅ ส่งออก (Export) ตัวแปรทั้งหมดไปให้หน้าจออื่นๆ ในแอปดึงไปใช้งาน
export { auth, db, storage, app };