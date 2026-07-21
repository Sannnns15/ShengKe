import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getMyProfile, getUserProfile, updateMyProfile } from "../../../services/users";
import { uploadMedia, uploadMediaDirect } from "../../../services/media";
import { useAuthStore } from "../../../stores/authStore";
import { useUserMoments } from "../../../hooks/useMomentFeed";
import { useLikeToggle } from "../../../hooks/useLikeToggle";
import { useImagePicker } from "../../../hooks/useImagePicker";
import { useFollowToggle } from "../../../hooks/useFollowToggle";
import { MomentCard } from "../../../components/moment";
import { GalleryViewer } from "../../../components/media";
import { useGallery } from "../../../hooks/useGallery";
import { Colors, Spacing, FontSize, FontWeight, Radius, Shadows } from "../../../constants/theme";
import type { UserProfile, MomentFeedItem } from "../../../types/api";

function getInitial(name: string): string {
  return name?.charAt(0)?.toUpperCase() || "?";
}

// ── Empty Moments State ────────────────────────────────
function EmptyMoments({ isOwn }: { isOwn: boolean }) {
  return (
    <View style={styles.emptyMoments}>
      <Ionicons name="camera-outline" size={48} color={Colors.textTertiary} />
      <Text style={styles.emptyMomentsText}>
        {isOwn ? "还没有生刻记录" : "对方还没有生刻记录"}
      </Text>
    </View>
  );
}

// ── Profile Screen (works for both own & others) ────────
export default function ProfileScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const targetUserId = params?.id;
  const { user: authUser, isAuthenticated, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const imagePicker = useImagePicker();
  const likeToggle = useLikeToggle();
  const gallery = useGallery();

  // Determine if viewing own profile
  const isOwnProfile = !targetUserId || targetUserId === authUser?.id;

  // Fetch profile data
  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery<UserProfile>({
    queryKey: isOwnProfile ? ["myProfile"] : ["userProfile", targetUserId],
    queryFn: isOwnProfile
      ? getMyProfile
      : () => getUserProfile(targetUserId!),
    enabled: isOwnProfile ? isAuthenticated : !!targetUserId,
  });

  // Fetch user's moments
  const userId = profile?.id || targetUserId || authUser?.id || "";
  const {
    data: momentsData,
    fetchNextPage: fetchNextMoments,
    hasNextPage: hasMoreMoments,
    isFetchingNextPage: isFetchingMoreMoments,
    isLoading: momentsLoading,
    refetch: refetchMoments,
    isRefetching: isRefetchingMoments,
  } = useUserMoments(userId);

  const moments: MomentFeedItem[] =
    momentsData?.pages.flatMap((page) => page.items) ?? [];

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Follow toggle (only for other users)
  const { isFollowing, isPending: followPending, toggleFollow } = useFollowToggle(
    userId,
    profile?.is_following ?? false
  );

  const handleLogout = useCallback(() => {
    Alert.alert("退出登录", "确定要退出当前账户吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "退出",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }, [logout]);

  // ── Avatar Action ──────────────────────────────────────
  const handleAvatarPress = useCallback(() => {
    if (!isOwnProfile) return; // only own avatar is actionable
    Alert.alert("更换头像", "请选择操作", [
      {
        text: "拍照",
        onPress: async () => {
          const uri = await imagePicker.pickFromCamera();
          if (uri) await handleAvatarUpload(uri);
        },
      },
      {
        text: "从相册选择",
        onPress: async () => {
          const uri = await imagePicker.pickFromGallery();
          if (uri) await handleAvatarUpload(uri);
        },
      },
      {
        text: profile?.avatar_url ? "查看大图" : "取消",
        onPress: profile?.avatar_url ? () => viewFullAvatar(profile.avatar_url!) : undefined,
      },
      { text: "取消", style: "cancel" },
    ]);
  }, [isOwnProfile, profile?.avatar_url]);

  const handleAvatarUpload = useCallback(
    async (uri: string) => {
      setAvatarUploading(true);
      try {
        // Try OSS direct upload first, fall back to server-mediated upload
        let media;
        try {
          media = await uploadMediaDirect(uri);
        } catch {
          media = await uploadMedia(uri);
        }
        await updateMyProfile({ avatar_url: media.url });
        queryClient.invalidateQueries({ queryKey: ["myProfile"] });
        Alert.alert("成功", "头像已更新");
      } catch (err: any) {
        Alert.alert("上传失败", err?.message || "请稍后重试");
      } finally {
        setAvatarUploading(false);
      }
    },
    [queryClient]
  );

  const viewFullAvatar = useCallback((url: string) => {
    Alert.alert("头像", "", [
      { text: "关闭", style: "cancel" },
    ]);
  }, []);

  // ── Moment Like ────────────────────────────────────────
  const handleLikeToggle = useCallback(
    (item: MomentFeedItem) => {
      const previousData = queryClient.getQueryData(["userMoments", userId]);

      queryClient.setQueryData(
        ["userMoments", userId],
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
            if (previousData) {
              queryClient.setQueryData(["userMoments", userId], previousData);
            }
          },
        }
      );
    },
    [likeToggle, userId, queryClient]
  );

  // ── Infinite scroll ────────────────────────────────────
  const handleEndReached = useCallback(() => {
    if (hasMoreMoments && !isFetchingMoreMoments) {
      fetchNextMoments();
    }
  }, [hasMoreMoments, isFetchingMoreMoments, fetchNextMoments]);

  // ── Render ─────────────────────────────────────────────
  const displayName = profile?.nickname || authUser?.nickname || "未登录";
  const displayBio = profile?.bio || "生刻用户";
  const avatarChar = getInitial(displayName);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {!isAuthenticated && isOwnProfile ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>请先登录</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.loginButtonText}>去登录</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>加载失败</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.retryText}>点击重试</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={moments}
          keyExtractor={(item) => item.id}
          numColumns={1}
          refreshControl={
            <RefreshControl
              refreshing={isRefetchingMoments}
              onRefresh={() => {
                refetch();
                refetchMoments();
              }}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={5}
          ListHeaderComponent={
            <>
              {/* ── User Info Header ── */}
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={handleAvatarPress}
                  disabled={avatarUploading}
                  activeOpacity={isOwnProfile ? 0.7 : 1}
                >
                  {avatarUploading ? (
                    <View style={[styles.avatar, styles.avatarLoading]}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                    </View>
                  ) : profile?.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{avatarChar}</Text>
                    </View>
                  )}
                  {isOwnProfile && (
                    <View style={styles.avatarEditBadge}>
                      <Ionicons name="camera" size={12} color={Colors.textInverse} />
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.name}>{displayName}</Text>
                <Text style={styles.bio}>{displayBio}</Text>

                <View style={styles.stats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {profile?.moment_count ?? 0}
                    </Text>
                    <Text style={styles.statLabel}>生刻</Text>
                  </View>
                  <TouchableOpacity style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {profile?.following_count ?? 0}
                    </Text>
                    <Text style={styles.statLabel}>关注</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {profile?.follower_count ?? 0}
                    </Text>
                    <Text style={styles.statLabel}>粉丝</Text>
                  </TouchableOpacity>
                </View>

                {/* ── Follow / Unfollow Button (only for other users) ── */}
                {!isOwnProfile && (
                  <TouchableOpacity
                    style={[
                      styles.followButton,
                      isFollowing && styles.followButtonActive,
                      followPending && styles.buttonDisabled,
                    ]}
                    onPress={toggleFollow}
                    disabled={followPending}
                    activeOpacity={0.7}
                  >
                    {followPending ? (
                      <ActivityIndicator size="small" color={isFollowing ? Colors.primary : Colors.textInverse} />
                    ) : (
                      <Text style={[
                        styles.followButtonText,
                        isFollowing && styles.followButtonTextActive,
                      ]}>
                        {isFollowing ? "已关注" : "＋ 关注"}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {/* ── Edit Profile Button (own profile) ── */}
                {isOwnProfile && (
                  <TouchableOpacity
                    style={styles.editProfileButton}
                    onPress={() => router.push("/(tabs)/profile/settings")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="settings-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.editProfileText}>编辑资料</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* ── Moments Section Header ── */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>生刻记录</Text>
              </View>

              {/* ── Moments Loading ── */}
              {momentsLoading && (
                <View style={styles.momentsLoader}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            !momentsLoading ? <EmptyMoments isOwn={isOwnProfile} /> : null
          }
          renderItem={({ item }) => (
            <View style={styles.momentItem}>
              <MomentCard
                item={item}
                onPress={() => router.push(`/(tabs)/home/${item.id}`)}
                onLikeToggle={() => handleLikeToggle(item)}
                onMediaPress={(images, index) => gallery.open({ images, initialIndex: index })}
                likePending={likeToggle.isPending}
              />
            </View>
          )}
          ListFooterComponent={
            <>
              {isFetchingMoreMoments && (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.footerLoaderText}>加载更多…</Text>
                </View>
              )}
              {/* ── Menu (own profile only) ── */}
              {isOwnProfile && (
                <View style={styles.menu}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => router.push("/ai/mood-report")}
                  >
                    <Text style={styles.menuText}>📊 情绪报告</Text>
                  </TouchableOpacity>
                  <View style={styles.menuDivider} />
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => router.push("/(tabs)/profile/settings")}
                  >
                    <Text style={styles.menuText}>⚙️ 设置</Text>
                  </TouchableOpacity>
                  <View style={styles.menuDivider} />
                  <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                    <Text style={[styles.menuText, { color: Colors.error }]}>
                      🚪 退出登录
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {/* Bottom spacer */}
              <View style={styles.bottomSpacer} />
            </>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* ── Media Gallery Viewer ── */}
      {gallery.options && (
        <GalleryViewer
          visible={gallery.visible}
          images={gallery.options.images}
          initialIndex={gallery.options.initialIndex ?? 0}
          onClose={gallery.close}
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.bg,
  },
  header: {
    alignItems: "center",
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.page,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.bgTertiary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  avatarLoading: {
    opacity: 0.6,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: Spacing.md,
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 8,
    right: -4,
    backgroundColor: Colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.bgCard,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  name: {
    fontSize: FontSize.heading1,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  bio: {
    fontSize: FontSize.body,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  stats: {
    flexDirection: "row",
    marginTop: Spacing.lg,
    gap: Spacing.xxl,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: FontSize.heading3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSize.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  followButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    minWidth: 120,
    alignItems: "center",
  },
  followButtonActive: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  followButtonText: {
    fontSize: FontSize.body,
    color: Colors.textInverse,
    fontWeight: FontWeight.semibold,
  },
  followButtonTextActive: {
    color: Colors.textSecondary,
  },
  editProfileButton: {
    marginTop: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  editProfileText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // ── Section ──
  sectionHeader: {
    paddingHorizontal: Spacing.page,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bg,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },

  // ── Moments List ──
  listContent: {
    paddingBottom: Spacing.xxl,
  },
  momentItem: {
    paddingHorizontal: Spacing.page,
    paddingTop: Spacing.md,
  },
  momentsLoader: {
    paddingVertical: Spacing.xxl,
    alignItems: "center",
  },
  emptyMoments: {
    paddingVertical: Spacing.xxl,
    alignItems: "center",
  },
  emptyMomentsText: {
    fontSize: FontSize.body,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
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

  // ── Menu (overlaid at bottom for own profile) ──
  menu: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.page,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  menuItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  menuDivider: {
    height: 0.5,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing.lg,
  },
  menuText: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: FontSize.bodyLarge,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.full,
  },
  loginButtonText: {
    fontSize: FontSize.body,
    color: Colors.textInverse,
    fontWeight: FontWeight.semibold,
  },
  errorText: {
    fontSize: FontSize.body,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  retryText: {
    fontSize: FontSize.body,
    color: Colors.textAccent,
    fontWeight: FontWeight.semibold,
  },
  bottomSpacer: {
    height: Spacing.xxl,
  },
});
