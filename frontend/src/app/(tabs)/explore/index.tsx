import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getMomentFeed } from "../../../services/moments";
import { formatRelativeTime } from "../../../utils/format";
import { Colors, Spacing, FontSize, Radius } from "../../../constants/theme";
import { PAGE_SIZE } from "../../../constants/config";
import type { MomentFeedItem, PaginatedData } from "../../../types/api";

// ── MomentCard (shared style with home, adapted for explore) ──
function MomentCard({
  item,
  onPress,
}: {
  item: MomentFeedItem;
  onPress: () => void;
}) {
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
        name="compass-outline"
        size={64}
        color={Colors.textPlaceholder}
      />
      <Text style={styles.emptyText}>暂无公开生刻</Text>
      <Text style={styles.emptySubtext}>还没有人发布公开记录</Text>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────
export default function ExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

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
    queryKey: ["exploreFeed"],
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

  const handleSearch = useCallback(() => {
    // TODO: Navigate to search results or trigger search API
    // For now, this is a UI-only search bar placeholder
    if (searchQuery.trim()) {
      // Could navigate to a dedicated search page
      console.log("Search:", searchQuery);
    }
  }, [searchQuery]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>探索</Text>
        <Text style={styles.headerSubtitle}>发现更多精彩记录</Text>
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={18}
            color={Colors.textTertiary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索用户或记录…"
            placeholderTextColor={Colors.textPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={Colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Section Title ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>发现更多</Text>
        <Text style={styles.sectionSubtitle}>公共时刻</Text>
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>加载失败，请下拉刷新重试</Text>
        </View>
      ) : (
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
          onEndReachedThreshold={0.3}
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
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.title,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    height: 40,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: FontSize.md,
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
    fontSize: FontSize.md,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textPlaceholder,
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
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },

  // ── Card ──
  card: {
    backgroundColor: Colors.white,
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
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  content: {
    fontSize: FontSize.md,
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
    fontSize: FontSize.xs,
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
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
});
