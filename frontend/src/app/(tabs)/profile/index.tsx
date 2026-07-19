import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../stores/authStore";
import { router } from "expo-router";

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>G</Text>
        </View>
        <Text style={styles.name}>
          {isAuthenticated && user ? user.nickname : "未登录"}
        </Text>
        <Text style={styles.bio}>
          {isAuthenticated && user ? (user as any).bio || "生刻用户" : "请先登录"}
        </Text>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>生刻</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>关注</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>粉丝</Text>
          </View>
        </View>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>📁 我的合集</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>📊 情绪报告</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>⚙️ 设置</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Text style={[styles.menuText, { color: "#E74C3C" }]}>🚪 退出登录</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#fff",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4A90D9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: "700", color: "#fff" },
  name: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  bio: { fontSize: 14, color: "#999", marginTop: 4 },
  stats: {
    flexDirection: "row",
    marginTop: 20,
    gap: 40,
  },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  statLabel: { fontSize: 13, color: "#999", marginTop: 2 },
  menu: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 16,
  },
  menuItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  menuText: { fontSize: 16, color: "#333" },
});
