import React, { useState, useCallback, useMemo } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams, router } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Ionicons } from "@expo/vector-icons"
import { getMomentById } from "../../../services/moments"
import { getComments, deleteComment } from "../../../services/comments"
import { toggleLike, getLikeStatus } from "../../../services/social"
import { formatRelativeTime, formatCount } from "../../../utils/format"
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  Radius,
  Shadows,
  LineHeight,
} from "../../../constants/theme"
import type { MomentDetail } from "../../../types/api"
import { CommentList } from "../../../components/social/CommentList"
import { CommentComposer } from "../../../components/social/CommentComposer"
import type { CommentInfo } from "../../../components/social/CommentItem"
import type { CommentItem as CommentItemType } from "../../../services/comments"
import { useAuthStore } from "../../../stores/authStore"

// ── Helpers ──────────────────────────────────────────────
function getPrivacyLabel(level: number): string {
  switch (level) {
    case 0:
      return "仅自己"
    case 1:
      return "好友"
    case 2:
      return "互关"
    case 3:
      return "公开"
    default:
      return "未知"
  }
}

function getInitial(name: string): string {
  return name?.charAt(0)?.toUpperCase() || "?"
}

function adaptCommentItem(c: CommentItemType): CommentInfo {
  return {
    id: c.id,
    user_id: c.user_id,
    author_nickname: c.nickname,
    author_avatar_url: c.avatar_url,
    content: c.content,
    like_count: c.like_count,
    created_at: c.created_at,
    // Backend doesn't currently nest replies in list — set empty for now
    replies: [],
  }
}

// ── Moment Detail Screen ─────────────────────────────────
export default function MomentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  // ── Comment state ──
  const [commentsPage, setCommentsPage] = useState(1)
  const [allComments, setAllComments] = useState<CommentItemType[]>([])
  const [replyTo, setReplyTo] = useState<{
    commentId: string
    nickname: string
  } | null>(null)

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
  })

  // ── Comments Query ──
  const {
    data: commentsData,
    isLoading: commentsLoading,
    isRefetching: commentsRefetching,
  } = useQuery({
    queryKey: ["comments", id, commentsPage],
    queryFn: () => getComments(id!, commentsPage),
    enabled: !!id,
  })

  // Accumulate comments across pages
  React.useEffect(() => {
    if (commentsData) {
      if (commentsPage === 1) {
        setAllComments(commentsData.items)
      } else {
        setAllComments((prev) => [...prev, ...commentsData.items])
      }
    }
  }, [commentsData, commentsPage])

  // ── Like Status Query ──
  const { data: likeStatus } = useQuery({
    queryKey: ["likeStatus", "moment", id],
    queryFn: () => getLikeStatus("moment", id!),
    enabled: !!id,
  })

  // ── Toggle Like Mutation ──
  const toggleLikeMutation = useMutation({
    mutationFn: () => toggleLike("moment", id!),
    onSuccess: (result) => {
      queryClient.setQueryData(["likeStatus", "moment", id], result)
      queryClient.invalidateQueries({ queryKey: ["moment", id] })
    },
  })

  // ── Create Comment Mutation (via CommentComposer) ──
  const createCommentMutation = useMutation({
    mutationFn: (content: string) =>
      import("../../../services/comments").then((m) =>
        m.createComment(id!, content, replyTo?.commentId ?? undefined)
      ),
    onSuccess: () => {
      setReplyTo(null)
      setCommentsPage(1)
      queryClient.invalidateQueries({ queryKey: ["comments", id] })
      queryClient.invalidateQueries({ queryKey: ["moment", id] })
    },
  })

  // ── Delete Comment Mutation ──
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", id] })
      queryClient.invalidateQueries({ queryKey: ["moment", id] })
    },
  })

  // ── Handlers ──
  const handleToggleLike = useCallback(() => {
    if (toggleLikeMutation.isPending) return
    toggleLikeMutation.mutate()
  }, [toggleLikeMutation])

  const handleSubmitComment = useCallback(
    (content: string) => {
      createCommentMutation.mutate(content)
    },
    [createCommentMutation]
  )

  const handleReply = useCallback(
    (commentId: string, nickname: string) => {
      setReplyTo({ commentId, nickname })
    },
    []
  )

  const handleCancelReply = useCallback(() => {
    setReplyTo(null)
  }, [])

  const handleLikeToggle = useCallback(
    (_commentId: string) => {
      // Comment-level like is future feature — no-op for now
    },
    []
  )

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      deleteCommentMutation.mutate(commentId)
    },
    [deleteCommentMutation]
  )

  const handleLoadMore = useCallback(() => {
    if (commentsData?.meta) {
      const { page, total, page_size } = commentsData.meta
      if (page * page_size < total) {
        setCommentsPage((p) => p + 1)
      }
    }
  }, [commentsData])

  const hasMore = useMemo(() => {
    if (!commentsData?.meta) return false
    const { page, total, page_size } = commentsData.meta
    return page * page_size < total
  }, [commentsData])

  const sortedComments = useMemo(() => {
    return [...allComments].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [allComments])

  const adaptedComments = useMemo(
    () => sortedComments.map(adaptCommentItem),
    [sortedComments]
  )

  const currentUserId = currentUser?.id ?? ""

  const currentLikeCount =
    (likeStatus as { like_count?: number })?.like_count ??
    moment?.like_count ??
    0
  const isLiked = (likeStatus as { liked?: boolean })?.liked ?? false

  // ── Loading State ──
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top"]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    )
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
    )
  }

  const isOwnMoment = moment.user_id === currentUserId

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
          {/* ── Mood ── */}
          {moment.mood && (
            <Text style={styles.moodEmoji}>{moment.mood}</Text>
          )}

          {/* ── Author Row ── */}
          <View style={styles.authorRow}>
            <View style={styles.authorLeft}>
              {moment.author_avatar_url ? (
                <View style={styles.authorAvatarCircle}>
                  <Text style={styles.authorAvatarText}>
                    {getInitial(moment.author_nickname || "用户")}
                  </Text>
                </View>
              ) : (
                <Ionicons
                  name="person-circle"
                  size={36}
                  color={Colors.textTertiary}
                />
              )}
              <View style={styles.authorInfo}>
                <Text style={styles.authorNickname}>
                  {moment.author_nickname || "用户"}
                </Text>
                <Text style={styles.time}>
                  {formatRelativeTime(moment.created_at)}
                </Text>
              </View>
            </View>
            <View style={styles.privacyBadge}>
              <Ionicons name="lock-closed" size={10} color={Colors.textTertiary} />
              <Text style={styles.privacyText}>
                {getPrivacyLabel(moment.privacy_level)}
              </Text>
            </View>
          </View>

          {/* ── Title ── */}
          {moment.title && (
            <Text style={styles.title}>{moment.title}</Text>
          )}

          {/* ── Content ── */}
          {moment.content && (
            <View style={styles.contentBlock}>
              <Text style={styles.content}>{moment.content}</Text>
            </View>
          )}

          {/* ── AI Summary ── */}
          {moment.ai_summary && (
            <View style={styles.aiSection}>
              <View style={styles.aiSectionTitleRow}>
                <Ionicons
                  name="sparkles"
                  size={16}
                  color={Colors.textAccent}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.aiSectionTitle}>AI 总结</Text>
              </View>
              <Text style={styles.aiSummaryText}>{moment.ai_summary}</Text>
            </View>
          )}

          {/* ── AI tags ── */}
          {moment.ai_tags && moment.ai_tags.length > 0 && (
            <View style={styles.aiSection}>
              <View style={styles.aiSectionTitleRow}>
                <Ionicons
                  name="pricetags-outline"
                  size={14}
                  color={Colors.textAccent}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.aiSectionTitle}>标签</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.aiTagsScroll}
              >
                {moment.ai_tags.map((tag: string) => (
                  <View key={tag} style={styles.aiTagChip}>
                    <Text style={styles.aiTagChipText}>#{tag}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Emotion ── */}
          {moment.ai_emotion && (
            <View style={styles.emotionRow}>
              <View style={styles.emotionBadge}>
                <Text style={styles.emotionText}>{moment.ai_emotion}</Text>
              </View>
            </View>
          )}

          {/* ── Stats Row ── */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons
                name="heart-outline"
                size={14}
                color={Colors.textTertiary}
              />
              <Text style={styles.statLabel}>
                {formatCount(moment.like_count)}
              </Text>
            </View>
            <View style={styles.stat}>
              <Ionicons
                name="chatbubble-outline"
                size={14}
                color={Colors.textTertiary}
              />
              <Text style={styles.statLabel}>
                {formatCount(moment.comment_count)}
              </Text>
            </View>
          </View>

          {/* ── Like Button ── */}
          <TouchableOpacity
            style={[
              styles.likeButton,
              isLiked && styles.likeButtonActive,
            ]}
            onPress={handleToggleLike}
            disabled={toggleLikeMutation.isPending}
            activeOpacity={0.7}
          >
            {toggleLikeMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <>
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={20}
                  color={isLiked ? Colors.error : Colors.textTertiary}
                />
                <Text
                  style={[
                    styles.likeButtonText,
                    isLiked && { color: Colors.error },
                  ]}
                >
                  {isLiked ? "已喜欢" : "喜欢"}
                  {currentLikeCount > 0 && ` · ${currentLikeCount}`}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* ── Comments Section ── */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsSectionTitle}>
              评论 {moment.comment_count > 0 && `(${moment.comment_count})`}
            </Text>

            <CommentList
              comments={adaptedComments}
              onReply={handleReply}
              onLikeToggle={handleLikeToggle}
              onDelete={handleDeleteComment}
              currentUserId={currentUserId}
              isLoading={commentsLoading}
              onLoadMore={hasMore ? handleLoadMore : undefined}
              hasMore={hasMore}
            />
          </View>
        </ScrollView>

        {/* ── Comment Composer ── */}
        <CommentComposer
          onSubmit={handleSubmitComment}
          replyTo={replyTo}
          onCancelReply={handleCancelReply}
          isLoading={createCommentMutation.isPending}
        />
        {createCommentMutation.isError && (
          <Text style={styles.commentError}>
            {(createCommentMutation.error as Error)?.message || "发送失败"}
          </Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.bg,
  },
  errorText: {
    fontSize: FontSize.body,
    color: Colors.error,
    marginBottom: Spacing.md,
  },
  backButtonInline: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
  },
  backButtonInlineText: {
    color: Colors.textInverse,
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
  },

  // ── Top Bar ──
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.page,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: FontSize.heading3,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },

  // ── Scroll ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.page,
    paddingBottom: Spacing.xxxl,
  },

  // ── Author Row ──
  authorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  authorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  authorAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight + "40",
    justifyContent: "center",
    alignItems: "center",
  },
  authorAvatarText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  authorInfo: {
    flex: 1,
  },
  authorNickname: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },

  // ── Content ──
  moodEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.heading1,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: FontSize.heading1 * LineHeight.tight,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  time: {
    fontSize: FontSize.small,
    color: Colors.textTertiary,
  },
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  privacyText: {
    fontSize: FontSize.caption,
    color: Colors.textTertiary,
  },
  contentBlock: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  content: {
    fontSize: FontSize.bodyLarge,
    color: Colors.textPrimary,
    lineHeight: FontSize.bodyLarge * LineHeight.loose,
  },

  // ── AI Section ──
  aiSection: {
    backgroundColor: Colors.bgTertiary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  aiSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  aiSectionTitle: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Colors.textAccent,
  },
  aiSummaryText: {
    fontSize: FontSize.small,
    color: Colors.textSecondary,
    lineHeight: FontSize.small * LineHeight.relaxed,
    fontStyle: "italic",
  },
  aiTagsScroll: {
    flexDirection: "row",
  },
  aiTagChip: {
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    marginRight: Spacing.sm,
  },
  aiTagChipText: {
    fontSize: FontSize.small,
    color: Colors.textSecondary,
  },
  emotionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  emotionBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  emotionText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
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
  statLabel: {
    fontSize: FontSize.small,
    color: Colors.textTertiary,
  },

  // ── Like Button ──
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.bgCard,
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
    fontSize: FontSize.body,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },

  // ── Comments Section ──
  commentsSection: {
    marginTop: Spacing.lg,
  },
  commentsSectionTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  // ── Comment Error ──
  commentError: {
    fontSize: FontSize.caption,
    color: Colors.error,
    textAlign: "center",
    paddingHorizontal: Spacing.page,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.bgCard,
  },
})
