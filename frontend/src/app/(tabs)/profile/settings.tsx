import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { getMyProfile, updateMyProfile, deleteAccount } from "../../../services/users";
import { Colors, Spacing, FontSize, Radius } from "../../../constants/theme";
import { useAuthStore } from "../../../stores/authStore";

const DARK_MODE_KEY = "shengke_dark_mode";

// ── Settings Screen ─────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  // ── Profile form state ──
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  // ── Load profile ──
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: getMyProfile,
  });

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  // Load dark mode preference
  useEffect(() => {
    SecureStore.getItemAsync(DARK_MODE_KEY).then((val) => {
      if (val === "true") setDarkMode(true);
    });
  }, []);

  // ── Save profile mutation ──
  const saveProfileMutation = useMutation({
    mutationFn: (data: { nickname: string; bio: string }) =>
      updateMyProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      Alert.alert("保存成功", "个人资料已更新");
    },
    onError: (err: Error) => {
      Alert.alert("保存失败", err.message || "请稍后重试");
    },
  });

  // ── Delete account mutation ──
  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      await logout();
      router.replace("/(auth)/login");
    },
    onError: (err: Error) => {
      Alert.alert("操作失败", err.message || "注销账号失败，请稍后重试");
    },
  });

  // ── Handlers ──
  const handleSaveProfile = useCallback(() => {
    if (!nickname.trim()) {
      Alert.alert("提示", "昵称不能为空");
      return;
    }
    saveProfileMutation.mutate({
      nickname: nickname.trim(),
      bio: bio.trim(),
    });
  }, [nickname, bio, saveProfileMutation]);

  const handleDarkModeToggle = useCallback(
    async (value: boolean) => {
      setDarkMode(value);
      await SecureStore.setItemAsync(DARK_MODE_KEY, value ? "true" : "false");
    },
    []
  );

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "确认注销",
      "注销后，你的所有数据将被永久删除且无法恢复。确定要继续吗？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "确认注销",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "再次确认",
              "此操作不可逆，你的所有生刻、评论和关系将被永久删除。",
              [
                { text: "取消", style: "cancel" },
                {
                  text: "确定注销",
                  style: "destructive",
                  onPress: () => deleteAccountMutation.mutate(),
                },
              ]
            );
          },
        },
      ]
    );
  }, [deleteAccountMutation]);

  const isSaving = saveProfileMutation.isPending;
  const isDeleting = deleteAccountMutation.isPending;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>设置</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ══ Section: 个人资料 ══ */}
          <Text style={styles.sectionTitle}>个人资料</Text>
          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>昵称</Text>
              <TextInput
                style={styles.input}
                placeholder="输入昵称"
                placeholderTextColor={Colors.textPlaceholder}
                value={nickname}
                onChangeText={setNickname}
                maxLength={30}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>简介</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="介绍一下自己..."
                placeholderTextColor={Colors.textPlaceholder}
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={200}
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <Text style={styles.primaryButtonText}>保存</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ══ Section: 偏好 ══ */}
          <Text style={styles.sectionTitle}>偏好</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="moon-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.settingLabel}>深色模式</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={handleDarkModeToggle}
                trackColor={{
                  false: Colors.borderLight,
                  true: Colors.primaryLight,
                }}
                thumbColor={darkMode ? Colors.primary : "#f4f3f4"}
              />
            </View>
          </View>

          {/* ══ Section: 账号安全 ══ */}
          <Text style={styles.sectionTitle}>账号安全</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => Alert.alert("提示", "修改密码功能即将上线")}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.settingLabel}>修改密码</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* ══ Section: 数据 ══ */}
          <Text style={styles.sectionTitle}>数据</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => Alert.alert("提示", "数据导出功能即将上线")}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="download-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.settingLabel}>导出数据</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* ══ Section: 危险操作 ══ */}
          <Text style={styles.sectionTitle}>危险操作</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.menuRow, styles.dangerRow]}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
                <Text style={styles.dangerLabel}>注销账号</Text>
              </View>
              {isDeleting ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={Colors.error} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },

  // ── Top Bar ──
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.textPrimary,
  },

  // ── Section ──
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
  },

  // ── Fields ──
  fieldGroup: {
    marginBottom: Spacing.sm,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textarea: {
    minHeight: 80,
    paddingTop: Spacing.sm,
  },
  divider: {
    height: 0.5,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },

  // ── Primary Button ──
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    color: Colors.textInverse,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // ── Setting Row (Switch) ──
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  settingLabel: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },

  // ── Menu Row (Chevron) ──
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  dangerRow: {
    paddingVertical: Spacing.sm,
  },
  dangerLabel: {
    fontSize: FontSize.md,
    color: Colors.error,
  },

  // ── Spacer ──
  spacer: {
    height: Spacing.xxl,
  },
});
