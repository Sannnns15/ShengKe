import React from 'react'
import { View, FlatList, ActivityIndicator, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { CommentItem, type CommentInfo } from './CommentItem'
import { LoadingView } from '../common/LoadingView'
import { EmptyState } from '../common/EmptyState'
import { Colors, Spacing, FontSize, FontWeight } from '../../constants/theme'

export interface CommentListProps {
  comments: CommentInfo[]
  onReply: (commentId: string, nickname: string) => void
  onLikeToggle: (commentId: string) => void
  onDelete: (commentId: string) => void
  currentUserId: string
  isLoading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
}

export function CommentList({
  comments,
  onReply,
  onLikeToggle,
  onDelete,
  currentUserId,
  isLoading = false,
  onLoadMore,
  hasMore = false,
}: CommentListProps) {
  if (isLoading && comments.length === 0) {
    return <LoadingView text="加载评论..." />
  }

  if (!isLoading && comments.length === 0) {
    return (
      <EmptyState
        icon="chatbubbles-outline"
        title="暂无评论"
        message="快来写下第一条评论吧"
      />
    )
  }

  const renderComment = ({ item }: { item: CommentInfo }) => {
    const isOwn = item.user_id === currentUserId

    // Flatten children into the parent FlatList for proper scrolling
    const flatReplies: CommentInfo[] = []

    function flattenReplies(reply: CommentInfo) {
      if (reply.replies) {
        reply.replies.forEach((r) => {
          flatReplies.push(r)
          flattenReplies(r)
        })
      }
    }

    flattenReplies(item)

    return (
      <View>
        <CommentItem
          comment={item}
          onReply={onReply}
          onLikeToggle={onLikeToggle}
          onDelete={onDelete}
          isOwn={isOwn}
          depth={0}
        />
        {flatReplies.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            onReply={onReply}
            onLikeToggle={onLikeToggle}
            onDelete={onDelete}
            isOwn={reply.user_id === currentUserId}
            depth={1}
          />
        ))}
      </View>
    )
  }

  return (
    <View>
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={onLoadMore}
              activeOpacity={0.6}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <View style={styles.loadMoreRow}>
                  <Ionicons name="chevron-down" size={16} color={Colors.primary} />
                  <Text style={styles.loadMoreText}>加载更多评论</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: Spacing.sm,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  loadMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadMoreText: {
    fontSize: FontSize.small,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
})
