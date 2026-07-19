import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getMomentById } from "../../../services/moments";
import {
  getComments,
  createComment,
  type CommentItem,
} from "../../../services/comments";
import { toggleLike, getLikeStatus } from "../../../services/social";
import { formatRelativeTime, formatCount } from "../../../utils/format";
import { Colors, Spacing, FontSize, Radius } from "../../../constants/theme";
import type { MomentDetail } from "../../../types/api";

// ── Helpers ──────────────────────────────────────────────
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

function getInitial(name: string): string {
  return name?.charAt(0)?.toUpperCase() || "?";
}

// ── Moment Detail Screen ─────────────────────────────────
export default function MomentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  // ── Comment input state ──
  const [commentText, setCommentText] = useState("");
  const [commentsPage, setCommentsPage] = useState(1);
  const [allComments, setAllComments] = useState<CommentItem[]>([]);

  // ── Moment Query ──
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

  // ── Comments Query ──
  const {
    data: commentsData,
    isLoading: commentsLoading,
    isRefetching: commentsRefetching,
  } = useQuery({
    queryKey: ["comments", id, commentsPage],
    queryFn: () => getComments(id!, commentsPage),
    enabled: !!id,
  });

  // Accumulate comments across pages
  React.useEffect(() => {
    if (commentsData) {
      if (commentsPage === 1) {
        setAllComments(commentsData.items);
      } else {
        setAllComments((prev) => [...prev, ...commentsData.items]);
      }
    }
  }, [commentsData, commentsPage]);

  // ── Like Status Query ──
  const {
    data: likeStatus,
    isLoading: likeLoading,
  } = useQuery({
    queryKey: ["likeStatus", "moment", id],
    queryFn: () => getLikeStatus("moment", id!),
    enabled: !!id,
  });

  // ── Toggle Like Mutation ──
  const toggleLikeMutation = useMutation({
    mutationFn: () => toggleLike("moment", id!),
    onSuccess: (result) => {
      // Update both like status cache and moment detail cache
      queryClient.setQueryData(["likeStatus", "moment", id], result);
      queryClient.invalidateQueries({ queryKey: ["moment", id] });
    },
  });

  // ── Create Comment Mutation ──
  const createCommentMutation = useMutation({
    mutationFn: (content: string) => createComment(id!, content),
    onSuccess: () => {
      setCommentText("");
      setCommentsPage(1);
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      queryClient.invalidateQueries({ queryKey: ["moment", id] });
    },
    onError: (err: Error) => {
      // Error is displayed below; we keep the comment text so user can retry
    },
  });

  // ── Handlers ──
  const handleSendComment = useCallback(() => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    createCommentMutation.mutate(trimmed);
  }, [commentText, createCommentMutation]);

  const handleToggleLike = useCallback(() => {
    if (toggleLikeMutation.isPending) return;
    toggleLikeMutation.mutate();
  }, [toggleLikeMutation]);

  const sortedComments = React.useMemo(() => {
    return [...allComments].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [allComments]);

  const currentLikeCount =
    likeStatus?.like_count ?? moment?.like_count ?? 0;
  const isLiked = likeStatus?.liked ?? false;

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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
                {formatCount(currentLikeCount)}
              </Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.statText}>
                {formatCount(moment.comment_count || sortedComments.length)}
              </Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="eye-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.statText}>
                {formatCount(moment.view_count)}
              </Text>
            </View>
          </View>

          {/* ── Like Button (real API) ── */}
          <TouchableOpacity
            style={[
              styles.likeButton,
              isLiked && styles.likeButtonActive,
            ]}
            activeOpacity={0.7}
            onPress={handleToggleLike}
            disabled={likeLoading || toggleLikeMutation.isPending}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={20}
              color={isLiked ? Colors.error : Colors.textSecondary}
            />
            <Text
              style={[
                styles.likeButtonText,
                isLiked && styles.likeButtonTextActive,
              ]}
            >
              {isLiked ? "已赞" : "点赞"}
              {currentLikeCount > 0 ? ` ${currentLikeCount}` : ""}
            </Text>
          </TouchableOpacity>

          {/* ── Divider ── */}
          <View style={styles.divider} />

          {/* ── Comments Section ── */}
          <Text style={styles.commentsHeader}>
            评论 {sortedComments.length > 0 ? `(${sortedComments.length})` : ""}
          </Text>

          {commentsLoading && commentsPage === 1 ? (
            <ActivityIndicator
              size="small"
              color={Colors.primary}
              style={styles.commentsLoader}
            />
          ) : sortedComments.length === 0 ? (
            <Text style={styles.noComments}>暂无评论，来说点什么吧</Text>
          ) : (
            sortedComments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {getInitial(comment.nickname)}
                  </Text>
                </View>
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentNickname}>
                      {comment.nickname}
                    </Text>
                    <Text style={styles.commentTime}>
                      {formatRelativeTime(comment.created_at)}
                    </Text>
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* ── Comment Input Bar ── */}
        <View style={styles.commentInputBar}>
          <TextInput
            style={styles.commentInput}
            placeholder="写评论..."
            placeholderTextColor={Colors.textPlaceholder}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !commentText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || createCommentMutation.isPending}
          >
            {createCommentMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <Ionicons name="send" size={18} color={Colors.textInverse} />
            )}
          </TouchableOpacity>
        </View>
        {createCommentMutation.isError && (
          <Text style={styles.commentError}>
            {createCommentMutation.error?.message || "发送失败"}
          </Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
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
    paddingBottom: Spacing.md,
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
  likeButtonActive: {
    borderColor: Colors.error + "40",
    backgroundColor: Colors.error + "08",
  },
  likeButtonText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  likeButtonTextActive: {
    color: Colors.error,
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
  commentsLoader: {
    paddingVertical: Spacing.lg,
  },
  noComments: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: "center",
    paddingVertical: Spacing.lg,
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

  // ── Comment Input Bar ──
  commentInputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  commentInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  commentError: {
    fontSize: FontSize.xs,
    color: Colors.error,
    textAlign: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.white,
  },
});
