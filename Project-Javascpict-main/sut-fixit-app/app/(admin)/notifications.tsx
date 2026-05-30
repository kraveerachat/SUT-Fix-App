import { Ionicons } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getAuth } from "firebase/auth";
import {
  collection, doc, onSnapshot, query,
  updateDoc, where, writeBatch,
} from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
    return () => { navigation.getParent()?.setOptions({ tabBarStyle: undefined }); };
  }, []);

  const getIconConfig = (type: string, category?: string) => {
    if (type === "repair_completed" || type === "status_update")
      return { icon: "checkmark-circle", color: "#10B981", bg: "#D1FAE5" };
    if (type === "admin_approved")
      return { icon: "checkmark-done-circle", color: "#059669", bg: "#D1FAE5" };
    if (type === "new_request")
      return { icon: "warning", color: "#EF4444", bg: "#FDE8E8" };
    switch (category) {
      case "ประปา":        return { icon: "water",         color: "#3B82F6", bg: "#DBEAFE" };
      case "ไฟฟ้า":        return { icon: "flash",         color: "#EAB308", bg: "#FEF08A" };
      case "แอร์":         return { icon: "snow",          color: "#06B6D4", bg: "#CFFAFE" };
      case "เฟอร์นิเจอร์": return { icon: "bed",           color: "#8B5CF6", bg: "#EDE9FE" };
      default:             return { icon: "notifications",  color: "#F28C28", bg: "#FFF3E8" };
    }
  };

  // ── label บอก user ว่า tap แล้วจะไปไหน ────────────────────────────────
  const getDestinationLabel = (type: string) => {
    if (type === "new_request")                               return "ดูที่ Dashboard";
    if (type === "repair_completed" || type === "admin_approved") return "ดูที่ตรวจงาน";
    if (type === "status_update")                             return "ดูที่ประวัติ";
    return null;
  };

  useEffect(() => {
    const auth = getAuth();
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "Notifications"),
      where("targetUid", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => {
        const notif = docSnap.data();
        let rawDate = new Date();
        if (notif.createdAt) {
          rawDate = notif.createdAt.toDate
            ? notif.createdAt.toDate()
            : new Date(notif.createdAt);
        }

        const diffMs   = new Date().getTime() - rawDate.getTime();
        const diffMins = Math.round(diffMs / 60000);
        const diffHrs  = Math.round(diffMs / 3600000);
        const diffDays = Math.round(diffMs / 86400000);

        let timeStr = "เมื่อสักครู่";
        if (diffMins < 60)      timeStr = `${diffMins} นาทีที่แล้ว`;
        else if (diffHrs < 24)  timeStr = `${diffHrs} ชม.ที่แล้ว`;
        else                    timeStr = `${diffDays} วันที่แล้ว`;

        return {
          id: docSnap.id,
          title:    notif.title  || "มีการแจ้งเตือนใหม่",
          detail:   notif.body   || "",
          time:     timeStr,
          isUnread: !notif.isRead,
          bgColor:  notif.isRead ? "#FFFFFF" : "#FFF8F1",
          type:     notif.type,
          category: notif.category,
          jobId:    notif.jobId,
          rawDate,
        };
      });

      data.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
      setNotifications(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ Navigate ตาม type ──────────────────────────────────────────────────
  const handlePressNotification = async (item: any) => {
    try {
      // Mark as read ก่อน
      if (item.isUnread) {
        await updateDoc(doc(db, "Notifications", item.id), { isRead: true });
      }

      // Navigate ตาม type
      switch (item.type) {
        case "new_request":
          // งานใหม่ → Admin Dashboard (index)
          router.push("/(admin)/(tabs)" as any);
          break;

        case "repair_completed":
        case "admin_approved":
          // งานซ่อมเสร็จ/อนุมัติ → หน้าตรวจงาน (review)
          router.push("/(admin)/(tabs)/review" as any);
          break;

        case "status_update":
          // สถานะเปลี่ยน → ประวัติ
          router.push("/(admin)/(tabs)/history" as any);
          break;

        default:
          // type อื่นๆ → กลับหน้าก่อน
          router.back();
          break;
      }
    } catch (error) {
      console.error("Error handling notification:", error);
    }
  };

  const handleReadAll = async () => {
    try {
      const batch = writeBatch(db);
      let hasUnread = false;
      notifications.forEach((n) => {
        if (n.isUnread) {
          batch.update(doc(db, "Notifications", n.id), { isRead: true });
          hasUnread = true;
        }
      });
      if (hasUnread) await batch.commit();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={28} color="#F28C28" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>การแจ้งเตือน</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={handleReadAll}>
          <Text style={styles.readAllText}>อ่านทั้งหมด</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#F28C28" style={{ marginTop: 40 }} />
        ) : notifications.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 80 }}>
            <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
            <Text style={{ marginTop: 10, color: "#9CA3AF", fontSize: 16 }}>ไม่มีการแจ้งเตือนใหม่</Text>
          </View>
        ) : (
          notifications.map((item) => {
            const config  = getIconConfig(item.type, item.category);
            const destLabel = getDestinationLabel(item.type);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { backgroundColor: item.bgColor }]}
                onPress={() => handlePressNotification(item)}
                activeOpacity={0.7}
              >
                {/* Icon */}
                <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
                  <Ionicons name={config.icon as any} size={22} color={config.color} />
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    <View style={styles.timeBadgeRow}>
                      <Text style={styles.timeText}>{item.time}</Text>
                      {item.isUnread && <View style={styles.unreadDot} />}
                    </View>
                  </View>
                  <Text style={styles.detail}>{item.detail}</Text>

                  {/* ✅ Destination hint */}
                  {destLabel && (
                    <View style={styles.destRow}>
                      <Ionicons name="arrow-forward-circle-outline" size={13} color="#F28C28" />
                      <Text style={styles.destText}>{destLabel}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: Platform.OS === "android" ? 50 : 10,
    paddingBottom: 15, backgroundColor: "#FFFFFF",
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  headerCenter:  { flex: 1, paddingLeft: 15 },
  headerTitle:   { fontSize: 20, fontWeight: "bold", color: "#111827" },
  backButton:    { width: 30, justifyContent: "center", alignItems: "flex-start" },
  readAllText:   { color: "#F28C28", fontSize: 14, fontWeight: "600" },

  card: {
    flexDirection: "row", padding: 16,
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6", alignItems: "flex-start",
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center", marginRight: 15, marginTop: 2,
  },
  contentContainer: { flex: 1 },
  titleRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 4,
  },
  title:         { fontSize: 15, fontWeight: "bold", color: "#111827", flex: 1, marginRight: 8 },
  timeBadgeRow:  { flexDirection: "row", alignItems: "center", gap: 6 },
  timeText:      { fontSize: 11, color: "#9CA3AF" },
  unreadDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: "#3B82F6" },
  detail:        { fontSize: 13, color: "#4B5563", lineHeight: 20, marginBottom: 4 },

  // ✅ Destination hint row
  destRow:  { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  destText: { fontSize: 11, color: "#F28C28", fontWeight: "600" },
});
