import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleLike } from "../services/social";

/**
 * useLikeToggle — 点赞切换 hook（乐观更新）
 *
 * 手动维护 state：调用方传入当前状态，乐观更新后通过 onMutate 回滚，
 * 同时刷新 feed 缓存确保后续加载一致。
 */
export function useLikeToggle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      targetType,
      targetId,
    }: {
      targetType: "moment" | "comment";
      targetId: string;
    }) => toggleLike(targetType, targetId),

    // 乐观更新：由调用方在 onMutate 中处理 UI 状态
    onSuccess: (_result, variables) => {
      // 使 feed 缓存失效，下次拉取刷新 is_liked 和 like_count
      queryClient.invalidateQueries({ queryKey: ["momentFeed"] });
      queryClient.invalidateQueries({ queryKey: ["userMoments"] });
      queryClient.invalidateQueries({
        queryKey: ["moment", variables.targetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["likeStatus", "moment", variables.targetId],
      });
    },

    onError: (_err, variables) => {
      // 回滚：让 feed 重新加载来恢复正确状态
      queryClient.invalidateQueries({ queryKey: ["momentFeed"] });
      queryClient.invalidateQueries({ queryKey: ["userMoments"] });
      queryClient.invalidateQueries({
        queryKey: ["moment", variables.targetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["likeStatus", "moment", variables.targetId],
      });
    },
  });
}
