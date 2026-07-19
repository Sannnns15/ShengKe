import React, { useCallback } from "react";
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
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getMomentFeed } from "../../../services/moments";
import { formatRelativeTime } from "../../../utils/format";
import { getMoodLabel } from "../../../constants/emotions";
import { Colors, Spacing, FontSize, FontWeight, Radius } from "../../../constants/theme";
import { PAGE_SIZE } from "../../../constants/config";
import type { MomentFeedItem, PaginatedData } from "../../../types/api";

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

// ── MomentCard ─────────────────────────────────────────
function MomentCard({
  item,
  onPress,
}: {
  item: MomentFeedItem;
  onPress: () => void;
}) {
  // Truncate content to ~2 lines (~80 chars)
  const truncatedContent =
    item.content && item.content.length > 80
      ? item.content.slice(0, 80) + "…"
      : item.content;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {item.mood && <Text style={styles.mood}>{item.mood}</Text>}
          <Text style={styles.time}>
            {formatRelativeTime(item.created_at)}
          </Text>
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

      {/* Stats */}
      <View style={styles.cardFooter}>
        <View style={styles.stat}>
          <Ionicons
            name="heart-outline"
            size={14}
            color={Colors.textTertiary}
          />
          <Text style={styles.statText}>{item.like_count}</Text>
        </View>
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

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useInfiniteQuery<PaginatedData<MomentFeedItem>>({
    queryKey: ["momentFeed"],
    queryFn: ({ pageParam }) =>
      getMomentFeed(pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, page_size, total } = lastPage.meta;
      if (page * page_size < total) {
        return page + 1;
      }
      return undefined;
    },
  });

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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ShengKe</Text>
        <Text style={styles.headerSubtitle}>你的生活记录</Text>
      </View>

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
              onPress={() =>
                router.push(`/(tabs)/home/${item.id}`)
              }
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
