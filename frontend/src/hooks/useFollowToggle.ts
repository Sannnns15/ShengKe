import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/client";
import type { UserProfile } from "../types/api";

/**
 * useFollowToggle — 关注/取消关注 hook（乐观更新）
 *
 * @param userId - 目标用户的 ID
 * @param initiallyFollowing - 初始关注状态
 *
 * 使用方法：
 *   const { isFollowing, toggleFollow, isPending } = useFollowToggle(userId, profile?.is_following ?? false);
 *   <Button onPress={toggleFollow} disabled={isPending} />
 */
export function useFollowToggle(userId: string, initiallyFollowing = false) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (following: boolean) => {
      if (following) {
        await apiClient.post(`/users/${userId}/follow`);
      } else {
        await apiClient.delete(`/users/${userId}/follow`);
      }
    },
    onMutate: async (following) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["myProfile"] });
      await queryClient.cancelQueries({ queryKey: ["userProfile", userId] });
      await queryClient.cancelQueries({ queryKey: ["exploreUsers"] });

      // Snapshot previous values
      const prevMyProfile = queryClient.getQueryData<UserProfile>(["myProfile"]);
      const prevUserProfile = queryClient.getQueryData<UserProfile>(["userProfile", userId]);

      // Optimistically update following_count on myProfile (can't know exact, but adjust by ±1)
      if (prevMyProfile) {
        queryClient.setQueryData<UserProfile>(["myProfile"], {
          ...prevMyProfile,
          following_count: following
            ? prevMyProfile.following_count + 1
            : Math.max(0, prevMyProfile.following_count - 1),
        });
      }

      return { prevMyProfile, prevUserProfile };
    },
    onError: (_err, _following, context) => {
      // Rollback
      if (context?.prevMyProfile) {
        queryClient.setQueryData(["myProfile"], context.prevMyProfile);
      }
      if (context?.prevUserProfile) {
        queryClient.setQueryData(["userProfile", userId], context.prevUserProfile);
      }
    },
    onSettled: () => {
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
    },
  });

  return mutation;
}
