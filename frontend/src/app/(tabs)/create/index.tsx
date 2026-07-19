import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { createMoment } from "../../../services/moments";
import { Colors, Spacing, FontSize, Radius } from "../../../constants/theme";
import type { CreateMomentParams } from "../../../types/api";

// ── Mood Options ──────── (curated subset for creation) │
const CREATE_MOODS = [
  { emoji: "😊", label: "开心" },
  { emoji: "😢", label: "难过" },
  { emoji: "😌", label: "平静" },
  { emoji: "😤", label: "生气" },
  { emoji: "🥰", label: "温暖" },
  { emoji: "❄️", label: "冷漠" },
] as const;

// ── Privacy Options ─────
const PRIVACY_OPTIONS = [
  { value: 0, label: "仅自己" },
  { value: 1, label: "好友" },
  { value: 2, label: "互关" },
  { value: 3, label: "公开" },
] as const;

export default function CreateScreen() {
  const router = useRouter();

  // ── Form State ──
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [privacyLevel, setPrivacyLevel] = useState<number>(3); // default: public

  // ── Mutation ──
  const { mutate: doCreate, isPending } = useMutation({
    mutationFn: (params: CreateMomentParams) => createMoment(params),
    onSuccess: () => {
      Alert.alert("发布成功", "你的生刻已记录", [
        {
          text: "好的",
          onPress: () => router.replace("/(tabs)/home"),
        },
      ]);
    },
    onError: (err: Error) => {
      Alert.alert("发布失败", err.message || "请稍后重试");
    },
  });

  const handleSubmit = useCallback(() => {
    if (!content.trim()) {
      Alert.alert("提示", "请写点什么吧～");
      return;
    }

    const params: CreateMomentParams = {
      content: content.trim(),
      title: title.trim() || undefined,
      mood: mood ?? undefined,
      privacy_level: privacyLevel,
    };

    doCreate(params);
  }, [content, title, mood, privacyLevel, doCreate]);

  const canSubmit = content.trim().length > 0 && !isPending;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBarBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>发布生刻</Text>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            !canSubmit && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={Colors.textInverse} />
          ) : (
            <Text
              style={[
                styles.submitBtnText,
                !canSubmit && styles.submitBtnTextDisabled,
              ]}
            >
              发布
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Title Input (optional) ── */}
          <TextInput
            style={styles.titleInput}
            placeholder="添加一个标题（可选）"
            placeholderTextColor={Colors.textPlaceholder}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <View style={styles.divider} />

          {/* ── Content Input ── */}
          <TextInput
            style={styles.contentInput}
            placeholder="此时此刻，你想记录什么…"
            placeholderTextColor={Colors.textPlaceholder}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text style={styles.charCount}>{content.length}/2000</Text>

          {/* ── Mood Picker ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>心情</Text>
            <View style={styles.moodRow}>
              {CREATE_MOODS.map((m) => (
                <TouchableOpacity
                  key={m.emoji}
                  style={[
                    styles.moodButton,
                    mood === m.emoji && styles.moodButtonActive,
                  ]}
                  onPress={() =>
                    setMood(mood === m.emoji ? null : m.emoji)
                  }
                >
                  <Text
                    style={[
                      styles.moodEmoji,
                      mood === m.emoji && styles.moodEmojiActive,
                    ]}
                  >
                    {m.emoji}
                  </Text>
                  <Text
                    style={[
                      styles.moodLabel,
                      mood === m.emoji && styles.moodLabelActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Privacy Picker ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>谁可以看</Text>
            <View style={styles.privacyRow}>
              {PRIVACY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.privacyButton,
                    privacyLevel === opt.value &&
                      styles.privacyButtonActive,
                  ]}
                  onPress={() => setPrivacyLevel(opt.value)}
                >
                  <Ionicons
                    name={
                      opt.value >= 3
                        ? "globe-outline"
                        : opt.value >= 1
                          ? "people-outline"
                          : "lock-closed"
                    }
                    size={14}
                    color={
                      privacyLevel === opt.value
                        ? Colors.primary
                        : Colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.privacyLabel,
                      privacyLevel === opt.value &&
                        styles.privacyLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // ── Top Bar ──
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  topBarBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    minWidth: 60,
  },
  topBarTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  cancelText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    backgroundColor: Colors.primaryLight + "60",
  },
  submitBtnText: {
    fontSize: FontSize.md,
    color: Colors.textInverse,
    fontWeight: "600",
  },
  submitBtnTextDisabled: {
    color: Colors.textInverse + "80",
  },

  // ── Scroll ──
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  // ── Inputs ──
  titleInput: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  divider: {
    height: 0.5,
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  contentInput: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    lineHeight: 26,
    minHeight: 160,
    paddingVertical: Spacing.sm,
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textPlaceholder,
    textAlign: "right",
    marginBottom: Spacing.lg,
  },

  // ── Sections ──
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },

  // ── Mood Picker ──
  moodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  moodButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.borderLight,
  },
  moodButtonActive: {
    backgroundColor: Colors.primaryLight + "25",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  moodEmoji: {
    fontSize: 18,
    opacity: 0.6,
  },
  moodEmojiActive: {
    opacity: 1,
  },
  moodLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  moodLabelActive: {
    color: Colors.primary,
    fontWeight: "600",
  },

  // ── Privacy Picker ──
  privacyRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  privacyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.borderLight,
    borderWidth: 1,
    borderColor: "transparent",
  },
  privacyButtonActive: {
    backgroundColor: Colors.primaryLight + "20",
    borderColor: Colors.primary,
  },
  privacyLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  privacyLabelActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
});
