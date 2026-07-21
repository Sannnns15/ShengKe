// ══ Search Service ══════════════════════════════════════
import { apiClient } from './client';
import { PAGE_SIZE } from '../constants/config';
import type { MomentFeedItem, PaginatedData } from '../types/api';

export interface SearchUserItem {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

export async function searchMoments(
  query: string,
  page: number = 1,
  pageSize: number = PAGE_SIZE,
  sort: 'relevance' | 'latest' | 'hot' = 'relevance',
  tag?: string
): Promise<PaginatedData<MomentFeedItem>> {
  const res = await apiClient.get('/search/moments', {
    params: { q: query, page, page_size: pageSize, sort, tag },
  });
  return res as unknown as PaginatedData<MomentFeedItem>;
}

export async function searchUsers(
  query: string,
  page: number = 1,
  pageSize: number = PAGE_SIZE
): Promise<PaginatedData<SearchUserItem>> {
  const res = await apiClient.get('/search/users', {
    params: { q: query, page, page_size: pageSize },
  });
  return res as unknown as PaginatedData<SearchUserItem>;
}
