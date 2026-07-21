import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatRelativeTime } from '../../utils/format'
import { Colors, Spacing, FontSize, FontWeight, Radius, LineHeight } from '../../constants/theme'
import { Avatar } from '../common/Avatar'

export interface CommentInfo {
  id: string
  user_id: string
  author_nickname: string
  author_avatar_url: string | null
  content: string
  like_count: number
  created_at: string
  replies?: CommentInfo[]
}

export interface CommentItemProps {
  comment: CommentInfo
  onReply?: (commentId: string, nickname: string) => void
  onLikeToggle?: (commentId: string) => void
  onDelete?: (commentId: string) => void
  isOwn?: boolean
  depth?: number
}

export const CommentItem = React.memo(function CommentItem({
  comment,
  onReply,
  onLikeToggle,
  onDelete,
  isOwn = false,
  depth = 0,
}: CommentItemProps) {
  const indent = depth * 16

  return (
    <View style={[styles.container, { paddingLeft: indent }]}>
      <View style={styles.row}>
        <Avatar
          uri={comment.author_avatar_url}
          name={comment.author_nickname}
          size={32}
        />
        <View style={styles.body}>
          <View style={styles.header}>
            <Text style={styles.nickname} numberOfLines={1}>
              {comment.author_nickname}
            </Text>
            <Text style={styles.time}>
              {formatRelativeTime(comment.created_at)}
            </Text>
          </View>
          <Text style={styles.content}>{comment.content}</Text>

          <View style={styles.actions}>
            {onReply && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onReply(comment.id, comment.author_nickname)}
                activeOpacity={0.6}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={13} color={Colors.textTertiary} />
                <Text style={styles.actionText}>回复</Text>
              </TouchableOpacity>
            )}

            {onLikeToggle && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onLikeToggle(comment.id)}
                activeOpacity={0.6}
              >
                <Ionicons
                  name={comment.like_count > 0 ? 'heart' : 'heart-outline'}
                  size={13}
                  color={comment.like_count > 0 ? Colors.error : Colors.textTertiary}
                />
                <Text style={[styles.actionText, comment.like_count > 0 && { color: Colors.error }]}>
                  {comment.like_count || '赞'}
                </Text>
              </TouchableOpacity>
            )}

            {isOwn && onDelete && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onDelete(comment.id)}
                activeOpacity={0.6}
              >
                <Ionicons name="trash-outline" size={13} color={Colors.error} />
                <Text style={[styles.actionText, { color: Colors.error }]}>删除</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Recursive child replies */}
      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onLikeToggle={onLikeToggle}
              onDelete={onDelete}
              isOwn={isOwn}
              depth={depth + 1}
            />
          ))}
        </View>
      )}
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  body: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  nickname: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    maxWidth: 120,
  },
  time: {
    fontSize: FontSize.caption,
    color: Colors.textTertiary,
  },
  content: {
    fontSize: FontSize.small,
    color: Colors.textSecondary,
    lineHeight: FontSize.small * LineHeight.relaxed,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actionText: {
    fontSize: FontSize.caption,
    color: Colors.textTertiary,
  },
  repliesContainer: {
    marginTop: Spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
})
