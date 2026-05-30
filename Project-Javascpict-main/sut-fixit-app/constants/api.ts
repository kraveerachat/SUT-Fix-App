// ไฟล์ constants/api.ts

// ==========================================
// 🚀 1. สำหรับใช้งานจริง (Production) - ใช้ตัวนี้ตอน Build APK / ส่งอาจารย์
// ==========================================
export const API_URL = "https://sut-fixit-api.onrender.com/api";

// ==========================================
// 💻 2. สำหรับทดสอบบนเครื่องตัวเอง (Development) 
// (ถ้าจะกลับมาเทสต์แบบ Local ให้ลบ /* และ */ ออก แล้วไปคอมเมนต์บรรทัดข้างบนแทน)
// ==========================================
/*
const IP_MY_DORM = "192.168.1.167";    // IP หอตัวเอง
const IP_FRIEND_DORM = "192.168.1.48"; // IP หอเพื่อน (สมมติ)
const IP_UNIVERSITY = "10.0.110.216";  // IP มหาลัย (ถ้ามี)

// เลือกเปิดใช้ IP ปัจจุบัน (วิธีทำ: คอมเมนต์อันที่ไม่ได้ใช้)
const CURRENT_IP = IP_MY_DORM;
// const CURRENT_IP = IP_FRIEND_DORM;  
// const CURRENT_IP = IP_UNIVERSITY;

export const API_URL = `http://${CURRENT_IP}:3000/api`;
*/