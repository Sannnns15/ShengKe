import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/client";
import type { UserProfile } from "../types/api";

/**
 * useFollowToggle — 关注/取消关注 hook（乐观更新）
 *
 * @param userId - 目标用户的 ID
 * @param defaultFollowing - 初始关注状态
 *
 * 返回：
 *   isFollowing   - 当前关注状态
 *   isPending     - 请求是否进行中
 *   toggleFollow  - 切换关注状态的函数
 */
export function useFollowToggle(userId: string, defaultFollowing = false) {
  const [isFollowing, setIsFollowing] = useState(defaultFollowing);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (follow: boolean) => {
      if (follow) {
        await apiClient.post(`/users/${userId}/follow`);
      } else {
        await apiClient.delete(`/users/${userId}/follow`);
      }
    },
    onMutate: async (follow) => {
      // Optimistically update UI state
      setIsFollowing(follow);

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["myProfile"] });
      await queryClient.cancelQueries({ queryKey: ["userProfile", userId] });

      // Snapshot previous values
      const prevMyProfile = queryClient.getQueryData<UserProfile>(["myProfile"]);

      // Optimistically update following_count on myProfile
      if (prevMyProfile) {
        queryClient.setQueryData<UserProfile>(["myProfile"], {
          ...prevMyProfile,
          following_count: follow
            ? prevMyProfile.following_count + 1
            : Math.max(0, prevMyProfile.following_count - 1),
        });
      }

      return { prevMyProfile };
    },
    onError: (_err, follow, context) => {
      // Rollback UI state
      setIsFollowing(!follow);

      // Rollback cache
      if (context?.prevMyProfile) {
        queryClient.setQueryData(["myProfile"], context.prevMyProfile);
      }
    },
    onSettled: () => {
      // Refresh profile data
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
      queryClient.invalidateQueries({ queryKey: ["exploreUsers"] });
    },
  });

  const toggleFollow = useCallback(() => {
    const nextState = !isFollowing;
    mutation.mutate(nextState);
  }, [isFollowing, mutation]);

  return {
    isFollowing,
    isPending: mutation.isPending,
    toggleFollow,
  };
}
