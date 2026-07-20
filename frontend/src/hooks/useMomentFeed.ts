import { useInfiniteQuery } from "@tanstack/react-query";
import { getMomentFeed, getUserMoments } from "../services/moments";
import { PAGE_SIZE } from "../constants/config";
import type { MomentFeedItem, PaginatedData } from "../types/api";

export function useMomentFeed(sort: "latest" | "hot" = "latest") {
  return useInfiniteQuery<PaginatedData<MomentFeedItem>>({
    queryKey: ["momentFeed", sort],
    queryFn: ({ pageParam }) =>
      getMomentFeed(pageParam as number, PAGE_SIZE, sort),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, page_size, total } = lastPage.meta;
      if (page * page_size < total) return page + 1;
      return undefined;
    },
  });
}

export function useUserMoments(userId: string) {
  return useInfiniteQuery<PaginatedData<MomentFeedItem>>({
    queryKey: ["userMoments", userId],
    queryFn: ({ pageParam }) =>
      getUserMoments(userId, pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, page_size, total } = lastPage.meta;
      if (page * page_size < total) return page + 1;
      return undefined;
    },
    enabled: !!userId,
  });
}
