import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMomentFeed } from "../../../services/moments";
import { searchMoments } from "../../../services/search";
import { formatRelativeTime } from "../../../utils/format";
import { Colors, Spacing, FontSize, FontWeight, Radius } from "../../../constants/theme";
import { PAGE_SIZE } from "../../../constants/config";
import { MomentCardSkeleton } from "../../../components/common/MomentCardSkeleton";
import type { MomentFeedItem, PaginatedData } from "../../../types/api";

// ── Constants ──────────────────────────────────────────
const SEARCH_HISTORY_KEY = "@shengke_search_history";
const MAX_HISTORY = 10;
const SEARCH_DEBOUNCE_MS = 500;

// ── Types ──────────────────────────────────────────────
type ViewMode = "default" | "search";

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
function EmptyState({ message, submessage }: { message: string; submessage?: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons
        name="compass-outline"
        size={64}
        color={Colors.textTertiary}
      />
      <Text style={styles.emptyText}>{message}</Text>
      {submessage && <Text style={styles.emptySubtext}>{submessage}</Text>}
    </View>
  );
}

// ── Search Empty State ─────────────────────────────────
function SearchEmptyState({ query }: { query: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons
        name="search-outline"
        size={64}
        color={Colors.textTertiary}
      />
      <Text style={styles.emptyText}>未找到 "{query}" 相关记录</Text>
      <Text style={styles.emptySubtext}>试试其他关键词</Text>
    </View>
  );
}

// ── Hot Tags Section ──────────────────────────────────
function HotTagsSection({
  tags,
  onTagPress,
}: {
  tags: string[];
  onTagPress: (tag: string) => void;
}) {
  if (tags.length === 0) return null;

  return (
    <View style={styles.hotTagsContainer}>
      <Text style={styles.hotTagsTitle}>热门标签</Text>
      <View style={styles.hotTagsRow}>
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={styles.hotTag}
            activeOpacity={0.7}
            onPress={() => onTagPress(tag)}
          >
            <Text style={styles.hotTagText}>{tag}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Search History ────────────────────────────────────
function SearchHistory({
  history,
  onSelect,
  onClearSingle,
  onClearAll,
}: {
  history: string[];
  onSelect: (query: string) => void;
  onClearSingle: (index: number) => void;
  onClearAll: () => void;
}) {
  if (history.length === 0) return null;

  return (
    <View style={styles.historyContainer}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>搜索历史</Text>
        <TouchableOpacity onPress={onClearAll} activeOpacity={0.6}>
          <Text style={styles.historyClearAll}>清除全部</Text>
        </TouchableOpacity>
      </View>
      {history.map((item, index) => (
        <TouchableOpacity
          key={`${item}-${index}`}
          style={styles.historyItem}
          activeOpacity={0.7}
          onPress={() => onSelect(item)}
        >
          <Ionicons name="time-outline" size={16} color={Colors.textTertiary} />
          <Text style={styles.historyText} numberOfLines={1}>
            {item}
          </Text>
          <TouchableOpacity
            onPress={() => onClearSingle(index)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────
export default function ExploreScreen() {
  const router = useRouter();
  const searchInputRef = useRef<TextInput>(null);

  // ── Search state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("default");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // ── Load search history on mount ──
  useEffect(() => {
    AsyncStorage.getItem(SEARCH_HISTORY_KEY).then((val) => {
      if (val) {
        try {
          setSearchHistory(JSON.parse(val));
        } catch {
          // ignore
        }
      }
    });
  }, []);

  // ── Debounce search query ──
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedQuery("");
      setViewMode("default");
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Save search history ──
  const saveSearchHistory = useCallback(async (query: string) => {
    try {
      const raw = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      let history: string[] = raw ? JSON.parse(raw) : [];
      history = history.filter((h) => h !== query);
      history.unshift(query);
      if (history.length > MAX_HISTORY) {
        history = history.slice(0, MAX_HISTORY);
      }
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
      setSearchHistory(history);
    } catch {
      // ignore
    }
  }, []);

  // ── Default explore feed query ──
  const {
    data: exploreData,
    fetchNextPage: fetchExploreNext,
    hasNextPage: hasExploreNext,
    isFetchingNextPage: isFetchingExploreNext,
    isLoading: isExploreLoading,
    isError: isExploreError,
    refetch: refetchExplore,
    isRefetching: isExploreRefetching,
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

  // ── Search query ──
  const {
    data: searchData,
    fetchNextPage: fetchSearchNext,
    hasNextPage: hasSearchNext,
    isFetchingNextPage: isFetchingSearchNext,
    isLoading: isSearchLoading,
    isError: isSearchError,
    refetch: refetchSearch,
  } = useInfiniteQuery<PaginatedData<MomentFeedItem>>({
    queryKey: ["searchMoments", debouncedQuery],
    queryFn: ({ pageParam }) =>
      searchMoments(debouncedQuery, pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, page_size, total } = lastPage.meta;
      if (page * page_size < total) {
        return page + 1;
      }
      return undefined;
    },
    enabled: debouncedQuery.length > 0,
  });

  // ── Extract hot tags from explore feed ──
  const hotTags = useMemo(() => {
    const tags = exploreData?.pages.flatMap((page) =>
      page.items.flatMap((item) => item.ai_tags || [])
    ) ?? [];
    const freq: Record<string, number> = {};
    for (const tag of tags) {
      freq[tag] = (freq[tag] || 0) + 1;
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }, [exploreData]);

  // ── Determine which data to show ──
  const isSearching = viewMode === "search" && debouncedQuery.length > 0;
  const moments: MomentFeedItem[] = isSearching
    ? (searchData?.pages.flatMap((page) => page.items) ?? [])
    : (exploreData?.pages.flatMap((page) => page.items) ?? []);

  const isLoading = isSearching ? isSearchLoading : isExploreLoading;
  const isError = isSearching ? isSearchError : isExploreError;
  const hasNextPage = isSearching ? hasSearchNext : hasExploreNext;
  const isFetchingNextPage = isSearching ? isFetchingSearchNext : isFetchingExploreNext;

  // ── Handlers ──
  const handleRefresh = useCallback(() => {
    if (isSearching) {
      refetchSearch();
    } else {
      refetchExplore();
    }
  }, [isSearching, refetchExplore, refetchSearch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      if (isSearching) {
        fetchSearchNext();
      } else {
        fetchExploreNext();
      }
    }
  }, [hasNextPage, isFetchingNextPage, isSearching, fetchSearchNext, fetchExploreNext]);

  const handleSearchSubmit = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    setDebouncedQuery(q);
    setViewMode("search");
    saveSearchHistory(q);
    searchInputRef.current?.blur();
  }, [searchQuery, saveSearchHistory]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
    setViewMode("default");
    searchInputRef.current?.blur();
  }, []);

  const handleTagPress = useCallback((tag: string) => {
    setSearchQuery(tag);
    setDebouncedQuery(tag);
    setViewMode("search");
    setIsSearchFocused(false);
    saveSearchHistory(tag);
    searchInputRef.current?.blur();
  }, [saveSearchHistory]);

  const handleHistorySelect = useCallback((query: string) => {
    setSearchQuery(query);
    setDebouncedQuery(query);
    setViewMode("search");
    setIsSearchFocused(false);
    searchInputRef.current?.blur();
  }, []);

  const handleClearSingleHistory = useCallback(async (index: number) => {
    const newHistory = searchHistory.filter((_, i) => i !== index);
    setSearchHistory(newHistory);
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
  }, [searchHistory]);

  const handleClearAllHistory = useCallback(async () => {
    setSearchHistory([]);
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify([]));
  }, []);

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
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="搜索用户或记录…"
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons
                name="close-circle"
                size={18}
                color={Colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Search History (when focused and no query) ── */}
      {isSearchFocused && !searchQuery.trim() && (
        <SearchHistory
          history={searchHistory}
          onSelect={handleHistorySelect}
          onClearSingle={handleClearSingleHistory}
          onClearAll={handleClearAllHistory}
        />
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <View style={styles.center}>
          <MomentCardSkeleton />
          <MomentCardSkeleton />
          <MomentCardSkeleton />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>加载失败</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
            <Text style={styles.retryText}>点击重试</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={moments}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isSearching ? false : isExploreRefetching}
              onRefresh={handleRefresh}
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
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={5}
          ListHeaderComponent={
            <>
              {/* ── Hot Tags (default view only) ── */}
              {!isSearching && !isSearchFocused && (
                <HotTagsSection tags={hotTags} onTagPress={handleTagPress} />
              )}

              {/* ── Section Title ── */}
              {!isSearching && moments.length > 0 && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>发现更多</Text>
                  <Text style={styles.sectionSubtitle}>公共时刻</Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            isSearching ? (
              <SearchEmptyState query={debouncedQuery} />
            ) : (
              <EmptyState
                message="暂无公开生刻"
                submessage="还没有人发布公开记录"
              />
            )
          }
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
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // ── Header ──
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

  // ── Search ──
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    height: 40,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.small,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },

  // ── Search History ──
  historyContainer: {
    backgroundColor: Colors.bgCard,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  historyTitle: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  historyClearAll: {
    fontSize: FontSize.small,
    color: Colors.textAccent,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  historyText: {
    flex: 1,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },

  // ── Hot Tags ──
  hotTagsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bg,
  },
  hotTagsTitle: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  hotTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  hotTag: {
    backgroundColor: Colors.primaryLight + "30",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  hotTagText: {
    fontSize: FontSize.small,
    color: Colors.primaryDark,
  },

  // ── Section Header ──
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.bg,
  },
  sectionTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: FontSize.small,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // ── Content ──
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: FontSize.body,
    color: Colors.error,
  },
  retryBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight + "30",
  },
  retryText: {
    fontSize: FontSize.body,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
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
