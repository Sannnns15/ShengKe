import React, { useState, useCallback, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
  type NotificationType,
} from "../../../services/notifications"
import { formatRelativeTime } from "../../../utils/format"
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  Radius,
} from "../../../constants/theme"
import { useWebSocket } from "../../../hooks/useWebSocket"
import { Avatar } from "../../../components/common/Avatar"

// ── Icon Map ─────────────────────────────────────────────
function getNotificationIcon(type: NotificationType): {
  name: keyof typeof Ionicons.glyphMap
  color: string
} {
  switch (type) {
    case "like":
      return { name: "heart", color: Colors.error }
    case "comment":
      return { name: "chatbubble", color: Colors.info }
    case "follow":
      return { name: "person-add", color: Colors.success }
    case "system":
      return { name: "notifications", color: Colors.warning }
  }
}

// ── Single Notification Item ─────────────────────────────
function NotificationRow({
  item,
  onPress,
}: {
  item: NotificationItem
  onPress: (id: string) => void
}) {
  const icon = getNotificationIcon(item.type)

  return (
    <TouchableOpacity
      style={[styles.notifItem, !item.is_read && styles.notifItemUnread]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      {item.actor_avatar ? (
        <Avatar
          uri={item.actor_avatar}
          name={item.actor_name}
          size={40}
        />
      ) : (
        <View style={[styles.iconCircle, { backgroundColor: icon.color + "18" }]}>
          <Ionicons name={icon.name} size={20} color={icon.color} />
        </View>
      )}
      <View style={styles.notifBody}>
        <Text style={styles.notifTitle}>{item.title}</Text>
        <Text style={styles.notifBodyText} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.notifTime}>
          {formatRelativeTime(item.created_at)}
        </Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  )
}

// ── Main Screen ──────────────────────────────────────────
export default function NotificationsScreen() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [allItems, setAllItems] = useState<NotificationItem[]>([])
  const allItemsRef = useRef(allItems)
  allItemsRef.current = allItems

  // ── WebSocket: receive real-time notifications ──
  useWebSocket({
    onNotification: useCallback((data: NotificationItem) => {
      // Insert new notification at the top
      setAllItems((prev) => [data, ...prev])
      // Bump unread count
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] })
    }, [queryClient]),
    enabled: true,
  })

  // ── Queries (polling as fallback) ──
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => getNotifications(page),
  })

  const { data: unreadCount } = useQuery({
    queryKey: ["unreadCount"],
    queryFn: getUnreadCount,
    refetchInterval: 30_000, // poll every 30s as fallback
  })

  // Update local list when data arrives from query
  React.useEffect(() => {
    if (data) {
      if (page === 1) {
        setAllItems(data.items)
      } else {
        setAllItems((prev) => [...prev, ...data.items])
      }
    }
  }, [data, page])

  // ── Mark read mutation ──
  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] })
    },
  })

  // ── Mark all read mutation ──
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] })
    },
  })

  // ── Handlers ──
  const handlePressNotification = useCallback(
    (id: string) => {
      // Find the notification to get target_id
      const item = allItemsRef.current.find((n) => n.id === id)
      if (!item) return

      // Optimistically mark as read
      markReadMutation.mutate(id)

      // Navigate to target moment if available
      if (item.target_id) {
        router.push(`/(tabs)/home/${item.target_id}`)
      } else if (item.type === "follow") {
        // Navigate to profile
        router.push(`/(tabs)/profile/${item.id}`)
      }
    },
    [markReadMutation]
  )

  const handleRefresh = useCallback(() => {
    setPage(1)
    refetch()
  }, [refetch])

  const handleLoadMore = useCallback(() => {
    if (data?.has_more && !isLoading) {
      setPage((p) => p + 1)
    }
  }, [data?.has_more, isLoading])

  // ── Render ──
  const hasUnread = (allItems ?? []).some((n) => !n.is_read)
  const showEmptyState = !isLoading && allItems.length === 0

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>通知</Text>
        {hasUnread && (
          <TouchableOpacity
            onPress={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <Text style={styles.markAllRead}>
              {markAllReadMutation.isPending ? "..." : "全部已读"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showEmptyState ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="notifications-off-outline"
            size={48}
            color={Colors.textTertiary}
          />
          <Text style={styles.emptyText}>暂无通知</Text>
        </View>
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow
              item={item}
              onPress={handlePressNotification}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isLoading ? (
              <ActivityIndicator
                style={styles.footerLoader}
                size="small"
                color={Colors.primary}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  )
}

// ── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.page,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  title: {
    fontSize: FontSize.heading2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  markAllRead: {
    fontSize: FontSize.small,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  list: {
    paddingVertical: Spacing.sm,
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.page,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  notifItemUnread: {
    backgroundColor: Colors.primaryLight + "10",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  notifBody: {
    flex: 1,
  },
  notifTitle: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  notifBodyText: {
    fontSize: FontSize.small,
    color: Colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: FontSize.caption,
    color: Colors.textTertiary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.body,
    color: Colors.textTertiary,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
  },
})
