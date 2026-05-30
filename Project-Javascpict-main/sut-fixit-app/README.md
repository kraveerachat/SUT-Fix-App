# 🔧 SUT FixIt — ระบบจัดการงานซ่อมบำรุงหอพัก

ระบบแอปพลิเคชันจัดการงานซ่อมบำรุงหอพักสำหรับมหาวิทยาลัยเทคโนโลยีสุรนารี พัฒนาด้วย React Native (Expo) เชื่อมต่อผ่าน Cloud API (Render) และระบบฐานข้อมูล Real-time (Firebase)

> *โครงการนี้เป็นส่วนหนึ่งของวิชา 1101103 โครงงานการพัฒนาโปรแกรมประยุกต์ด้วยภาษาสคริปต์ ภาคการศึกษาที่ 3/2568 มหาวิทยาลัยเทคโนโลยีสุรนารี*

---

## 📲 ดาวน์โหลด APK

| ช่องทาง | ลิ้งก์ |
| :--- | :--- |
| **Expo Build (ล่าสุด)** | [ดาวน์โหลด APK ที่นี่](https://expo.dev/accounts/kittipatmusic/projects/sut-fixit-app/builds/4d3509e2-466c-4347-8afc-780381ad18f4) |

> ⚠️ ต้องเปิดใช้งาน **"ติดตั้งแอปจากแหล่งที่ไม่รู้จัก"** ในการตั้งค่า Android ก่อนติดตั้ง

---

## 👥 ทีมพัฒนา

| รหัสนักศึกษา | ชื่อ-นามสกุล |
| :---: | :--- |
| B6701635 | นายกิตติภัทร์ จันทศิลา |
| B6702861 | นายนฤเบศ แสงประทุม |
| B6703165 | นายวิธวินท์ ระวังจังหรีด |
| B6703271 | นายชิติพัทธ์ สีสุด |
| B6703370 | นายวีรฉัตร จินะปริวัตอาภรณ์ |

---

## 📋 สารบัญ
1. [สถาปัตยกรรมระบบ](#️-สถาปัตยกรรมระบบ)
2. [ผู้ใช้งาน 3 กลุ่มและฟีเจอร์](#-ผู้ใช้งาน-3-กลุ่มและฟีเจอร์เด่น)
3. [Tech Stack](#️-tech-stack--dependencies)
4. [CRUD Analysis](#-การวิเคราะห์การจัดการข้อมูล-crud-analysis)
5. [API Endpoints](#-api-endpoints-backend)
6. [โครงสร้างฐานข้อมูล](#️-โครงสร้างฐานข้อมูล-firestore)
7. [การติดตั้ง](#-การติดตั้งและใช้งาน)
8. [โครงสร้างโปรเจกต์](#-โครงสร้างโปรเจกต์)
9. [Known Issues](#-known-issues)
10. [หมายเหตุ](#️-หมายเหตุและข้อควรระวัง)

---

## 🏗️ สถาปัตยกรรมระบบ

โครงการออกแบบในรูปแบบ **3-Tier Architecture**:

```
┌──────────────────────┐    HTTPS     ┌──────────────────────┐   Admin SDK   ┌─────────────────────┐
│   React Native App   │ ───────────► │  Node.js / Express   │ ────────────► │  Firebase           │
│   (Expo Router)      │              │  (Render.com)        │               │  Firestore / Auth   │
│   iOS & Android      │ ◄─────────── │  REST API            │ ◄──────────── │  Cloud Storage      │
└──────────────────────┘  JSON resp   └──────────────────────┘   realtime    └─────────────────────┘
```

| Layer | Technology | หน้าที่ |
| :--- | :--- | :--- |
| **Frontend** | React Native (Expo Router) | UI/UX, GPS, Camera |
| **Backend** | Node.js/Express บน Render.com | API Gateway (HTTPS) |
| **Database** | Firebase Firestore | เก็บข้อมูลเชิงโครงสร้าง |
| **Auth** | Firebase Authentication | ระบบสมาชิก |
| **Storage** | Firebase Cloud Storage | รูปภาพแจ้งซ่อม |

---

## 👤 ผู้ใช้งาน 3 กลุ่มและฟีเจอร์เด่น

### 🎓 นักศึกษา (Student)
- **แจ้งซ่อม:** เลือกหมวดหมู่ (ประปา/ไฟฟ้า/แอร์/เฟอร์นิเจอร์), ระบุห้องพัก, แนบภาพถ่าย
- **Coordinate Card:** แสดงพิกัด Lat/Lng พร้อมปุ่มนำทางด้วย Google Maps (Deep Link)
- **ติดตามสถานะ Real-time:** รอดำเนินการ → กำลังซ่อม → รอตรวจสอบ → เสร็จสิ้น
- **ประวัติการซ่อม:** ดูรายการย้อนหลัง พร้อมรูปก่อน-หลังซ่อม
- **รีวิว:** ให้คะแนน 1-5 ดาว (คุณภาพ + ความรวดเร็ว) พร้อมข้อเสนอแนะ

### 🔨 ช่างซ่อมบำรุง (Technician)
- **คิวงาน:** รับงาน (Accept) / ปฏิเสธงาน พร้อมส่งแจ้งเตือนอัตโนมัติ
- **Filter:** กรองงานตามวันที่ / หอพัก / เรียงลำดับใหม่-เก่า
- **ปิดงาน:** ถ่ายภาพหลังซ่อม (หลายรูปได้), ระบุรายละเอียด, บันทึกค่าวัสดุ
- **สถิติ:** ดูยอดงานและคะแนนรีวิวของตัวเอง

### ⚙️ ผู้ดูแลระบบ (Admin)
- **Dashboard:** ภาพรวมงานซ่อมทั้งหมด + Filter 4 แบบ (วันที่/หอพัก/ประเภท/เรียงลำดับ)
- **ตรวจงาน (QC):** ดูภาพก่อน-หลังซ่อม, ข้อมูลช่าง, ค่าวัสดุ → อนุมัติหรือลบ
- **สถิติ:** Top 3 หอพักแจ้งซ่อมสูงสุด, Top 3 ช่างปิดงานสูงสุด (KPI)
- **จัดการรีวิว:** ลบคอมเมนต์ไม่เหมาะสม + ซ่อนประวัติจากช่าง

---

## 🛠️ Tech Stack & Dependencies

| Category | Package | Version |
| :--- | :--- | :--- |
| **Core** | expo | ~54.0.33 |
| **Language** | TypeScript | ~5.x |
| **Framework** | react-native | 0.81.5 |
| **Navigation** | expo-router | ~6.0.23 |
| **Auth** | firebase | ^12.11.0 |
| **GPS** | expo-location | ~19.0.8 |
| **Camera** | expo-image-picker | ~17.0.10 |
| **Icons** | @expo/vector-icons | ^15.0.3 |
| **Charts** | react-native-chart-kit | ^6.12.0 |
| **Maps** | react-native-maps | 1.20.1 |
| **Deep Link** | expo-linking | ~8.0.11 |
| **Build** | EAS Build (Expo) | — |
| **API Host** | Render.com | Free Tier |

---

## 📊 การวิเคราะห์การจัดการข้อมูล (CRUD Analysis)

ระบบมีการจัดการข้อมูลครบ **14 จุด** ใน 3 Collections (Reports, Users, Notifications):

### ✅ Create — 3 จุด
| จุด | ไฟล์ | รายละเอียด |
| :---: | :--- | :--- |
| 1 | `(user)/report.tsx` | `POST /api/reports` — สร้างใบแจ้งซ่อมใหม่ |
| 2 | `report.tsx`, `task-detail.tsx` | `POST /api/notifications` — ส่งแจ้งเตือนหาช่าง/Admin/User |
| 3 | `register.tsx` | `setDoc(Users)` — สร้างบัญชีผู้ใช้ใหม่ใน Firestore |

### ✅ Read / Fetching — 3 จุด
| จุด | ไฟล์ | รายละเอียด |
| :---: | :--- | :--- |
| 1 | `admin/index.tsx`, `review.tsx` | `GET /api/reports` — ดึงรายการซ่อมผ่าน API |
| 2 | `index.tsx`, `profile.tsx`, `history.tsx` | `onSnapshot(Users)` — ข้อมูลผู้ใช้ Real-time |
| 3 | `notification.tsx` (user/tech/admin) | `onSnapshot(Notifications)` — แจ้งเตือน Real-time |

### ✅ Update — 3 จุด
| จุด | ไฟล์ | รายละเอียด |
| :---: | :--- | :--- |
| 1 | `task-detail.tsx`, `admin/index.tsx` | `PUT /api/reports/:id` — อัปเดตสถานะงาน |
| 2 | `report.tsx`, `settings.tsx` | `PUT /api/users/:uid` — อัปเดตข้อมูลผู้ใช้/การแจ้งเตือน |
| 3 | `notification.tsx` | `updateDoc` / `writeBatch` — อ่านแจ้งเตือน (isRead:true) |

### ✅ Delete — 5 จุด
| จุด | ไฟล์ | รายละเอียด |
| :---: | :--- | :--- |
| 1 | `(user)/index.tsx`, `history.tsx` | `deleteDoc(Reports)` + `deleteObject(Storage)` — User ยกเลิกคำร้อง |
| 2 | `server.js` (Backend) | `DELETE /api/notifications/:id` — ลบ Notification |
| 3 | `admin/history.tsx` | `updateDoc(rating.comment='', hideFromTech:true)` — ลบคอมเมนต์รีวิว |
| 4 | `admin/index.tsx` | `DELETE /api/reports/:id` — Admin ลบงานจาก Dashboard |
| 5 | `admin/review.tsx` | `DELETE /api/reports/:id` — Admin ลบงานจากหน้าตรวจงาน |

---

## 🌐 API Endpoints (Backend)

Backend ทำงานอยู่ที่: `https://sut-fixit-api.onrender.com/api`

| Method | Endpoint | คำอธิบาย |
| :---: | :--- | :--- |
| `GET` | `/reports` | ดึงรายการแจ้งซ่อมทั้งหมด |
| `GET` | `/reports/:id` | ดึงรายละเอียดแจ้งซ่อมตาม ID |
| `POST` | `/reports` | สร้างใบแจ้งซ่อมใหม่ |
| `PUT` | `/reports/:id` | อัปเดตสถานะ/ข้อมูลงานซ่อม |
| `DELETE` | `/reports/:id` | ลบใบแจ้งซ่อม |
| `GET` | `/users/:uid` | ดึงข้อมูลผู้ใช้ |
| `PUT` | `/users/:uid` | อัปเดตข้อมูลผู้ใช้ |
| `POST` | `/notifications` | สร้างการแจ้งเตือนใหม่ |
| `DELETE` | `/notifications/:id` | ลบการแจ้งเตือน |

---

## 🗄️ โครงสร้างฐานข้อมูล (Firestore)

```
Firestore
├── Users/{userId}
│   ├── uid, email, fullName, studentId, phone
│   ├── role: "student" | "technician" | "admin"
│   ├── dorm, room
│   └── pushEnabled: boolean
│
├── Reports/{reportId}
│   ├── userId, title, category, detail
│   ├── dorm, room, locationCoords: { lat, lng }
│   ├── status: "รอดำเนินการ" | "กำลังดำเนินการ" | "รอตรวจสอบ" | "เสร็จสิ้น"
│   ├── images[], afterImages[]
│   ├── techId, closingDetail, materialCost
│   ├── rating: { quality, speed, comment }
│   └── hideFromTech: boolean
│
└── Notifications/{notifId}
    ├── targetUid, title, body
    ├── isRead: boolean
    ├── type: "new_request" | "repair_completed" | "admin_approved" | ...
    ├── category, jobId
    └── createdAt
```

---

## 🚀 การติดตั้งและใช้งาน

### Prerequisites
- Node.js >= 18
- npm หรือ yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)

### 1. Clone โปรเจกต์
```bash
git clone https://github.com/Kittipat050871/sut-fixit-app.git
cd sut-fixit-app
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่า API
ไฟล์ `constants/api.ts` — ใช้ Production URL สำหรับ APK:
```typescript
export const API_URL = "https://sut-fixit-api.onrender.com/api";
```

### 4. ตั้งค่า Firebase
สร้างไฟล์ `constants/firebaseConfig.ts` และใส่ค่าจาก Firebase Console:
```typescript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

### 5. รันแอป (Development)
```bash
npx expo start
# สแกน QR ด้วย Expo Go บนมือถือ
# หรือกด 'a' สำหรับ Android Emulator
```

### 6. Build APK (Production)
```bash
eas build -p android --profile preview
```

---

## 📁 โครงสร้างโปรเจกต์

```
sut-fixit-app/
├── app/
│   ├── (admin)/
│   │   ├── (tabs)/          # Dashboard, Review, History, Statistics, Settings
│   │   └── notifications.tsx
│   ├── (technician)/
│   │   ├── (tabs)/          # Index, Tasks, History, Statistics, Settings
│   │   ├── task-detail.tsx
│   │   ├── job-request-detail.tsx
│   │   └── notification.tsx
│   ├── (user)/
│   │   ├── (tabs)/          # Index, History, Notification, Profile
│   │   ├── report.tsx
│   │   ├── edit-report.tsx
│   │   └── service-completed.tsx
│   ├── login.tsx
│   ├── register.tsx
│   └── forgot-password.tsx
├── components/
│   ├── CustomButton.tsx
│   └── CustomTextInput.tsx
├── constants/
│   ├── api.ts               # API_URL (Render.com)
│   └── firebaseConfig.ts    # Firebase SDK Config
└── assets/
    └── images/              # App icons, logo
```

---

## ⚠️ Known Issues

| ปัญหา | สาเหตุ | วิธีแก้ |
| :--- | :--- | :--- |
| API โหลดช้าครั้งแรก (~50 วิ) | Render Free Plan ทำให้ server หลับหลัง inactive | รอสักครู่แล้วลองใหม่ |
| expo doctor warning | Package version mismatch เล็กน้อย | ไม่กระทบการทำงาน |

---

## ⚠️ หมายเหตุและข้อควรระวัง

### 👨‍💻 สำหรับนักพัฒนา
1. **Security:** ห้าม commit ไฟล์ `firebaseConfig.ts` ที่มี API Key จริง ขึ้น Git โดยเด็ดขาด
2. **API URL:** ตรวจสอบให้แน่ใจว่า `constants/api.ts` ชี้ไปที่ Render URL ก่อน Build APK เสมอ
3. **Permissions:** `expo-location` และ `expo-image-picker` ต้องเรียก `requestPermissionsAsync()` ก่อนใช้งาน

### 🎓 สำหรับการนำเสนอ
1. **Render Cold Start:** API อาจช้าครั้งแรก ให้เปิด `https://sut-fixit-api.onrender.com/api/reports` ใน browser ก่อนนำเสนอ เพื่อ wake up server
2. **Coordinate Card:** ในเวอร์ชัน APK ใช้ระบบ Card แสดงพิกัด + ปุ่มเปิด Google Maps แทน MapView เพื่อความเสถียร
3. **Database Backup:** Export ข้อมูล Firestore เป็น JSON ไว้เป็น backup กรณี quota เต็มระหว่างนำเสนอ

---

## 📄 License

โครงการนี้จัดทำเพื่อการศึกษาเท่านั้น — มหาวิทยาลัยเทคโนโลยีสุรนารี © 2568
