import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getMomentById } from "../../../services/moments";
import { formatRelativeTime, formatCount } from "../../../utils/format";
import { Colors, Spacing, FontSize, Radius } from "../../../constants/theme";
import type { MomentDetail } from "../../../types/api";

// ── Mock Comments (to be replaced with real API) ────────
const MOCK_COMMENTS = [
  {
    id: "c1",
    nickname: "小明",
    content: "感觉好温暖呀～",
    time: "10 分钟前",
  },
  {
    id: "c2",
    nickname: "小红",
    content: "同感，今天天气也很不错！",
    time: "5 分钟前",
  },
];

function getPrivacyLabel(level: number): string {
  switch (level) {
    case 0:
      return "仅自己";
    case 1:
      return "好友";
    case 2:
      return "互关";
    case 3:
      return "公开";
    default:
      return "未知";
  }
}

export default function MomentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: moment,
    isLoading,
    isError,
    error,
  } = useQuery<MomentDetail>({
    queryKey: ["moment", id],
    queryFn: () => getMomentById(id!),
    enabled: !!id,
  });

  // ── Loading State ──
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top"]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  // ── Error State ──
  if (isError || !moment) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top"]}>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : "无法加载 Moment"}
        </Text>
        <TouchableOpacity
          style={styles.backButtonInline}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonInlineText}>返回</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>详情</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header: title + mood ── */}
        {moment.title && (
          <Text style={styles.title}>{moment.title}</Text>
        )}
        <View style={styles.metaRow}>
          {moment.mood && <Text style={styles.mood}>{moment.mood}</Text>}
          <Text style={styles.time}>
            {formatRelativeTime(moment.created_at)}
          </Text>
          <View style={styles.privacyBadge}>
            <Ionicons name="lock-closed" size={12} color={Colors.textTertiary} />
            <Text style={styles.privacyText}>
              {getPrivacyLabel(moment.privacy_level)}
            </Text>
          </View>
        </View>

        {/* ── Content ── */}
        {moment.content && (
          <Text style={styles.content}>{moment.content}</Text>
        )}

        {/* ── AI Tags ── */}
        {moment.ai_tags && moment.ai_tags.length > 0 && (
          <View style={styles.aiSection}>
            <View style={styles.aiSectionTitleRow}>
              <Ionicons name="sparkles" size={14} color={Colors.primary} />
              <Text style={styles.aiSectionTitle}> AI 标签</Text>
            </View>
            <View style={styles.tagsRow}>
              {moment.ai_tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── AI Summary ── */}
        {moment.ai_summary && (
          <View style={styles.aiSection}>
            <View style={styles.aiSectionTitleRow}>
              <Ionicons name="sparkles" size={14} color={Colors.primary} />
              <Text style={styles.aiSectionTitle}> AI 摘要</Text>
            </View>
            <Text style={styles.aiSummaryText}>{moment.ai_summary}</Text>
          </View>
        )}

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="heart-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              {formatCount(moment.like_count)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="chatbubble-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              {formatCount(moment.comment_count)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="eye-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              {formatCount(moment.view_count)}
            </Text>
          </View>
        </View>

        {/* ── Like Button (UI only) ── */}
        <TouchableOpacity style={styles.likeButton} activeOpacity={0.7}>
          <Ionicons name="heart" size={20} color={Colors.error} />
          <Text style={styles.likeButtonText}>点赞</Text>
        </TouchableOpacity>

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {/* ── Comments Section ── */}
        <Text style={styles.commentsHeader}>
          评论
        </Text>
        {MOCK_COMMENTS.map((comment) => (
          <View key={comment.id} style={styles.commentItem}>
            <View style={styles.commentAvatar}>
              <Text style={styles.commentAvatarText}>
                {comment.nickname[0]}
              </Text>
            </View>
            <View style={styles.commentBody}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentNickname}>
                  {comment.nickname}
                </Text>
                <Text style={styles.commentTime}>{comment.time}</Text>
              </View>
              <Text style={styles.commentContent}>{comment.content}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.error,
    marginBottom: Spacing.md,
  },
  backButtonInline: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
  },
  backButtonInlineText: {
    color: Colors.textInverse,
    fontSize: FontSize.sm,
    fontWeight: "600",
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

  // ── Scroll ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },

  // ── Content ──
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  mood: {
    fontSize: 22,
  },
  time: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  privacyText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  content: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    lineHeight: 26,
    marginBottom: Spacing.lg,
  },

  // ── AI ──
  aiSection: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  aiSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  aiSectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.primary,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.primaryLight + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  tagText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  aiSummaryText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  // ── Like Button ──
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  likeButtonText: {
    fontSize: FontSize.md,
    color: Colors.error,
    fontWeight: "600",
  },

  // ── Divider ──
  divider: {
    height: 0.5,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },

  // ── Comments ──
  commentsHeader: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  commentItem: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight + "40",
    justifyContent: "center",
    alignItems: "center",
  },
  commentAvatarText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.primary,
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  commentNickname: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  commentTime: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  commentContent: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
