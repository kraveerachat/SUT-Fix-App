const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// 1. นำเข้ากุญแจ Firebase ของเรา
const serviceAccount = require('./serviceAccountKey.json');

// 2. เชื่อมต่อฐานข้อมูล
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 🟢 1. CREATE (Data Create)
// ==========================================
// แหล่งที่ 1: สร้างใบแจ้งซ่อมใหม่
app.post('/api/reports', async (req, res) => {
  try {
    const data = req.body;
    data.createdAt = new Date().toISOString();
    const docRef = await db.collection('Reports').add(data);
    res.status(201).json({ success: true, id: docRef.id, message: 'สร้างงานสำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// แหล่งที่ 2: สร้างการแจ้งเตือน
app.post('/api/notifications', async (req, res) => {
  try {
    const data = req.body;
    const docRef = await db.collection('Notifications').add(data);
    res.status(201).json({ success: true, id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 🔵 2. RETRIEVE (Data Retrieve)
// ==========================================
// แหล่งที่ 1: ดึงใบแจ้งซ่อมทั้งหมด
app.get('/api/reports', async (req, res) => {
  try {
    const snapshot = await db.collection('Reports').get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// แหล่งที่ 3: ดึงข้อมูลโปรไฟล์ผู้ใช้
app.get('/api/users/:uid', async (req, res) => {
  try {
    const userDoc = await db.collection('Users').doc(req.params.uid).get();
    res.status(200).json({ id: userDoc.id, ...userDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 🟡 3. UPDATE (Data Update)
// ==========================================
// แหล่งที่ 1: อัปเดตสถานะใบแจ้งซ่อม (เช่น ช่างกดรับงาน)
app.put('/api/reports/:id', async (req, res) => {
  try {
    await db.collection('Reports').doc(req.params.id).update(req.body);
    res.status(200).json({ success: true, message: 'อัปเดตงานสำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// แหล่งที่ 3: อัปเดตข้อมูลหอพักผู้ใช้
app.put('/api/users/:uid', async (req, res) => {
  try {
    await db.collection('Users').doc(req.params.uid).update(req.body);
    res.status(200).json({ success: true, message: 'อัปเดตโปรไฟล์สำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 🔴 4. DELETE (Data Delete)
// ==========================================
// แหล่งที่ 1: ลบใบแจ้งซ่อม (ยกเลิกงาน)
app.delete('/api/reports/:id', async (req, res) => {
  try {
    await db.collection('Reports').doc(req.params.id).delete();
    res.status(200).json({ success: true, message: 'ลบงานสำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// แหล่งที่ 2: ลบการแจ้งเตือน
app.delete('/api/notifications/:id', async (req, res) => {
  try {
    await db.collection('Notifications').doc(req.params.id).delete();
    res.status(200).json({ success: true, message: 'ลบการแจ้งเตือนสำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// เปิดเซิร์ฟเวอร์
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend API รันสำเร็จแล้วที่พอร์ต ${PORT}`);
});