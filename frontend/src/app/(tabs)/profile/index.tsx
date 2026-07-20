import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "../../../services/users";
import { useAuthStore } from "../../../stores/authStore";
import { Colors, Spacing, FontSize, FontWeight, Radius, Shadows } from "../../../constants/theme";
import type { UserProfile } from "../../../types/api";

function getInitial(name: string): string {
  return name?.charAt(0)?.toUpperCase() || "?";
}

// ── Main Screen ────────────────────────────────────────
export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuthStore();

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery<UserProfile>({
    queryKey: ["myProfile"],
    queryFn: getMyProfile,
    enabled: isAuthenticated,
  });

  const handleLogout = useCallback(() => {
    Alert.alert("退出登录", "确定要退出当前账户吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "退出",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }, [logout]);

  const displayName = profile?.nickname || user?.nickname || "未登录";
  const displayBio = profile?.bio || "生刻用户";
  const avatarChar = getInitial(displayName);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {!isAuthenticated ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>请先登录</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.loginButtonText}>去登录</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>加载失败</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.retryText}>点击重试</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* ── User Info Header ── */}
          <View style={styles.header}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{avatarChar}</Text>
              </View>
            )}

            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.bio}>{displayBio}</Text>

            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {profile?.moment_count ?? 0}
                </Text>
                <Text style={styles.statLabel}>生刻</Text>
              </View>
              <TouchableOpacity style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {profile?.following_count ?? 0}
                </Text>
                <Text style={styles.statLabel}>关注</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {profile?.follower_count ?? 0}
                </Text>
                <Text style={styles.statLabel}>粉丝</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Menu ── */}
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>📁 我的合集</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/ai/mood-report")}
            >
              <Text style={styles.menuText}>📊 情绪报告</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/(tabs)/profile/settings")}
            >
              <Text style={styles.menuText}>⚙️ 设置</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Text style={[styles.menuText, { color: Colors.error }]}>
                🚪 退出登录
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.bg,
  },
  header: {
    alignItems: "center",
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.page,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.bgTertiary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  name: {
    fontSize: FontSize.heading1,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  bio: {
    fontSize: FontSize.body,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  stats: {
    flexDirection: "row",
    marginTop: Spacing.lg,
    gap: Spacing.xxl,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: FontSize.heading3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSize.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  menu: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.page,
    ...Shadows.sm,
  },
  menuItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  menuDivider: {
    height: 0.5,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing.lg,
  },
  menuText: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: FontSize.bodyLarge,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.full,
  },
  loginButtonText: {
    fontSize: FontSize.body,
    color: Colors.textInverse,
    fontWeight: FontWeight.semibold,
  },
  errorText: {
    fontSize: FontSize.body,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  retryText: {
    fontSize: FontSize.body,
    color: Colors.textAccent,
    fontWeight: FontWeight.semibold,
  },
});
