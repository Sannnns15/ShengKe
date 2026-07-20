import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMomentFeed } from "../../../hooks/useMomentFeed";
import { useLikeToggle } from "../../../hooks/useLikeToggle";
import { formatRelativeTime } from "../../../utils/format";
import { useQueryClient } from "@tanstack/react-query";

import { Colors, Spacing, FontSize, FontWeight, Radius } from "../../../constants/theme";
import type { MomentFeedItem } from "../../../types/api";

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
      return "";
  }
}

function getInitial(name: string): string {
  return name?.charAt(0)?.toUpperCase() || "?";
}

// ── Sort Toggle ─────────────────────────────────────────
function SortToggle({
  value,
  onChange,
}: {
  value: "latest" | "hot";
  onChange: (v: "latest" | "hot") => void;
}) {
  return (
    <View style={styles.sortRow}>
      <TouchableOpacity
        style={[styles.sortBtn, value === "latest" && styles.sortBtnActive]}
        onPress={() => onChange("latest")}
        activeOpacity={0.7}
      >
        <Ionicons
          name="time-outline"
          size={14}
          color={value === "latest" ? Colors.textInverse : Colors.textSecondary}
        />
        <Text
          style={[
            styles.sortBtnText,
            value === "latest" && styles.sortBtnTextActive,
          ]}
        >
          最新
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.sortBtn, value === "hot" && styles.sortBtnActive]}
        onPress={() => onChange("hot")}
        activeOpacity={0.7}
      >
        <Ionicons
          name="flame-outline"
          size={14}
          color={value === "hot" ? Colors.textInverse : Colors.textSecondary}
        />
        <Text
          style={[
            styles.sortBtnText,
            value === "hot" && styles.sortBtnTextActive,
          ]}
        >
          热门
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── MomentCard ─────────────────────────────────────────
function MomentCard({
  item,
  onPress,
  onLikeToggle,
  likePending,
}: {
  item: MomentFeedItem;
  onPress: () => void;
  onLikeToggle: () => void;
  likePending: boolean;
}) {
  // Truncate content to ~2 lines (~80 chars)
  const truncatedContent =
    item.content && item.content.length > 80
      ? item.content.slice(0, 80) + "…"
      : item.content;

  const displayName = item.author_nickname || "用户";
  const avatarChar = getInitial(displayName);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* ── Author Row ── */}
      <View style={styles.authorRow}>
        <View style={styles.authorLeft}>
          {item.author_avatar_url ? (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{avatarChar}</Text>
            </View>
          ) : (
            <Ionicons name="person-circle" size={32} color={Colors.textTertiary} />
          )}
          <Text style={styles.authorNickname} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        <Text style={styles.time}>
          {formatRelativeTime(item.created_at)}
        </Text>
      </View>

      {/* ── Mood + Privacy Header ── */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {item.mood && <Text style={styles.mood}>{item.mood}</Text>}
        </View>
        <View style={styles.privacyBadge}>
          <Ionicons
            name={
              item.privacy_level >= 3 ? "globe-outline" : "lock-closed"
            }
            size={11}
            color={Colors.textTertiary}
          />
          <Text style={styles.privacyText}>
            {getPrivacyLabel(item.privacy_level)}
          </Text>
        </View>
      </View>

      {/* Title */}
      {item.title && (
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
      )}

      {/* Content */}
      {truncatedContent && (
        <Text style={styles.content} numberOfLines={2}>
          {truncatedContent}
        </Text>
      )}

      {/* AI Tags */}
      {item.ai_tags && item.ai_tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.ai_tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Stats + Like */}
      <View style={styles.cardFooter}>
        {/* Like button */}
        <TouchableOpacity
          style={styles.stat}
          onPress={onLikeToggle}
          disabled={likePending}
          activeOpacity={0.6}
        >
          <Ionicons
            name={item.is_liked ? "heart" : "heart-outline"}
            size={14}
            color={item.is_liked ? Colors.error : Colors.textTertiary}
          />
          <Text
            style={[
              styles.statText,
              item.is_liked && { color: Colors.error },
            ]}
          >
            {item.like_count}
          </Text>
        </TouchableOpacity>

        <View style={styles.stat}>
          <Ionicons
            name="chatbubble-outline"
            size={14}
            color={Colors.textTertiary}
          />
          <Text style={styles.statText}>{item.comment_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Empty State ────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.empty}>
      <Ionicons
        name="camera-outline"
        size={64}
        color={Colors.textTertiary}
      />
      <Text style={styles.emptyText}>还没有生刻记录</Text>
      <Text style={styles.emptySubtext}>点击下方 + 发布第一条</Text>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────
export default function HomeFeedScreen() {
  const router = useRouter();
  const [sort, setSort] = useState<"latest" | "hot">("latest");
  const queryClient = useQueryClient();
  const likeToggle = useLikeToggle();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useMomentFeed(sort);

  // Flatten paginated results
  const moments: MomentFeedItem[] =
    data?.pages.flatMap((page) => page.items) ?? [];

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSortChange = useCallback(
    (newSort: "latest" | "hot") => {
      if (newSort === sort) return;
      setSort(newSort);
    },
    [sort]
  );

  const handleLikeToggle = useCallback(
    (item: MomentFeedItem) => {
      // Optimistically update the feed data
      const previousData = queryClient.getQueryData(["momentFeed", sort]);

      queryClient.setQueryData(
        ["momentFeed", sort],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: page.items.map((m: MomentFeedItem) =>
                m.id === item.id
                  ? {
                      ...m,
                      is_liked: !m.is_liked,
                      like_count: m.is_liked
                        ? m.like_count - 1
                        : m.like_count + 1,
                    }
                  : m
              ),
            })),
          };
        }
      );

      likeToggle.mutate(
        { targetType: "moment", targetId: item.id },
        {
          onError: () => {
            // Rollback on error
            if (previousData) {
              queryClient.setQueryData(["momentFeed", sort], previousData);
            }
          },
        }
      );
    },
    [likeToggle, sort, queryClient]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ShengKe</Text>
        <Text style={styles.headerSubtitle}>你的生活记录</Text>
      </View>

      {/* ── Sort Toggle ── */}
      <SortToggle value={sort} onChange={handleSortChange} />

      {/* ── Loading ── */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isError ? (
        /* ── Error ── */
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>加载失败，请下拉刷新重试</Text>
        </View>
      ) : (
        /* ── Feed ── */
        <FlatList
          data={moments}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          contentContainerStyle={[
            styles.list,
            moments.length === 0 && styles.listEmpty,
          ]}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={EmptyState}
          renderItem={({ item }) => (
            <MomentCard
              item={item}
              onPress={() => router.push(`/(tabs)/home/${item.id}`)}
              onLikeToggle={() => handleLikeToggle(item)}
              likePending={likeToggle.isPending}
            />
          )}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.footerLoaderText}>加载更多…</Text>
              </View>
            ) : null
          }
        />
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.heading1,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: FontSize.small,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // ── Sort Toggle ──
  sortRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgSecondary,
  },
  sortBtnActive: {
    backgroundColor: Colors.primary,
  },
  sortBtnText: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  sortBtnTextActive: {
    color: Colors.textInverse,
    fontWeight: FontWeight.semibold,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: FontSize.body,
    color: Colors.error,
  },
  list: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  empty: {
    paddingVertical: Spacing.xxl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: FontSize.body,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSize.small,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  footerLoaderText: {
    fontSize: FontSize.small,
    color: Colors.textTertiary,
  },

  // ── Card ──
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // ── Author Row ──
  authorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  authorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight + "40",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  authorNickname: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    flexShrink: 1,
  },

  // ── Card Header (mood + privacy) ──
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  mood: {
    fontSize: 18,
  },
  time: {
    fontSize: FontSize.caption,
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
    fontSize: 10,
    color: Colors.textTertiary,
  },
  cardTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  content: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.primaryLight + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  tagText: {
    fontSize: FontSize.caption,
    color: Colors.primary,
  },
  cardFooter: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statText: {
    fontSize: FontSize.caption,
    color: Colors.textTertiary,
  },
});
