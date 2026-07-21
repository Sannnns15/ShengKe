import React, { useState, useCallback, useEffect, useRef } from "react"
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
  Image,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Ionicons } from "@expo/vector-icons"
import * as SecureStore from "expo-secure-store"
import { getMyProfile, updateMyProfile, deleteAccount } from "../../../services/users"
import { getMySettings, updateMySettings } from "../../../services/userSettings"
import { uploadMedia, uploadMediaDirect } from "../../../services/media"
import { requestExport, getExportStatus, getDownloadUrl } from "../../../services/export"
import type { ExportTask, ExportStatus } from "../../../services/export"
import { useImagePicker } from "../../../hooks/useImagePicker"
import { Colors, Spacing, FontSize, FontWeight, Radius } from "../../../constants/theme"
import * as Linking from "expo-linking"
import { useAuthStore } from "../../../stores/authStore"

const DARK_MODE_KEY = "shengke_dark_mode"

const PRIVACY_OPTIONS = [
  { label: "仅自己", value: 0 },
  { label: "好友", value: 1 },
  { label: "互关", value: 2 },
  { label: "公开", value: 3 },
]

// ── Settings Screen ─────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { logout } = useAuthStore()

  // ── Profile form state ──
  const [nickname, setNickname] = useState("")
  const [bio, setBio] = useState("")
  const [darkMode, setDarkMode] = useState(false)

  // ── User settings state ──
  const [notificationEnabled, setNotificationEnabled] = useState(true)
  const [privacyDefault, setPrivacyDefault] = useState(3)

  // ── Load profile ──
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: getMyProfile,
  })

  // ── Load user settings ──
  const { data: userSettings } = useQuery({
    queryKey: ["mySettings"],
    queryFn: getMySettings,
  })

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname ?? "")
      setBio(profile.bio ?? "")
    }
  }, [profile])

  useEffect(() => {
    if (userSettings) {
      setNotificationEnabled(userSettings.notification_enabled)
      setPrivacyDefault(userSettings.privacy_default)
    }
  }, [userSettings])

  // Load dark mode preference
  useEffect(() => {
    SecureStore.getItemAsync(DARK_MODE_KEY).then((val) => {
      if (val === "true") setDarkMode(true)
    })
  }, [])

  // ── Image picker ──
  const imagePicker = useImagePicker()
  const [avatarUploading, setAvatarUploading] = useState(false)

  // ── Save profile mutation ──
  const saveProfileMutation = useMutation({
    mutationFn: (data: { nickname: string; bio: string }) =>
      updateMyProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] })
      Alert.alert("保存成功", "个人资料已更新")
    },
    onError: (err: Error) => {
      Alert.alert("保存失败", err.message || "请稍后重试")
    },
  })

  // ── Avatar upload mutation ──
  const handleAvatarChange = useCallback(async () => {
    Alert.alert("更换头像", "请选择操作", [
      {
        text: "拍照",
        onPress: async () => {
          const uri = await imagePicker.pickFromCamera()
          if (uri) await uploadNewAvatar(uri)
        },
      },
      {
        text: "从相册选择",
        onPress: async () => {
          const uri = await imagePicker.pickFromGallery()
          if (uri) await uploadNewAvatar(uri)
        },
      },
      { text: "取消", style: "cancel" },
    ])
  }, [imagePicker])

  const uploadNewAvatar = useCallback(
    async (uri: string) => {
      setAvatarUploading(true)
      try {
        // Try OSS direct upload first, fall back to server-mediated upload
        let media
        try {
          media = await uploadMediaDirect(uri)
        } catch {
          media = await uploadMedia(uri)
        }
        await updateMyProfile({ avatar_url: media.url })
        queryClient.invalidateQueries({ queryKey: ["myProfile"] })
        Alert.alert("成功", "头像已更新")
      } catch (err: any) {
        Alert.alert("上传失败", err?.message || "请稍后重试")
      } finally {
        setAvatarUploading(false)
      }
    },
    [queryClient]
  )

  // ── Delete account mutation ──
  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      await logout()
      router.replace("/(auth)/login")
    },
    onError: (err: Error) => {
      Alert.alert("操作失败", err.message || "注销账号失败，请稍后重试")
    },
  })

  // ── Save user settings mutation ──
  const saveSettingsMutation = useMutation({
    mutationFn: (data: { notification_enabled: boolean; privacy_default: number }) =>
      updateMySettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mySettings"] })
      Alert.alert("保存成功", "偏好设置已更新")
    },
    onError: (err: Error) => {
      Alert.alert("保存失败", err.message || "请稍后重试")
    },
  })

  // ── Handlers ──
  const handleSaveProfile = useCallback(() => {
    if (!nickname.trim()) {
      Alert.alert("提示", "昵称不能为空")
      return
    }
    saveProfileMutation.mutate({
      nickname: nickname.trim(),
      bio: bio.trim(),
    })
  }, [nickname, bio, saveProfileMutation])

  const handleDarkModeToggle = useCallback(
    async (value: boolean) => {
      setDarkMode(value)
      await SecureStore.setItemAsync(DARK_MODE_KEY, value ? "true" : "false")
    },
    []
  )

  const handleNotificationToggle = useCallback(
    (value: boolean) => {
      setNotificationEnabled(value)
      saveSettingsMutation.mutate({
        notification_enabled: value,
        privacy_default: privacyDefault,
      })
    },
    [privacyDefault, saveSettingsMutation]
  )

  const handlePrivacyChange = useCallback(
    (value: number) => {
      setPrivacyDefault(value)
      saveSettingsMutation.mutate({
        notification_enabled: notificationEnabled,
        privacy_default: value,
      })
    },
    [notificationEnabled, saveSettingsMutation]
  )

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
            )
          },
        },
      ]
    )
  }, [deleteAccountMutation])

  const isSaving = saveProfileMutation.isPending
  const isDeleting = deleteAccountMutation.isPending

  // ── Export state and handlers ──
  const [exportTask, setExportTask] = useState<ExportTask | ExportStatus | null>(null)
  const [exportPending, setExportPending] = useState(false)
  const exportIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleStartExport = useCallback(async () => {
    setExportPending(true)
    try {
      const task = await requestExport()
      setExportTask(task)
    } catch (err: any) {
      Alert.alert("导出失败", err?.message || "无法创建导出任务")
    } finally {
      setExportPending(false)
    }
  }, [])

  const handleResetExport = useCallback(() => {
    if (exportIntervalRef.current) {
      clearInterval(exportIntervalRef.current)
      exportIntervalRef.current = null
    }
    setExportTask(null)
  }, [])

  const handleDownloadExport = useCallback(() => {
    if (!exportTask) return
    const url = getDownloadUrl(exportTask.task_id)
    Linking.openURL(url)
  }, [exportTask])

  // Poll export status every 2 seconds while pending/processing
  useEffect(() => {
    if (!exportTask || exportTask.status === "done" || exportTask.status === "failed") {
      return
    }

    exportIntervalRef.current = setInterval(async () => {
      try {
        const status: ExportStatus = await getExportStatus(exportTask.task_id)
        setExportTask(status)
        if (status.status === "done" || status.status === "failed") {
          if (exportIntervalRef.current) {
            clearInterval(exportIntervalRef.current)
            exportIntervalRef.current = null
          }
        }
      } catch {
        // Silently retry on next poll
      }
    }, 2000)

    return () => {
      if (exportIntervalRef.current) {
        clearInterval(exportIntervalRef.current)
        exportIntervalRef.current = null
      }
    }
  }, [exportTask?.task_id, exportTask?.status])

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
            {/* ── Avatar Preview ── */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                onPress={handleAvatarChange}
                disabled={avatarUploading}
                activeOpacity={0.7}
              >
                {avatarUploading ? (
                  <View style={[styles.avatarPreview, styles.avatarLoading]}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                  </View>
                ) : profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatarPreview}
                  />
                ) : (
                  <View style={styles.avatarPreview}>
                    <Ionicons name="person" size={32} color={Colors.textTertiary} />
                  </View>
                )}
                <View style={styles.cameraIcon}>
                  <Ionicons name="camera" size={14} color={Colors.textInverse} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAvatarChange} disabled={avatarUploading}>
                <Text style={styles.changeAvatarText}>
                  {avatarUploading ? "上传中…" : "更换头像"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>昵称</Text>
              <TextInput
                style={styles.input}
                placeholder="输入昵称"
                placeholderTextColor={Colors.textTertiary}
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
                placeholderTextColor={Colors.textTertiary}
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

          {/* ══ Section: 通知偏好 ══ */}
          <Text style={styles.sectionTitle}>通知偏好</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.settingLabel}>启用通知</Text>
              </View>
              <Switch
                value={notificationEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{
                  false: Colors.borderLight,
                  true: Colors.primaryLight,
                }}
                thumbColor={notificationEnabled ? Colors.primary : "#f4f3f4"}
              />
            </View>
          </View>

          {/* ══ Section: 默认隐私 ══ */}
          <Text style={styles.sectionTitle}>默认隐私</Text>
          <View style={styles.card}>
            {PRIVACY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.privacyRow,
                  privacyDefault === opt.value && styles.privacyRowActive,
                ]}
                onPress={() => handlePrivacyChange(opt.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.privacyLabel,
                    privacyDefault === opt.value && styles.privacyLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {privacyDefault === opt.value && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
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

          {/* ══ Section: 数据管理 ══ */}
          <Text style={styles.sectionTitle}>数据管理</Text>
          <View style={styles.card}>
            {exportTask ? (
              <View style={styles.exportStatusContainer}>
                <View style={styles.exportStatusRow}>
                  <Ionicons
                    name={
                      exportTask.status === "done"
                        ? "checkmark-circle"
                        : exportTask.status === "failed"
                          ? "close-circle"
                          : "cloud-download-outline"
                    }
                    size={20}
                    color={
                      exportTask.status === "done"
                        ? "#34C759"
                        : exportTask.status === "failed"
                          ? Colors.error
                          : Colors.primary
                    }
                  />
                  <Text style={styles.exportStatusText}>
                    {exportTask.status === "pending"
                      ? "等待处理…"
                      : exportTask.status === "processing"
                        ? "正在导出…"
                        : exportTask.status === "done"
                          ? "导出完成"
                          : "导出失败"}
                  </Text>
                </View>
                {exportTask.status === "processing" && (
                  <ActivityIndicator size="small" color={Colors.primary} style={styles.exportSpinner} />
                )}
                {exportTask.status === "done" && (
                  <TouchableOpacity
                    style={styles.exportDownloadBtn}
                    onPress={handleDownloadExport}
                  >
                    <Ionicons name="download" size={16} color={Colors.textInverse} />
                    <Text style={styles.exportDownloadBtnText}>下载数据</Text>
                  </TouchableOpacity>
                )}
                {exportTask.status === "failed" && (
                  <Text style={[styles.exportErrorHint, { marginTop: Spacing.sm }]}>
                    {("error" in exportTask ? (exportTask as ExportStatus).error : null) || "导出失败，请稍后重试"}
                  </Text>
                )}
                {(exportTask.status === "done" || exportTask.status === "failed") && (
                  <TouchableOpacity
                    style={styles.exportResetBtn}
                    onPress={handleResetExport}
                  >
                    <Text style={styles.exportResetBtnText}>重新导出</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.menuRow}
                onPress={handleStartExport}
                disabled={exportPending}
              >
                <View style={styles.settingInfo}>
                  <Ionicons name="download-outline" size={20} color={Colors.textSecondary} />
                  <Text style={styles.settingLabel}>导出我的数据</Text>
                </View>
                {exportPending ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                )}
              </TouchableOpacity>
            )}
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
  )
}

// ── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
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
    backgroundColor: Colors.bgCard,
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
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },

  // ── Section ──
  sectionTitle: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
  },

  // ── Avatar ──
  avatarSection: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  avatarPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.bgTertiary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  avatarLoading: {
    opacity: 0.6,
  },
  cameraIcon: {
    position: "absolute",
    bottom: 4,
    right: -2,
    backgroundColor: Colors.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.bgCard,
  },
  changeAvatarText: {
    fontSize: FontSize.small,
    color: Colors.textAccent,
    fontWeight: FontWeight.medium,
  },

  // ── Fields ──
  fieldGroup: {
    marginBottom: Spacing.sm,
  },
  fieldLabel: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.bg,
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
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
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
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },

  // ── Privacy Row ──
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.bg,
  },
  privacyRowActive: {
    backgroundColor: Colors.primaryLight + "30",
  },
  privacyLabel: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  privacyLabelActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
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
    fontSize: FontSize.body,
    color: Colors.error,
  },

  // ── Spacer ──
  // ── Export ──
  exportStatusContainer: {
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  exportStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  exportStatusText: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  exportSpinner: {
    marginTop: Spacing.xs,
  },
  exportDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  exportDownloadBtnText: {
    fontSize: FontSize.body,
    color: Colors.textInverse,
    fontWeight: FontWeight.semibold,
  },
  exportErrorHint: {
    fontSize: FontSize.small,
    color: Colors.error,
  },
  exportResetBtn: {
    alignSelf: "flex-start",
    marginTop: Spacing.xs,
  },
  exportResetBtnText: {
    fontSize: FontSize.small,
    color: Colors.textAccent,
  },
  spacer: {
    height: Spacing.xxl,
  },
})
