import React, { useState, useCallback, useRef } from "react";
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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { createMoment } from "../../../services/moments";
import { uploadMedia } from "../../../services/media";
import { Colors, Spacing, FontSize, FontWeight, Radius } from "../../../constants/theme";
import type { CreateMomentParams } from "../../../types/api";

// ── Mood Options ────────
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
  const tagInputRef = useRef<TextInput>(null);

  // ── Form State ──
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [privacyLevel, setPrivacyLevel] = useState<number>(3);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [weather, setWeather] = useState("");
  const [location, setLocation] = useState("");

  // ── Image Picker ──
  const handlePickImages = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("权限不足", "需要相册权限才能选择图片");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 9 - selectedImages.length,
    });

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map((a: { uri: string }) => a.uri);
      setSelectedImages((prev) =>
        [...prev, ...newUris].slice(0, 9)
      );
    }
  }, [selectedImages.length]);

  const handleRemoveImage = useCallback((index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Tag Input ──
  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (tags.length >= 10) {
      Alert.alert("提示", "最多添加 10 个标签");
      return;
    }
    if (tags.includes(trimmed)) {
      Alert.alert("提示", "标签已存在");
      return;
    }
    setTags((prev) => [...prev, trimmed]);
    setTagInput("");
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleTagInputSubmit = useCallback(() => {
    handleAddTag();
  }, [handleAddTag]);

  // ── Reset Form ──
  const resetForm = useCallback(() => {
    setContent("");
    setTitle("");
    setMood(null);
    setPrivacyLevel(3);
    setSelectedImages([]);
    setTags([]);
    setTagInput("");
    setWeather("");
    setLocation("");
  }, []);

  // ── Mutation ──
  const { mutate: doCreate, isPending } = useMutation({
    mutationFn: async (params: CreateMomentParams) => {
      // Upload images first if any
      if (selectedImages.length > 0) {
        const uploadedUrls: string[] = [];
        for (const uri of selectedImages) {
          const result = await uploadMedia(uri);
          uploadedUrls.push(result.url);
        }
        params.media_urls = uploadedUrls;
      }
      // Custom tags
      if (tags.length > 0) {
        params.custom_tags = tags;
      }
      // Weather & location
      if (weather.trim()) params.weather = weather.trim();
      if (location.trim()) params.location_name = location.trim();

      return createMoment(params);
    },
    onSuccess: () => {
      Alert.alert("发布成功", "你的生刻已记录", [
        {
          text: "好的",
          onPress: () => {
            resetForm();
            router.replace("/(tabs)/home");
          },
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
          {/* ── Title Input ── */}
          <TextInput
            style={styles.titleInput}
            placeholder="添加一个标题（可选）"
            placeholderTextColor={Colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <View style={styles.divider} />

          {/* ── Content Input ── */}
          <TextInput
            style={styles.contentInput}
            placeholder="此时此刻，你想记录什么…"
            placeholderTextColor={Colors.textTertiary}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text style={styles.charCount}>{content.length}/2000</Text>

          {/* ── Media Selection ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>图片（最多 9 张）</Text>
            <View style={styles.mediaRow}>
              {selectedImages.map((uri, index) => (
                <View key={`img-${index}`} style={styles.mediaThumbWrap}>
                  <Image source={{ uri }} style={styles.mediaThumb} />
                  <TouchableOpacity
                    style={styles.mediaRemoveBtn}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <Ionicons name="close-circle" size={22} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              {selectedImages.length < 9 && (
                <TouchableOpacity
                  style={styles.mediaAddButton}
                  onPress={handlePickImages}
                >
                  <Ionicons name="camera-outline" size={28} color={Colors.textSecondary} />
                  <Text style={styles.mediaAddText}>
                    {selectedImages.length}/9
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Custom Tags Input ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>自定义标签</Text>
            <View style={styles.tagsWrap}>
              {tags.map((tag, index) => (
                <View key={`tag-${index}`} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>#{tag}</Text>
                  <TouchableOpacity onPress={() => handleRemoveTag(index)}>
                    <Ionicons name="close" size={14} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.tagInputRow}>
              <TextInput
                ref={tagInputRef}
                style={styles.tagTextInput}
                placeholder="输入标签后按回车添加"
                placeholderTextColor={Colors.textTertiary}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={handleTagInputSubmit}
                returnKeyType="done"
                maxLength={20}
              />
              <TouchableOpacity
                style={[
                  styles.tagAddBtn,
                  !tagInput.trim() && styles.tagAddBtnDisabled,
                ]}
                onPress={handleAddTag}
                disabled={!tagInput.trim()}
              >
                <Ionicons name="add" size={18} color={Colors.textInverse} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Weather & Location ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>天气与位置</Text>
            <View style={styles.infoInputRow}>
              <Ionicons name="partly-sunny-outline" size={20} color={Colors.textSecondary} style={styles.infoIcon} />
              <TextInput
                style={styles.infoInput}
                placeholder="天气（如：晴天 25°C）"
                placeholderTextColor={Colors.textTertiary}
                value={weather}
                onChangeText={setWeather}
                maxLength={50}
              />
            </View>
            <View style={[styles.infoInputRow, { marginTop: Spacing.sm }]}>
              <Ionicons name="location-outline" size={20} color={Colors.textSecondary} style={styles.infoIcon} />
              <TextInput
                style={styles.infoInput}
                placeholder="位置"
                placeholderTextColor={Colors.textTertiary}
                value={location}
                onChangeText={setLocation}
                maxLength={100}
              />
            </View>
          </View>

          {/* ── Mood Picker ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>心情</Text>
            <View style={styles.moodRow}>
              {CREATE_MOODS.map((m) => (
                <TouchableOpacity
                  key={m.label}
                  style={[
                    styles.moodButton,
                    mood === m.emoji && styles.moodButtonActive,
                  ]}
                  onPress={() =>
                    setMood(mood === m.emoji ? null : m.emoji)
                  }
                  activeOpacity={0.7}
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
                  activeOpacity={0.7}
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

// ── Styles ──
const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.bgCard,
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
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  cancelText: {
    fontSize: FontSize.body,
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
    fontSize: FontSize.body,
    color: Colors.textInverse,
    fontWeight: FontWeight.semibold,
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
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  divider: {
    height: 0.5,
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  contentInput: {
    fontSize: FontSize.bodyLarge,
    color: Colors.textPrimary,
    lineHeight: 26,
    minHeight: 160,
    paddingVertical: Spacing.sm,
  },
  charCount: {
    fontSize: FontSize.caption,
    color: Colors.textTertiary,
    textAlign: "right",
    marginBottom: Spacing.lg,
  },

  // ── Sections ──
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },

  // ── Media Selection ──
  mediaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  mediaThumbWrap: {
    position: "relative",
  },
  mediaThumb: {
    width: 80,
    height: 80,
    borderRadius: Radius.sm,
    backgroundColor: Colors.borderLight,
  },
  mediaRemoveBtn: {
    position: "absolute",
    top: -6,
    right: -6,
  },
  mediaAddButton: {
    width: 80,
    height: 80,
    borderRadius: Radius.sm,
    backgroundColor: Colors.borderLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  mediaAddText: {
    fontSize: FontSize.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // ── Tags ──
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryLight + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  tagChipText: {
    fontSize: FontSize.small,
    color: Colors.primary,
  },
  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  tagTextInput: {
    flex: 1,
    fontSize: FontSize.small,
    color: Colors.textPrimary,
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  tagAddBtnDisabled: {
    backgroundColor: Colors.primaryLight + "60",
  },

  // ── Info Input (Weather / Location) ──
  infoInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  infoIcon: {
    marginRight: Spacing.sm,
  },
  infoInput: {
    flex: 1,
    fontSize: FontSize.small,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
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
    fontSize: FontSize.small,
    color: Colors.textSecondary,
  },
  moodLabelActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
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
    fontSize: FontSize.small,
    color: Colors.textSecondary,
  },
  privacyLabelActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
});
